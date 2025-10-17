import admin from 'firebase-admin';
import Message from '../models/Message.js';
import { COLLECTIONS } from '../schema/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Option 1: Using service account JSON file
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
    path.join(__dirname, '../config/serviceAccountKey.json');
  
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath)
    });
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    console.log('Please add your Firebase service account key to:', serviceAccountPath);
  }
}

const db = admin.firestore();

// Add a message to Firestore
export async function addMessage(projectId, content) {
  const message = new Message(projectId, content);
  const docRef = await db.collection(COLLECTIONS.MESSAGES).add(message.toFirestore());
  console.log(`✅ Message saved to Firebase with ID: ${docRef.id}`);
  return { 
    id: docRef.id, 
    ...message,
    status: 'Message sent to Firebase successfully'
  };
}// Get all messages for a project
export async function getMessages(projectId) {
  const snapshot = await db.collection(COLLECTIONS.MESSAGES)
    .where('projectId', '==', projectId)
    .orderBy('timestamp', 'asc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}