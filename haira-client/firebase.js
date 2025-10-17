import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: "AIzaSyAV-rdY66x8CAElzUWfR4tZ-HgcP9xIwDM",
  authDomain: "haira-dev.firebaseapp.com",
  projectId: "haira-dev",
  storageBucket: "haira-dev.firebasestorage.app",
  messagingSenderId: "325852042789",
  appId: "1:325852042789:web:a9f0654c719b22a4da51cc",
  measurementId: "G-FE30L1DSNX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };