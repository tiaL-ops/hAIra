import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import Chat from '../models/ChatModels.js';
import { COLLECTIONS } from '../schema/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildCredential() {
  // Prefer explicit env vars when available
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    // Handle escaped newlines in env value
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    return admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey,
    });
  }

  // Fallback: service account JSON file (path from env or default location)
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(__dirname, '../config/serviceAccountKey.json');

  if (fs.existsSync(serviceAccountPath)) {
    const json = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    return admin.credential.cert(json);
  }

  // Last resort: application default credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS)
  return admin.credential.applicationDefault();
}

// Initialize Firebase Admin SDK once
if (!admin.apps.length) {
  try {
    admin.initializeApp({ credential: buildCredential() });
    console.log('Firebase initialized');
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
  }
}

const db = admin.firestore();

// Generic helpers
export async function addDocument(collectionName, data) {
  const docRef = await db.collection(collectionName).add(data);
  return { id: docRef.id, ...data };
}

export async function getDocuments(collectionName, queryObj = {}, orderByField = 'timestamp') {
  let ref = db.collection(collectionName);
  for (const [field, value] of Object.entries(queryObj)) {
    ref = ref.where(field, '==', value);
  }
  if (orderByField) ref = ref.orderBy(orderByField, 'asc');
  const snapshot = await ref.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Chat-specific wrappers (consistent naming)
export async function addChat(projectId, content) {
  const chat = new Chat(projectId, content);
  return addDocument(COLLECTIONS.CHAT, chat.toFirestore());
}

export async function getChats(projectId) {
  return getDocuments(COLLECTIONS.CHAT, { projectId });
}