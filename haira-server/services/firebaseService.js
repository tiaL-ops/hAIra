import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import Chat from '../models/ChatModels.js';
import Task from '../models/KanbanModels.js';
import { COLLECTIONS, CHAT_SCHEMA, CHAT_MESSAGE_SCHEMA } from '../schema/database.js';
import { PROJECT_RULES, LEARNING_TOPICS } from '../config/projectRules.js';

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
  // Check for production environment and use appropriate default
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultPath = isProduction 
    ? path.join(__dirname, '../config/serviceAccountKeyProd.json')
    : path.join(__dirname, '../config/serviceAccountKey.json');
  
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || defaultPath;

  if (fs.existsSync(serviceAccountPath)) {
    const json = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    return admin.credential.cert(json);
  }

  // NO application default credentials - throw error instead
  throw new Error('No Firebase credentials found');
}


// Global flag to track Firebase availability
let firebaseAvailable = false;
let db = null;

// Initialize Firebase Admin SDK once - auto-detect based on credentials
if (!admin.apps.length) {
  try {
    const credential = buildCredential();
    admin.initializeApp({ credential });
    db = admin.firestore();
    firebaseAvailable = true;
    console.log('🔥 Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.log('💾 No Firebase credentials found - using localStorage fallback for all operations');
    console.log('💾 All data will be stored in local_data/fallback_firebase.json');
    firebaseAvailable = false;
  }
} else {
  try {
    db = admin.firestore();
    firebaseAvailable = true;
  } catch (error) {
    console.error('❌ Firebase firestore not available:', error.message);
    firebaseAvailable = false;
  }
}

// Export Firebase availability flag and db for reuse in other services
export { db, firebaseAvailable };

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
export async function addSubdocument(parentCollection, parentId, subcollection, docId, data) {
  try {
    console.log(`[Firebase] Adding document to '${parentCollection}/${parentId}/${subcollection}'`);
    console.log(`[Firebase] Data type:`, typeof data, 'Data keys:', Object.keys(data || {}));
    
    // Create a plain JavaScript object (no special Firestore objects)
    // Remove any functions, undefined values, or non-serializable objects
    const plainData = {};
    for (const [key, value] of Object.entries(data || {})) {
      if (value !== undefined && typeof value !== 'function') {
        try {
          // Test if value can be serialized
          JSON.stringify(value);
          plainData[key] = value;
        } catch (e) {
          console.warn(`[Firebase] Skipping non-serializable field: ${key}`);
        }
      }
    }
    
    console.log(`[Firebase] Plain data keys:`, Object.keys(plainData));
    
    if (docId) {
      // Use set with specific docId
      await db.collection(parentCollection).doc(parentId).collection(subcollection).doc(docId).set(plainData);
      return { id: docId, ...plainData };
    } else {
      // Auto-generate docId
      const docRef = await db.collection(parentCollection).doc(parentId).collection(subcollection).add(plainData);
      return { id: docRef.id, ...plainData };
    }
  } catch (error) {
    console.error(`[Firebase] Error adding document to subcollection '${parentCollection}/${parentId}/${subcollection}':`, error);
    console.error(`[Firebase] Data that failed:`, data);
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

// Get chat messages filtered by user ID (senderId)
export async function getChatMessagesByUser(parentCollection, parentId, subcollection, userId, orderByField = 'timestamp') {
  console.log(`[FirebaseService] Getting chat messages for user ${userId} from ${parentCollection}/${parentId}/${subcollection}`);
  
  try {
    let ref = db.collection(parentCollection).doc(parentId).collection(subcollection);
    
    // Order by timestamp
    if (orderByField) {
      ref = ref.orderBy(orderByField, 'desc');
    }
    
    const snapshot = await ref.get();
    const allMessages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Filter messages by senderId matching the user ID
    const userMessages = allMessages.filter(msg => {
      const senderId = msg.senderId;
      const isUserMessage = senderId === userId;
      
      if (isUserMessage) {
        console.log(`[FirebaseService] User message ${msg.id}:`, {
          senderId: msg.senderId,
          senderName: msg.senderName,
          text: (msg.text || '').substring(0, 100) + '...',
          timestamp: new Date(msg.timestamp).toLocaleString()
        });
      } else {
        console.log(`[FirebaseService] Skipping message ${msg.id} - senderId: ${senderId}, not ${userId}`);
      }
      
      return isUserMessage;
    });
    
    console.log(`[FirebaseService] Found ${userMessages.length} user messages out of ${allMessages.length} total messages`);
    return userMessages;
    
  } catch (error) {
    console.error(`[FirebaseService] Error getting chat messages for user:`, error);
    throw error;
  }
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
  console.log('[FirebaseService] addTasks called');
  console.log('[FirebaseService] projectId:', projectId);
  console.log('[FirebaseService] userId:', userId);
  console.log('[FirebaseService] projectTitle:', projectTitle);
  console.log('[FirebaseService] status:', status);
  console.log('[FirebaseService] deliverables count:', deliverables.length);
  console.log('[FirebaseService] deliverables:', JSON.stringify(deliverables, null, 2));
  
  projectTitle = (projectTitle || '').trim();
  await ensureProjectExists(projectId);

  let completedAt = 0;
  if (status === 'done') completedAt = Date.now();

  const promises = deliverables.map((item, index) => {
    // Frontend may send per-task assignee and priority; fallback to provided userId and MEDIUM
    const description = item?.deliverable ?? item?.description ?? '';
    const assignee = (item && item.assignedTo) ? String(item.assignedTo) : String(userId);
    const priority = (item && typeof item.priority === 'number')
      ? item.priority
      : Task.PRIORITY.MEDIUM.value;

    console.log(`[FirebaseService] Creating task ${index + 1}:`, {
      description,
      assignee,
      priority,
      status
    });

    let newDeliverable = new Task(
      projectTitle,
      assignee,
      status,
      description,
      Date.now(),
      completedAt,
      priority
    );

    newDeliverable = newDeliverable.toFirestore();
    return addSubdocument(COLLECTIONS.USER_PROJECTS, projectId, 'tasks', null, newDeliverable);
  });

  const results = await Promise.all(promises);
  console.log('[FirebaseService] All tasks saved, count:', results.length);
  return results;
}

export async function updateTask(projectId, id, title, status, userId, description, priority) {
  const collectionName = COLLECTIONS.USER_PROJECTS + '/' + projectId + '/tasks';
  let completedAt = 0;
  if (status === 'done')
    completedAt = Date.now();
  
  // Don't overwrite assignedTo - preserve AI assignments (sam, rasoa, etc.)
  const data = {
    title: title,
    status: status,
    description: description,
    completedAt: completedAt,
    priority: priority
  };

  // Debug: log update intent so we can trace when updates are attempted
  try {
    console.log('[FirebaseService] updateTask called for project:', projectId, 'taskId:', id);
    console.log('[FirebaseService] updateTask payload:', JSON.stringify(data, null, 2));
  } catch (e) {
    // ignore stringify errors
  }

  const result = await setDocument(collectionName, id, data);

  try {
    console.log('[FirebaseService] updateTask completed for task:', id, 'result id:', result?.id || 'n/a');
  } catch (e) {}

  return result;
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
  try {
    // Set any existing active project to inactive (not archived)
    const activeProject = await getActiveProject(userId);
    if (activeProject) {
      await updateDocument(COLLECTIONS.USER_PROJECTS, activeProject.id, {
        isActive: false,
        status: 'inactive'
      });
      console.log(`[FirebaseService] Set previous active project ${activeProject.id} to inactive`);
    }

    const projectRef = db.collection(COLLECTIONS.USER_PROJECTS).doc();
    
    const projectData = {
      userId: userId,
      title: title,
      status: 'active',
      isActive: true,
      startDate: Date.now(),
      team: [{
        id: userId,
        name: userName,
        role: 'owner'
      }]
    };
    
    await projectRef.set(projectData);
    
    // Update user's active project
    await updateUserActiveProject(userId, projectRef.id);
    
    console.log(`[FirebaseService] Created new active project ${projectRef.id} for user ${userId}`);
    return projectRef.id;
  } catch (error) {
    console.error('[FirebaseService] Error creating project:', error);
    throw error;
  }
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

export async function getNotifications(userId) {
  // Dummy notifications for now
  const dummyNotif = [
    { type: 1, message: 'The deadline is close' },
    { type: 1, message: 'Keep at it, you doing great' },
  ];

  const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists)
    return null;

  const notifRef = userRef.collection('notifications');
  const notifSnapshot = await notifRef.get();
  let notif = [];
  notifSnapshot.forEach((doc) => {
    notif.push({ id: doc.id, ...doc.data() });
  });

  if (!notif)
    return dummyNotif;

  console.log('notifications: fetched user notifications');

  return notif;
}

export async function getLateTasks(id, userId) {
  // TODO:
  // . search condition should be done on the DB level
  // . only look for projects that have not yet been archived
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));

  const userProjectsSnapshot = await db.collection('userProjects')
    .where('userId', '==', userId)
    .get();
  const lateTasks = [];

  for (const projectDoc of userProjectsSnapshot.docs) {
    const tasksSnapshot = await projectDoc.ref.collection('tasks')
      // TODO
      // .where('createdAt', '<=', oneHourAgo)
      .where('status', '!=', 'done')
      .get();
    
    tasksSnapshot.forEach(taskDoc => {
      lateTasks.push({
        userId: taskDoc.id,
        projectId: projectDoc.id,
        ...taskDoc.data(),
      });
    });
  }

  return lateTasks;
}

export async function pushNotification(userId, type, message) {
  const notif = {
    type: type,
    message: message,
    sentAt: Date.now(),
  };
  return addSubdocument(COLLECTIONS.USERS, userId, 'notifications', notif);
}

export async function clearNotifications(userId) {
  const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists)
    return null;

  const notifRef = userRef.collection('notifications');
  const notifSnapshot = await notifRef.get();
  for (const doc of notifSnapshot.docs) {
    await doc.ref.delete();
  }
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
  
  // Get tasks subcollection - include ALL tasks (both user and AI-assigned)
  const tasksRef = projectRef.collection('tasks');
  const tasksSnapshot = await tasksRef.get();
  
  const tasks = [];
  tasksSnapshot.forEach(doc => {
    const taskData = {
      id: doc.id,
      ...doc.data()
    };
    
    // Include all tasks for the project (both user-assigned and AI-assigned)
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
  
  console.log(`[FirebaseService] Found project ${projectId} with ${tasks.length} total tasks`);
  console.log(`[FirebaseService] All tasks:`, JSON.stringify(tasks, null, 2));
  
  // Fetch teammates from subcollection (source of truth)
  const teammatesRef = projectRef.collection('teammates');
  const teammatesSnapshot = await teammatesRef.get();
  
  const teammates = [];
  teammatesSnapshot.forEach(doc => {
    const teammateData = doc.data();
    teammates.push({
      id: doc.id,
      name: teammateData.name,
      role: teammateData.role,
      type: teammateData.type,
      avatar: teammateData.avatar,
      color: teammateData.color
    });
  });
  
  console.log(`[FirebaseService] Found ${teammates.length} teammates in subcollection`);
  
  // Update project.team from subcollection if teammates exist
  let updatedProjectData = { ...projectData };
  if (teammates.length > 0) {
    updatedProjectData.team = teammates;
  }
  
  return {
    project: {
      id: projectId,
      ...updatedProjectData
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

// Activate a project and set previous active project to inactive
export async function activateProject(userId, projectId) {
  try {
    // Get current active project
    const activeProject = await getActiveProject(userId);
    
    // Set the new project as active
    const newProjectRef = db.collection(COLLECTIONS.USER_PROJECTS).doc(projectId);
    await newProjectRef.update({
      isActive: true,
      status: 'active'
    });
    
    // Set previous active project to inactive (if exists)
    if (activeProject) {
      const previousProjectRef = db.collection(COLLECTIONS.USER_PROJECTS).doc(activeProject.id);
      await previousProjectRef.update({
        isActive: false,
        status: 'inactive'
      });
    }
    
    // Update user's activeProjectId
    await updateUserActiveProject(userId, projectId);
    
    console.log(`[FirebaseService] Activated project ${projectId} for user ${userId}`);
    if (activeProject) {
      console.log(`[FirebaseService] Set previous active project ${activeProject.id} to inactive`);
    }
    
  } catch (error) {
    console.error('[FirebaseService] Error activating project:', error);
    throw error;
  }
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

// --------------------------------Project Management Rules--------------------------------

// Check if user can create new project
export async function canCreateNewProject(userId) {
  try {
    const projects = await getUserProjects(userId);
    console.log(`[FirebaseService] Projects: ${JSON.stringify(projects, null, 2)}`);
    console.log(`[FirebaseService] Max total projects: ${PROJECT_RULES.MAX_TOTAL_PROJECTS}`);
    const activeProjects = projects.filter(p => p.isActive === true);
    console.log(`[FirebaseService] Active projects: ${JSON.stringify(activeProjects, null, 2)}`);
    console.log(`[FirebaseService] Active projects length: ${activeProjects.length}`);
    console.log(`[FirebaseService] Total projects: ${projects.length}`);
    console.log(`[FirebaseService] Max total projects: ${PROJECT_RULES.MAX_TOTAL_PROJECTS}`);
    console.log(`[FirebaseService] Can create new project: ${projects.length < PROJECT_RULES.MAX_TOTAL_PROJECTS}`);
    return projects.length < PROJECT_RULES.MAX_TOTAL_PROJECTS;
  } catch (error) {
    console.error('Error checking project limits:', error);
    return false;
  }
}

// Get active project for user
export async function getActiveProject(userId) {
  try {
    const projects = await getUserProjects(userId);
    return projects.find(p => p.isActive === true && !p.archivedAt);
  } catch (error) {
    console.error('Error getting active project:', error);
    return null;
  }
}

// Get inactive projects for user (can be continued)
export async function getInactiveProjects(userId) {
  try {
    const projects = await getUserProjects(userId);
    const inactiveProjects = projects.filter(p => p.isActive === false && !p.archivedAt);
    console.log(`[FirebaseService] Found ${inactiveProjects.length} inactive projects for user ${userId}`);
    return inactiveProjects;
  } catch (error) {
    console.error('Error getting inactive projects:', error);
    return [];
  }
}

// Get archived projects for user (only truly archived, not inactive)
export async function getArchivedProjects(userId) {
  try {
    const projects = await getUserProjects(userId);
    const archivedProjects = projects.filter(p => p.status === 'archived');
    console.log(`[FirebaseService] Found ${archivedProjects.length} archived projects for user ${userId}`);
    archivedProjects.forEach(project => {
      console.log(`[FirebaseService] Archived project: ${project.title}, archivedAt: ${project.archivedAt}`);
    });
    return archivedProjects;
  } catch (error) {
    console.error('Error getting archived projects:', error);
    return [];
  }
}

// Archive a project
export async function archiveProject(projectId, userId) {
  try {
    // Verify user owns the project
    const project = await getDocumentById(COLLECTIONS.USER_PROJECTS, projectId);
    if (!project || project.userId !== userId) {
      throw new Error('Project not found or access denied');
    }

    // Archive the project
    const archivedAt = Date.now();
    console.log(`[FirebaseService] Archiving project ${projectId} at timestamp: ${archivedAt}`);
    await updateDocument(COLLECTIONS.USER_PROJECTS, projectId, {
      isActive: false,
      status: 'archived',
      archivedAt: archivedAt
    });
    console.log(`[FirebaseService] Project ${projectId} archived successfully`);

    // If this was the active project, clear user's activeProjectId
    const user = await getDocumentById(COLLECTIONS.USERS, userId);
    if (user && user.activeProjectId === projectId) {
      await updateDocument(COLLECTIONS.USERS, userId, {
        activeProjectId: null
      });
    }

    return { success: true, message: 'Project archived successfully' };
  } catch (error) {
    console.error('Error archiving project:', error);
    throw error;
  }
}

// Create AI-generated template
export async function createAITemplate(aiProject, topic) {
  try {
    const templateRef = db.collection(COLLECTIONS.PROJECT_TEMPLATES).doc();
    const templateData = {
      title: aiProject.title,
      description: aiProject.description,
      durationDays: PROJECT_RULES.DEFAULT_DEADLINE_DAYS,
      managerName: "Alex", // Default manager
      deliverables: aiProject.deliverables || [],
      availableTeammates: ["Rasoa", "Rakoto"], // Default teammates
      topic: topic,
      aiGenerated: true,
      createdAt: Date.now()
    };
    
    await templateRef.set(templateData);
    return templateRef.id;
  } catch (error) {
    console.error('Error creating AI template:', error);
    throw error;
  }
}

// Create AI-generated project
export async function createAIGeneratedProject(userId, userName, topic, aiProject, existingTemplateId = null) {
  try {
    // Check if user can create new project
    const canCreate = await canCreateNewProject(userId);
    if (!canCreate) {
      throw new Error('Maximum number of projects reached. Please archive a project first.');
    }

    // Set any existing active project to inactive (not archived)
    const activeProject = await getActiveProject(userId);
    if (activeProject) {
      await updateDocument(COLLECTIONS.USER_PROJECTS, activeProject.id, {
        isActive: false,
        status: 'inactive'
      });
    }

    // Use existing template ID or create new template
    let templateId;
    if (existingTemplateId) {
      templateId = existingTemplateId;
      console.log(`[FirebaseService] Using existing template: ${templateId}`);
    } else {
      templateId = await createAITemplate(aiProject, topic);
      console.log(`[FirebaseService] Created new template: ${templateId}`);
    }
    
    // Create user project
    const projectRef = db.collection(COLLECTIONS.USER_PROJECTS).doc();
    const deadline = Date.now() + (PROJECT_RULES.DEFAULT_DEADLINE_DAYS * 24 * 60 * 60 * 1000);
    
    const projectData = {
      userId: userId,
      templateId: templateId, // Reference the AI-generated template
      title: aiProject.title,
      status: 'active',
      isActive: true,
      startDate: Date.now(),
      deadline: deadline,
      aiGenerated: true, // Mark as AI-generated
      topic: topic,
      description: aiProject.description,
      team: [{
        id: userId,
        name: userName,
        role: 'owner'
      }]
    };
    
    await projectRef.set(projectData);
    
    // Update user's active project
    await updateUserActiveProject(userId, projectRef.id);
    
    return projectRef.id;
  } catch (error) {
    console.error('Error creating AI project:', error);
    throw error;
  }
}

// Get project with template data
export async function getProjectWithTemplate(projectId, userId) {
  try {
    const project = await getDocumentById(COLLECTIONS.USER_PROJECTS, projectId);
    if (!project || project.userId !== userId) {
      return null;
    }

    // Get template data
    const template = await getDocumentById(COLLECTIONS.PROJECT_TEMPLATES, project.templateId);
    
    return {
      project: project,
      template: template
    };
  } catch (error) {
    console.error('Error getting project with template:', error);
    return null;
  }
}

// Get all user projects with template data merged
export async function getUserProjectsWithTemplates(userId) {
  try {
    const projects = await getUserProjects(userId);
    const projectsWithTemplates = [];
    
    for (const project of projects) {
      try {
        // Get template data
        const template = await getDocumentById(COLLECTIONS.PROJECT_TEMPLATES, project.templateId);
        
        // Fetch teammates from subcollection (source of truth)
        const teammatesRef = db.collection(COLLECTIONS.USER_PROJECTS)
          .doc(project.id)
          .collection('teammates');
        const teammatesSnapshot = await teammatesRef.get();
        
        const teammates = [];
        teammatesSnapshot.forEach(doc => {
          const teammateData = doc.data();
          teammates.push({
            id: doc.id,
            name: teammateData.name,
            role: teammateData.role,
            type: teammateData.type,
            avatar: teammateData.avatar,
            color: teammateData.color
          });
        });
        
        // Use teammates from subcollection if available, fallback to document field
        const teamData = teammates.length > 0 ? teammates : (project.team || []);
        
        // Merge project data with template data
        const mergedProject = {
          ...project,
          // Template fields
          description: template?.description || '',
          managerName: template?.managerName || '',
          // Keep user project team data from subcollection (source of truth)
          team: teamData,
          // Template fields that might be useful
          durationDays: template?.durationDays,
          deliverables: template?.deliverables || [],
          availableTeammates: template?.availableTeammates || [],
          topic: template?.topic,
          aiGenerated: template?.aiGenerated || false
        };
        
        projectsWithTemplates.push(mergedProject);
      } catch (error) {
        console.error(`Error getting template for project ${project.id}:`, error);
        // Add project without template data
        projectsWithTemplates.push(project);
      }
    }
    
    return projectsWithTemplates;
  } catch (error) {
    console.error('Error getting user projects with templates:', error);
    return [];
  }
}

// Template Reuse Functions

// Get unused templates for a specific topic and user
export async function getUnusedTemplatesForTopic(topic, userId) {
  try {
    console.log(`[FirebaseService] Looking for unused templates for topic: ${topic}, user: ${userId}`);
    
    const templates = await getDocuments(COLLECTIONS.PROJECT_TEMPLATES, { 
      topic: topic,
      isReusable: true 
    });
    
    // Filter out templates that this user has already used
    const unusedTemplates = templates.filter(template => {
      const usedBy = template.usedBy || [];
      return !usedBy.includes(userId);
    });
    
    console.log(`[FirebaseService] Found ${unusedTemplates.length} unused templates for topic ${topic}`);
    return unusedTemplates;
  } catch (error) {
    console.error('[FirebaseService] Error getting unused templates:', error);
    return [];
  }
}

// Get least-used templates for a specific topic
export async function getLeastUsedTemplatesForTopic(topic, limit = 3) {
  try {
    console.log(`[FirebaseService] Looking for least-used templates for topic: ${topic}`);
    
    const templates = await getDocuments(COLLECTIONS.PROJECT_TEMPLATES, { 
      topic: topic,
      isReusable: true 
    });
    
    // Sort by usage count (ascending) and limit results
    const sortedTemplates = templates
      .sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0))
      .slice(0, limit);
    
    console.log(`[FirebaseService] Found ${sortedTemplates.length} least-used templates for topic ${topic}`);
    return sortedTemplates;
  } catch (error) {
    console.error('[FirebaseService] Error getting least-used templates:', error);
    return [];
  }
}

// Update template usage when a template is used
export async function updateTemplateUsage(templateId, userId) {
  try {
    console.log(`[FirebaseService] Updating template usage for template: ${templateId}, user: ${userId}`);
    
    const template = await getDocumentById(COLLECTIONS.PROJECT_TEMPLATES, templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    const usedBy = template.usedBy || [];
    const usageCount = template.usageCount || 0;
    
    // Add user to usedBy array if not already there
    if (!usedBy.includes(userId)) {
      usedBy.push(userId);
    }
    
    // Update template with new usage data
    await updateDocument(COLLECTIONS.PROJECT_TEMPLATES, templateId, {
      usedBy: usedBy,
      usageCount: usageCount + 1,
      lastUsed: Date.now()
    });
    
    console.log(`[FirebaseService] Updated template usage: ${usageCount + 1} total uses`);
  } catch (error) {
    console.error('[FirebaseService] Error updating template usage:', error);
    throw error;
  }
}