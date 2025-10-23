import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import Chat from '../models/ChatModels.js';
import Task from '../models/KanbanModels.js';
import { COLLECTIONS, CHAT_SCHEMA, CHAT_MESSAGE_SCHEMA } from '../schema/database.js';

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

// Helper for adding documents to subcollections
export async function addSubdocument(parentCollection, parentId, subcollection, data) {
  try {
    console.log(`[Firebase] Adding document to '${parentCollection}/${parentId}/${subcollection}'`);
    const docRef = await db.collection(parentCollection).doc(parentId).collection(subcollection).add(data);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`[Firebase] Error adding document to subcollection '${parentCollection}/${parentId}/${subcollection}':`, error);
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

// Helper for querying subcollections with the same options as queryDocuments
export async function querySubcollection(parentCollection, parentId, subcollection, options = {}) {
  const { filters = [], orderBy = [], limit, startAfter } = options;
  try {
    let ref = db.collection(parentCollection).doc(parentId).collection(subcollection);

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

    const snapshot = await ref.get();
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error(`[Firebase] Error querying subcollection '${parentCollection}/${parentId}/${subcollection}':`, error);
    throw error;
  }
}

// Simple helper for getting documents from a subcollection
export async function getSubdocuments(parentCollection, parentId, subcollection, queryObj = {}, orderByField = 'timestamp') {
  const filters = Object.entries(queryObj).map(([field, value]) => ({ field, op: '==', value }));
  const orderBy = orderByField ? [{ field: orderByField, direction: 'desc' }] : [];
  return querySubcollection(parentCollection, parentId, subcollection, { filters, orderBy });
}


// Chat-specific wrappers
// Support both legacy mode and new schema with subcollections
export async function addChat(projectId, text, senderId, senderName, systemPrompt = null, useSubcollection = false) {
  const chat = new Chat(projectId, text, senderId, senderName, systemPrompt);
  const chatData = chat.toFirestore();
  
  if (useSubcollection) {
    // New schema: add as subcollection to userProjects
    return addSubdocument(COLLECTIONS.USER_PROJECTS, projectId, 'chatMessages', {
      senderId,
      senderName,
      text,
      timestamp: chat.timestamp,
      ...(systemPrompt && senderId.startsWith('ai_') ? { systemPrompt } : {})
    });
  } else {
    // Legacy mode: use the flat chats collection
    return addDocument(COLLECTIONS.CHAT, chatData);
  }
}

export async function addUserChat(projectId, text, userId = 'user_1', userName = 'hairateam', useSubcollection = false) {
  return addChat(projectId, text, userId, userName, null, useSubcollection);
}

export async function addAIChat(projectId, text, systemPrompt, aiId = 'ai_1', aiName = 'haira', useSubcollection = false) {
  return addChat(projectId, text, aiId, aiName, systemPrompt, useSubcollection);
}

export async function getChats(projectId, useSubcollection = false) {
  const projectIdString = String(projectId);
  
  if (useSubcollection) {
    // Check if project exists first
    const projectDoc = await db.collection(COLLECTIONS.USER_PROJECTS).doc(projectIdString).get();
    
    if (!projectDoc.exists) {
      console.log(`[Firebase] Project ${projectIdString} not found, creating it`);
      // Create project if it doesn't exist (placeholder for now)
      await db.collection(COLLECTIONS.USER_PROJECTS).doc(projectIdString).set({
        userId: 'default_user',
        templateId: 'default_template',
        title: `Project ${projectIdString}`,
        status: 'in-progress',
        startDate: Date.now()
      });
    }
    
    // Get chats from subcollection
    return getSubdocuments(COLLECTIONS.USER_PROJECTS, projectIdString, 'chatMessages');
  } else {
    // Legacy mode: query the flat chats collection
    return queryDocuments(COLLECTIONS.CHAT, {
      filters: [{ field: 'projectId', op: '==', value: projectIdString }],
      orderBy: [{ field: 'timestamp', direction: 'desc' }]
    });
  }
}


// UserProject-Specific Wrapper
// User Project Wrapper for Sumbmission (submit final report ==> Update UserProject)
export async function updateUserProject(projectId, content, grade, status = "submitted") {
  // final report
  const finalReport = {
    content: content,
    submittedAt: Date.now()
  }

  // Ensure project exists first
  await ensureProjectExists(projectId);

  // Update the user project (legacy not required since this is the root project)
  return updateDocument(COLLECTIONS.USER_PROJECTS, projectId, {
    finalReport,
    grade: grade,
    status,
  });
  
}

export async function addTasks(projectId, userId, projectTitle, status, deliverables = []) {
  projectTitle = projectTitle.trim();
  await ensureProjectExists(projectId);

  const promises = deliverables.map((item) => {
    let newDeliverable = new Task(
      projectTitle,
      userId,
      status,
      item.deliverable,
      Date.now(),
      0,
      Task.PRIORITY.MEDIUM.value
    );
    newDeliverable = newDeliverable.toFirestore();
    return addSubdocument(COLLECTIONS.USER_PROJECTS, projectId, 'tasks', newDeliverable);
  });

  return await Promise.all(promises);
}

export async function updateTask(projectId, id, title, status, userId, description, priority) {
  const collectionName = COLLECTIONS.USER_PROJECTS + '/' + projectId + '/tasks';
  const data = {
    title : title,
    assignedTo : userId,
    status : status,
    description : description,
    priority : priority
  }
  return await setDocument(collectionName, id, data);
}

export async function deleteTask(projectId, taskId) {
  const collectionName = COLLECTIONS.USER_PROJECTS + '/' + projectId + '/tasks';
  return await deleteDocument(collectionName, taskId);
}


// Create a UserProject document if it doesn't exist
export async function ensureProjectExists(projectId, userId = 'default_user', templateId = 'default_template', title = null) {
  const projectRef = db.collection(COLLECTIONS.USER_PROJECTS).doc(projectId);
  const doc = await projectRef.get();
  
  if (!doc.exists) {
    await projectRef.set({
      userId,
      templateId,
      title: title || `Project ${projectId}`,
      status: 'in-progress',
      startDate: Date.now()
    });
    return { id: projectId, created: true };
  }
  
  return { id: projectId, created: false };
}

// Create a new project
export async function createProject(userId, userName, title) {
  const projectRef = db.collection(COLLECTIONS.USER_PROJECTS).doc();
  
  const projectData = {
    userId: userId,
    title: title,
    status: 'started',
    startDate: Date.now(),
    team: [{
      id: userId,
      name: userName,
      role: 'owner'
    }]
  };
  
  await projectRef.set(projectData);
  return projectRef.id;
}

// Get all projects for a user
export async function getUserProjects(userId) {
  console.log(`[FirebaseService] Getting projects for user: ${userId}`);
  
  const projectsRef = db.collection(COLLECTIONS.USER_PROJECTS);
  const query = projectsRef.where('userId', '==', userId);
  const snapshot = await query.get();
  
  const projects = [];
  snapshot.forEach(doc => {
    projects.push({
      id: doc.id,
      ...doc.data()
    });
    console.log(`[FirebaseService] Found project: ${doc.id} - ${doc.data().title || doc.data().name || 'No title'}`);
  });
  
  console.log(`[FirebaseService] Total projects found: ${projects.length}`);
  return projects;
}

// Get project with tasks
export async function getProjectWithTasks(projectId, userId) {
  console.log(`[FirebaseService] Looking for project ${projectId} for user ${userId}`);
  
  const projectRef = db.collection(COLLECTIONS.USER_PROJECTS).doc(projectId);
  const projectDoc = await projectRef.get();
  
  console.log(`[FirebaseService] Project document exists: ${projectDoc.exists}`);
  
  if (!projectDoc.exists) {
    console.log(`[FirebaseService] Project ${projectId} does not exist`);
    return null;
  }
  
  const projectData = projectDoc.data();
  console.log(`[FirebaseService] Project data userId: ${projectData.userId}, requested userId: ${userId}`);
  
  // Verify the user owns this project
  if (projectData.userId !== userId) {
    console.log(`[FirebaseService] Access denied: Project ${projectId} belongs to ${projectData.userId}, not ${userId}`);
    return null;
  }
  
  // Get tasks subcollection
  const tasksRef = projectRef.collection('tasks');
  const tasksSnapshot = await tasksRef.get();
  
  const tasks = [];
  tasksSnapshot.forEach(doc => {
    const taskData = {
      id: doc.id,
      ...doc.data()
    };
    tasks.push(taskData);
    
    // Log each task for debugging
    console.log(`[FirebaseService] Task ${doc.id}:`, {
      title: taskData.title || taskData.text || 'No title',
      description: taskData.description || 'No description',
      status: taskData.status || 'no status',
      assignedTo: taskData.assignedTo || taskData.assignee || 'unassigned',
      id: doc.id
    });
  });
  
  console.log(`[FirebaseService] Found project ${projectId} with ${tasks.length} tasks`);
  console.log(`[FirebaseService] All tasks:`, JSON.stringify(tasks, null, 2));
  
  return {
    project: {
      id: projectId,
      ...projectData
    },
    tasks: tasks
  };
}

// Update user's active project
export async function updateUserActiveProject(userId, projectId) {
  const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
  await userRef.update({
    activeProjectId: projectId
  });
}

// Get count of user messages in the last 24 hours
export async function getUserMessageCountSince(projectId, userId, projectStartDate, currentDay) {
  try {
    // Calculate 24 hours ago from now
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    
    console.log(`[Firebase] Counting messages for user ${userId} in project ${projectId} in last 24 hours (since ${new Date(twentyFourHoursAgo).toISOString()})`);
    
    // Query subcollection for all messages first, then filter in memory to avoid index requirement
    const messagesRef = db
      .collection(COLLECTIONS.USER_PROJECTS)
      .doc(String(projectId))
      .collection('chatMessages');
    
    const snapshot = await messagesRef.get();
    
    // Filter in memory to avoid needing a composite index
    let count = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      // Count only user messages (not AI messages) from the last 24 hours
      if (data.senderId === userId && data.timestamp >= twentyFourHoursAgo) {
        count++;
        console.log(`[Firebase] Found user message: ${data.text?.substring(0, 50)}... at ${new Date(data.timestamp).toISOString()}`);
      }
    });
    
    console.log(`[Firebase] Found ${count} user messages in last 24 hours for user ${userId}`);
    
    // Debug: Show when the 24-hour window started
    const nowDate = new Date();
    const twentyFourHoursAgoDate = new Date(twentyFourHoursAgo);
    console.log(`[Firebase] 24-hour window: ${twentyFourHoursAgoDate.toISOString()} to ${nowDate.toISOString()}`);
    
    return count;
  } catch (error) {
    console.error(`[Firebase] Error counting user messages:`, error);
    throw error;
  }
}