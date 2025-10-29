// Middleware to verify Firebase Auth tokens or mock tokens (localStorage fallback)
import admin from 'firebase-admin';
import { firebaseAvailable } from '../services/firebaseService.js';

export async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // If Firebase is not available, accept mock tokens
    if (!firebaseAvailable) {
      // Mock token format: "mock-token-{uid}-{timestamp}"
      if (token.startsWith('mock-token-')) {
        const parts = token.split('-');
        const uid = parts.slice(2, -1).join('-'); // Everything between "mock-token-" and timestamp
        
        // Add mock user info to request object
        req.user = {
          uid: uid,
          email: uid.includes('@') ? uid : `${uid}@local.dev`,
          name: uid === 'test-user' ? 'Test User' : uid
        };
        
        return next();
      } else {
        return res.status(401).json({ error: 'Firebase unavailable and no valid mock token provided' });
      }
    }
    
    // Firebase is available - verify the Firebase Auth token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Add user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email
    };
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}