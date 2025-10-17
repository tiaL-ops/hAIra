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
  // Prefer explicit env vars
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
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

  // Last resort: application default credentials
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

// Export db for reuse in other services if needed
export { db };

// Generic helpers
export async function addDocument(collectionName, data) {
  try {
    console.log(`[Firebase] Adding document to '${collectionName}'`);
    const docRef = await db.collection(collectionName).add(data);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`[Firebase] Error adding document to '${collectionName}':`, error);
    throw error;
  }
}

export async function setDocument(collectionName, id, data) {
  try {
    await db.collection(collectionName).doc(id).set(data, { merge: true });
    return { id, ...data };
  } catch (error) {
    console.error(`[Firebase] Error setting document in '${collectionName}/${id}':`, error);
    throw error;
  }
}

export async function updateDocument(collectionName, id, data) {
  try {
    await db.collection(collectionName).doc(id).update(data);
    return { id, ...data };
  } catch (error) {
    console.error(`[Firebase] Error updating document in '${collectionName}/${id}':`, error);
    throw error;
  }
}

export async function deleteDocument(collectionName, id) {
  try {
    await db.collection(collectionName).doc(id).delete();
    return { id };
  } catch (error) {
    console.error(`[Firebase] Error deleting document in '${collectionName}/${id}':`, error);
    throw error;
  }
}

export async function getDocumentById(collectionName, id) {
  try {
    const snap = await db.collection(collectionName).doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error(`[Firebase] Error getting document '${collectionName}/${id}':`, error);
    throw error;
  }
}

// Flexible query utility
// options: { filters: Array<{field, op, value}>, orderBy: Array<{field, direction}>, limit, startAfter }
export async function queryDocuments(collectionName, options = {}) {
  const { filters = [], orderBy = [], limit, startAfter } = options;
  try {
    let ref = db.collection(collectionName);

    // where clauses
    for (const f of filters) {
      if (f && f.field && f.op && typeof f.value !== 'undefined') {
        ref = ref.where(f.field, f.op, f.value);
      }
    }

    // order by clauses
    for (const o of orderBy) {
      if (o && o.field) {
        ref = ref.orderBy(o.field, o.direction === 'asc' ? 'asc' : 'desc');
      }
    }

    if (typeof limit === 'number') ref = ref.limit(limit);
    if (typeof startAfter !== 'undefined') ref = ref.startAfter(startAfter);

    try {
      const snapshot = await ref.get();
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      // Fallback for index errors: try without orderBy then sort in memory
      const needsIndex = ('' + (err.code || '')).includes('9') || (err.message || '').includes('index');
      if (needsIndex && orderBy.length > 0) {
        let fallbackRef = db.collection(collectionName);
        for (const f of filters) {
          fallbackRef = fallbackRef.where(f.field, f.op, f.value);
        }
        const snapshot = await fallbackRef.get();
        let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // In-memory sort using first orderBy as heuristic
        const first = orderBy[0];
        if (first && first.field) {
          docs.sort((a, b) => {
            const av = a[first.field];
            const bv = b[first.field];
            return (first.direction === 'asc' ? 1 : -1) * ((av > bv) - (av < bv));
          });
        }
        return docs;
      }
      throw err;
    }
  } catch (error) {
    console.error(`[Firebase] Error querying '${collectionName}':`, error);
    throw error;
  }
}

// Back-compat helper (simple equality filters and single orderBy field)
export async function getDocuments(collectionName, queryObj = {}, orderByField = 'timestamp') {
  const filters = Object.entries(queryObj).map(([field, value]) => ({ field, op: '==', value }));
  const orderBy = orderByField ? [{ field: orderByField, direction: 'asc' }] : [];
  return queryDocuments(collectionName, { filters, orderBy });
}
// speciifi wrrapper here"
// Chat-specific wrappers (consistent naming)
export async function addChat(projectId, content) {
  const chat = new Chat(projectId, content);
  return addDocument(COLLECTIONS.CHAT, chat.toFirestore());
}

export async function getChats(projectId) {
  const projectIdString = String(projectId);
  return queryDocuments(COLLECTIONS.CHAT, {
    filters: [{ field: 'projectId', op: '==', value: projectIdString }],
    orderBy: [{ field: 'timestamp', direction: 'desc' }]
  });
}