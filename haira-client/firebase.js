// Client-side Firebase SDK for authentication and Firestore
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { app, auth, db };