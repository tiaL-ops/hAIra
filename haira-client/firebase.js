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
    const response = await fetch('http://localhost:3002/api/config');
    const config = await response.json();
    serverFirebaseAvailable = config.firebaseAvailable;
    console.log(`📡 Server storage mode: ${config.storageMode}`);
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
        apiKey: "AIzaSyAV-rdY66x8CAElzUWfR4tZ-HgcP9xIwDM",
        authDomain: "haira-dev.firebaseapp.com",
        projectId: "haira-dev",
        storageBucket: "haira-dev.firebasestorage.app",
        messagingSenderId: "325852042789",
        appId: "1:325852042789:web:a9f0654c719b22a4da51cc",
        measurementId: "G-FE30L1DSNX"
      };

      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      
      console.log('🔥 Firebase client initialized successfully');
    } catch (error) {
      console.warn('⚠️ Firebase client initialization failed, falling back to localStorage:', error);
      auth = getAuthService();
      db = getFirestoreService();
      app = null;
    }
  } else {
    // Server doesn't have Firebase, use localStorage
    console.log('💾 Server using localStorage - client will use localStorage mode');
    auth = getAuthService();
    db = getFirestoreService();
    app = null;
  }
  
  isInitialized = true;
}

// Initialize on module load
await initializeFirebaseClient();

export { app, auth, db, serverFirebaseAvailable };