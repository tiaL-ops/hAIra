// Client-side Firebase SDK for authentication and Firestore with localStorage fallback
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAuthService, getFirestoreService } from './src/services/localStorageService';

let app, auth, db;
let isInitialized = false;
let serverFirebaseAvailable = false;

// Fetch Firebase availability from server
async function checkServerFirebaseAvailability() {
  try {
    const backendHost = import.meta.env.VITE_BACKEND_HOST || 'http://localhost:3002';
    const response = await fetch(`${backendHost}/api/config`);
    const config = await response.json();
    serverFirebaseAvailable = config.firebaseAvailable;
    return serverFirebaseAvailable;
  } catch (error) {
    console.warn('⚠️ Could not reach server, assuming localStorage mode:', error);
    serverFirebaseAvailable = false;
    return false;
  }
}

// Initialize based on server's Firebase availability
async function initializeFirebaseClient() {
  if (isInitialized) return;
  
  const serverHasFirebase = await checkServerFirebaseAvailability();
  
  if (serverHasFirebase) {
    // Server has Firebase, initialize client Firebase
    try {
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
      };

      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
    } catch (error) {
      auth = getAuthService();
      db = getFirestoreService();
      app = null;
    }
  } else {
    // Server doesn't have Firebase, use localStorage
    auth = getAuthService();
    db = getFirestoreService();
    app = null;
  }
  
  isInitialized = true;
}

// Initialize on module load
await initializeFirebaseClient();

export { app, auth, db, serverFirebaseAvailable };