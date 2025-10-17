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

    // Create required indexes
    const db = admin.firestore();
    
    // Create composite index for chat collection
    async function createRequiredIndexes() {
      try {
        // Check if collection exists first
        const chatCollection = db.collection(COLLECTIONS.CHAT);
        const doc = await chatCollection.limit(1).get();
        
        if (!doc.empty) {
          console.log('Creating composite index for chat collection...');
          await db.collection(COLLECTIONS.CHAT)
            .listIndexes()
            .then(async (indexes) => {
              // Check if our required index already exists
              const hasRequiredIndex = indexes.some(index => 
                index.fields.length === 2 &&
                index.fields.some(f => f.fieldPath === 'projectId') &&
                index.fields.some(f => f.fieldPath === 'timestamp')
              );

              if (!hasRequiredIndex) {
                await db.collection(COLLECTIONS.CHAT).doc('__dummy__').set({
                  projectId: 'dummy',
                  timestamp: Date.now()
                });

                console.log('Composite index creation triggered. Please wait a few minutes for it to be ready.');
                
                // Clean up dummy document
                await db.collection(COLLECTIONS.CHAT).doc('__dummy__').delete();
              } else {
                console.log('Required index already exists');
              }
            });
        } else {
          console.log('Chat collection is empty, index will be created when first document is added');
        }
      } catch (error) {
        console.error('Error creating index:', error);
      }
    }

    // Run the index creation
    createRequiredIndexes();
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
  }
}

const db = admin.firestore();

// Generic helpers
export async function addDocument(collectionName, data) {
  try {
    console.log(`[Firebase] Adding document to '${collectionName}':`, data);
    
    // Validate required fields for chat documents
    if (collectionName === COLLECTIONS.CHAT) {
      if (!data.projectId || !data.content || !data.timestamp) {
        throw new Error('Missing required fields for chat document');
      }
    }
    
    // Add document
    const docRef = await db.collection(collectionName).add({
      ...data,
      // Ensure timestamp is a number and exists
      timestamp: data.timestamp || Date.now()
    });
    
    console.log(`[Firebase] Added document with ID: ${docRef.id}`);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`[Firebase] Error adding document to '${collectionName}':`, error);
    throw error;
  }
}

export async function getDocuments(collectionName, queryObj = {}, orderByField = 'timestamp') {
  try {
    console.log(`[Firebase] Querying collection '${collectionName}' with filters:`, queryObj);
    
    // Validate collection exists
    const collections = await db.listCollections();
    const collectionExists = collections.some(col => col.id === collectionName);
    if (!collectionExists) {
      console.log(`[Firebase] Collection '${collectionName}' does not exist`);
      return [];
    }

    // Build query
    let ref = db.collection(collectionName);
    
    // Add filters
    for (const [field, value] of Object.entries(queryObj)) {
      if (value !== undefined && value !== null) {
        console.log(`[Firebase] Adding filter: ${field} == ${value}`);
        ref = ref.where(field, '==', value);
      }
    }
    
    try {
      // Try with ordering first
      if (orderByField) {
        console.log(`[Firebase] Attempting query with ordering by ${orderByField} DESC`);
        ref = ref.orderBy(orderByField, 'desc');
      }
      
      const snapshot = await ref.get();
      console.log(`[Firebase] Query returned ${snapshot.size} documents (with ordering)`);
      
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: typeof doc.data().timestamp === 'number' ? doc.data().timestamp : Date.now()
      }));
      
      return docs;
    } catch (orderError) {
      if (orderError.code === 9 && orderError.message.includes('requires an index')) {
        console.log('[Firebase] Index not ready yet, falling back to unordered query');
        // Fall back to unordered query while index is being created
        ref = db.collection(collectionName);
        for (const [field, value] of Object.entries(queryObj)) {
          if (value !== undefined && value !== null) {
            ref = ref.where(field, '==', value);
          }
        }
        
        const snapshot = await ref.get();
        console.log(`[Firebase] Unordered query returned ${snapshot.size} documents`);
        
        // Sort in memory as fallback
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: typeof doc.data().timestamp === 'number' ? doc.data().timestamp : Date.now()
        }));
        
        if (orderByField) {
          docs.sort((a, b) => b[orderByField] - a[orderByField]);
        }
        
        return docs;
      }
      throw orderError;
    }
  } catch (error) {
    console.error(`[Firebase] Error querying collection '${collectionName}':`, error);
    throw error;
  }
}

// Chat-specific wrappers (consistent naming)
export async function addChat(projectId, content) {
  const chat = new Chat(projectId, content);
  return addDocument(COLLECTIONS.CHAT, chat.toFirestore());
}

export async function getChats(projectId) {
  try {
    // Ensure projectId is a string
    const projectIdString = String(projectId);
    console.log(`[Firebase] Fetching chats for project ${projectIdString}, type:`, typeof projectIdString);
    const chats = await getDocuments(COLLECTIONS.CHAT, { projectId: projectIdString });
    console.log(`[Firebase] Found ${chats.length} chats with data:`, chats);
    return chats;
  } catch (error) {
    console.error('[Firebase] Error fetching chats:', error);
    throw error;
  }
}