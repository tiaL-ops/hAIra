// Client-side Firebase SDK for authentication and Firestore with localStorage fallback
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAuthService, getFirestoreService } from './src/services/localStorageService';

let app, auth, db;

// Check if we should force localStorage mode (for when backend has no Firebase service account)
// Only check environment variable, not localStorage flag
const forceLocalStorage = import.meta?.env?.VITE_USE_LOCAL_STORAGE === 'true';

if (forceLocalStorage) {
  console.log('💾 Forced localStorage mode - Firebase disabled');
  auth = getAuthService();
  db = getFirestoreService();
  app = null;
} else {
  // Try to initialize Firebase first
  try {
    const firebaseConfig = {
      apiKey: "AIzaSyAV-rdY66x8CAElzUWfR4tZ-HgcP9xIwDM",
      authDomain: "haira-dev.firebaseapp.com",
      projectId: "haira-dev",
      storageBucket: "haira-dev.firebasestorage.app",
      messagingSenderId: "325852042789",
      appId: "1:325852042789:web:a9f0654c719b22a4da51cc",
      measurementId: "G-FE30L1DSNX"
    };

    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    console.log('🔥 Firebase initialized successfully');
  } catch (error) {
    console.warn('Firebase initialization failed, falling back to localStorage:', error);
    // Fall back to localStorage services
    auth = getAuthService();
    db = getFirestoreService();
    app = null;
  }
}

export { app, auth, db };