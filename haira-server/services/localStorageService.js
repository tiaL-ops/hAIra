/*
 * localStorageService.js
 *
 * This file provides a fallback for firebaseService.js API.
 * If running in a browser, it uses localStorage.
 * If running in Node.js (backend, no service account), it uses a local JSON file.
 *
 * It mimics the async nature of Firestore and the collection/subcollection
 * data structure using a single JSON object in the fallback store.
 */

// --- Mock Dependencies (from original file) ---

// Mocking COLLECTIONS
const COLLECTIONS = {
  USER_PROJECTS: 'userProjects',
  PROJECT_TEMPLATES: 'projectTemplates',
  USERS: 'users',
  CHAT: 'chats', // For legacy chat
};

// Mocking PROJECT_RULES
const PROJECT_RULES = {
  MAX_TOTAL_PROJECTS: 5,
  DEFAULT_DEADLINE_DAYS: 14,
};

// Mocking Models (just need the structure)
class Chat {
  constructor(projectId, text, senderId, senderName, systemPrompt = null) {
    this.projectId = String(projectId);
    this.text = text;
    this.senderId = senderId;
    this.senderName = senderName;
    this.timestamp = Date.now();
    if (systemPrompt && senderId.startsWith('ai_')) {
      this.systemPrompt = systemPrompt;
    }
  }
  toFirestore() {
    return { ...this };
  }
}

class Task {
  static PRIORITY = {
    LOW: { value: 0, label: 'Low' },
    MEDIUM: { value: 1, label: 'Medium' },
    HIGH: { value: 2, label: 'High' },
  };

  constructor(title, assignedTo, status, description, createdAt, completedAt = 0, priority = 1) {
    this.title = title;
    this.assignedTo = assignedTo;
    this.status = status;
    this.description = description;
    this.createdAt = createdAt;
    this.completedAt = completedAt;
    this.priority = priority;
  }
  toFirestore() {
    return { ...this };
  }
}


// --- Fallback Storage Helpers ---
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const _DB_KEY = '__firebase_fallback_db__';
const _FALLBACK_FILE = path.join(__dirname, '../local_data/fallback_firebase.json');

// Default empty state for the database
const _getDefaultDb = () => ({
  [COLLECTIONS.USER_PROJECTS]: {},
  [COLLECTIONS.PROJECT_TEMPLATES]: {},
  [COLLECTIONS.USERS]: {},
  [COLLECTIONS.CHAT]: {},
});

function _isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function _getDb() {
  if (_isBrowser()) {
    try {
      const dbString = window.localStorage.getItem(_DB_KEY);
      return dbString ? JSON.parse(dbString) : _getDefaultDb();
    } catch (error) {
      console.error('[LocalStorage] Error reading from localStorage, resetting DB:', error);
      window.localStorage.setItem(_DB_KEY, JSON.stringify(_getDefaultDb()));
      return _getDefaultDb();
    }
  } else {
    // Node.js fallback: use local file
    try {
      if (!fs.existsSync(_FALLBACK_FILE)) {
        fs.writeFileSync(_FALLBACK_FILE, JSON.stringify(_getDefaultDb(), null, 2));
      }
      const dbString = fs.readFileSync(_FALLBACK_FILE, 'utf8');
      return dbString ? JSON.parse(dbString) : _getDefaultDb();
    } catch (error) {
      console.error('[LocalFile] Error reading fallback file, resetting DB:', error);
      fs.writeFileSync(_FALLBACK_FILE, JSON.stringify(_getDefaultDb(), null, 2));
      return _getDefaultDb();
    }
  }
}

function _saveDb(db) {
  if (_isBrowser()) {
    try {
      window.localStorage.setItem(_DB_KEY, JSON.stringify(db));
    } catch (error) {
      console.error('[LocalStorage] Error saving to localStorage:', error);
    }
  } else {
    try {
      fs.writeFileSync(_FALLBACK_FILE, JSON.stringify(db, null, 2));
    } catch (error) {
      console.error('[LocalFile] Error saving fallback file:', error);
    }
  }
}

/**
 * Generates a simple unique ID.
 * @returns {string} A unique ID.
 */
function _uuid() {
  // Use crypto.randomUUID if available (modern browsers), otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older envs
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Wraps a value in a resolved promise with a slight delay
 * to mimic network latency.
 * @param {*} data The data to return.
 * @param {number} ms Milliseconds to delay.
 * @returns {Promise<*>}
 */
const _asyncDelay = (data, ms = 0) =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));


// --- Exported API (Mimicking firebaseService.js) ---
// Mock db export
export const db = {
  type: _isBrowser() ? 'localStorageFallback' : 'localFileFallback',
  clearAll: () => {
    _saveDb(_getDefaultDb());
    console.log(_isBrowser() ? '[LocalStorage] Fallback DB cleared.' : '[LocalFile] Fallback DB cleared.');
  },
};

// --- Generic Helpers ---

export async function addDocument(collectionName, data) {
  console.log(`[LocalStorage] Adding document to '${collectionName}'`);
  const db = _getDb();
  const id = _uuid();
  const doc = { ...data, id };

  if (!db[collectionName]) {
    db[collectionName] = {};
  }
  db[collectionName][id] = doc;
  _saveDb(db);
  return _asyncDelay({ ...doc }); // Return a copy
}

export async function addSubdocument(parentCollection, parentId, subcollection, data) {
  console.log(`[LocalStorage] Adding document to '${parentCollection}/${parentId}/${subcollection}'`);
  const db = _getDb();
  const id = _uuid();
  const doc = { ...data, id };

  if (!db[parentCollection] || !db[parentCollection][parentId]) {
    console.warn(`[LocalStorage] Parent doc '${parentCollection}/${parentId}' not found, but creating subdoc anyway.`);
    // Ensure parent exists to avoid errors
    if (!db[parentCollection]) db[parentCollection] = {};
    if (!db[parentCollection][parentId]) db[parentCollection][parentId] = { id: parentId };
  }

  if (!db[parentCollection][parentId][subcollection]) {
    db[parentCollection][parentId][subcollection] = {};
  }

  db[parentCollection][parentId][subcollection][id] = doc;
  _saveDb(db);
  return _asyncDelay({ ...doc }); // Return a copy
}

export async function setDocument(collectionName, id, data) {
  console.log(`[LocalStorage] Setting document in '${collectionName}/${id}' (merge: true)`);
  const db = _getDb();

  if (!db[collectionName]) {
    db[collectionName] = {};
  }

  const existingData = db[collectionName][id] || {};
  const doc = { ...existingData, ...data, id }; // Mimics { merge: true }

  db[collectionName][id] = doc;
  _saveDb(db);
  return _asyncDelay({ ...doc }); // Return a copy
}

export async function updateDocument(collectionName, id, data) {
  console.log(`[LocalStorage] Updating document in '${collectionName}/${id}'`);
  const db = _getDb();

  if (!db[collectionName] || !db[collectionName][id]) {
    console.warn(`[LocalStorage] Document '${collectionName}/${id}' not found for update, creating it.`);
    if (!db[collectionName]) db[collectionName] = {};
  }

  const existingData = db[collectionName][id] || {};
  const doc = { ...existingData, ...data, id }; // Mimics update (which is a merge)

  db[collectionName][id] = doc;
  _saveDb(db);
  return _asyncDelay({ ...doc }); // Return a copy
}

export async function deleteDocument(collectionName, id) {
  console.log(`[LocalStorage] Deleting document in '${collectionName}/${id}'`);
  const db = _getDb();
  let deleted = false;

  if (db[collectionName] && db[collectionName][id]) {
    delete db[collectionName][id];
    deleted = true;
  }

  if (deleted) {
    _saveDb(db);
  }
  return _asyncDelay({ id });
}

export async function getDocumentById(collectionName, id) {
  console.log(`[LocalStorage] Getting document '${collectionName}/${id}'`);
  const db = _getDb();
  const doc = db[collectionName] ? db[collectionName][id] : null;
  return _asyncDelay(doc ? { ...doc } : null); // Return a copy
}

/**
 * Applies filters, sorting, and limits to an array of documents.
 * @param {Array<object>} docs - The array of documents.
 * @param {object} options - The query options.
 * @returns {Array<object>} The filtered and sorted documents.
 */
function _applyQueryOptions(docs, options = {}) {
  const { filters = [], orderBy = [], limit } = options;
  let results = [...docs];

  // Filters
  for (const f of filters) {
    if (f && f.field && f.op) {
      results = results.filter((doc) => {
        switch (f.op) {
          case '==':
            return doc[f.field] === f.value;
          case '!=':
            return doc[f.field] !== f.value;
          case '<':
            return doc[f.field] < f.value;
          case '<=':
            return doc[f.field] <= f.value;
          case '>':
            return doc[f.field] > f.value;
          case '>=':
            return doc[f.field] >= f.value;
          case 'array-contains':
            return Array.isArray(doc[f.field]) && doc[f.field].includes(f.value);
          default:
            console.warn(`[LocalStorage] Unsupported filter op: ${f.op}`);
            return true;
        }
      });
    }
  }

  // OrderBy
  if (orderBy.length > 0) {
    // Only sorting by the first field for simplicity, as in original fallback
    const o = orderBy[0];
    if (o && o.field) {
      results.sort((a, b) => {
        const av = a[o.field];
        const bv = b[o.field];
        const dir = o.direction === 'asc' ? 1 : -1;
        if (av > bv) return 1 * dir;
        if (av < bv) return -1 * dir;
        return 0;
      });
    }
  }

  // Limit
  if (typeof limit === 'number') {
    results = results.slice(0, limit);
  }

  return results;
}

export async function queryDocuments(collectionName, options = {}) {
  console.log(`[LocalStorage] Querying '${collectionName}'`);
  const db = _getDb();
  const collection = db[collectionName] || {};
  const docs = Object.values(collection);
  const results = _applyQueryOptions(docs, options);
  return _asyncDelay(results.map(doc => ({ ...doc }))); // Return copies
}

export async function getDocuments(collectionName, queryObj = {}, orderByField = 'timestamp') {
  const filters = Object.entries(queryObj).map(([field, value]) => ({ field, op: '==', value }));
  const orderBy = orderByField ? [{ field: orderByField, direction: 'asc' }] : [];
  return queryDocuments(collectionName, { filters, orderBy });
}

export async function querySubcollection(parentCollection, parentId, subcollection, options = {}) {
  console.log(`[LocalStorage] Querying subcollection '${parentCollection}/${parentId}/${subcollection}'`);
  const db = _getDb();
  const parentDoc = db[parentCollection] ? db[parentCollection][parentId] : null;
  const subColl = parentDoc && parentDoc[subcollection] ? parentDoc[subcollection] : {};
  const docs = Object.values(subColl);
  const results = _applyQueryOptions(docs, options);
  return _asyncDelay(results.map(doc => ({ ...doc }))); // Return copies
}

export async function getSubdocuments(parentCollection, parentId, subcollection, queryObj = {}, orderByField = 'timestamp') {
  const filters = Object.entries(queryObj).map(([field, value]) => ({ field, op: '==', value }));
  const orderBy = orderByField ? [{ field: orderByField, direction: 'desc' }] : [];
  return querySubcollection(parentCollection, parentId, subcollection, { filters, orderBy });
}

export async function getChatMessagesByUser(parentCollection, parentId, subcollection, userId, orderByField = 'timestamp') {
  console.log(`[LocalStorage] Getting chat messages for user ${userId} from ${parentCollection}/${parentId}/${subcollection}`);
  const db = _getDb();
  const parentDoc = db[parentCollection] ? db[parentCollection][parentId] : null;
  const subColl = parentDoc && parentDoc[subcollection] ? parentDoc[subcollection] : {};
  let messages = Object.values(subColl);

  // Filter by user
  messages = messages.filter(msg => msg.senderId === userId);

  // Sort
  if (orderByField) {
    messages.sort((a, b) => (b[orderByField] || 0) - (a[orderByField] || 0)); // desc
  }

  console.log(`[LocalStorage] Found ${messages.length} user messages`);
  return _asyncDelay(messages.map(doc => ({ ...doc })));
}

// --- Chat-specific Wrappers ---

export async function addChat(projectId, text, senderId, senderName, systemPrompt = null, useSubcollection = false) {
  const chat = new Chat(projectId, text, senderId, senderName, systemPrompt);
  const chatData = chat.toFirestore();

  if (useSubcollection) {
    return addSubdocument(COLLECTIONS.USER_PROJECTS, projectId, 'chatMessages', {
      senderId,
      senderName,
      text,
      timestamp: chat.timestamp,
      ...(systemPrompt && senderId.startsWith('ai_') ? { systemPrompt } : {}),
    });
  } else {
    // Legacy mode
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
    // Ensure project exists
    await ensureProjectExists(projectIdString);
    // Get chats from subcollection
    return getSubdocuments(COLLECTIONS.USER_PROJECTS, projectIdString, 'chatMessages');
  } else {
    // Legacy mode
    return queryDocuments(COLLECTIONS.CHAT, {
      filters: [{ field: 'projectId', op: '==', value: projectIdString }],
      orderBy: [{ field: 'timestamp', direction: 'desc' }],
    });
  }
}

// --- UserProject-Specific Wrappers ---

export async function updateUserProject(projectId, content, grade, status = 'submitted') {
  const finalReport = {
    content: content,
    submittedAt: Date.now(),
  };
  await ensureProjectExists(projectId);
  return updateDocument(COLLECTIONS.USER_PROJECTS, projectId, {
    finalReport,
    grade: grade,
    status,
  });
}

export async function addTasks(projectId, userId, projectTitle, status, deliverables = []) {
  console.log('[LocalStorage] addTasks called');
  await ensureProjectExists(projectId);

  let completedAt = 0;
  if (status === 'done') completedAt = Date.now();

  const promises = deliverables.map((item) => {
    const description = item?.deliverable ?? item?.description ?? '';
    const assignee = (item && item.assignedTo) ? String(item.assignedTo) : String(userId);
    const priority = (item && typeof item.priority === 'number')
      ? item.priority
      : Task.PRIORITY.MEDIUM.value;

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
    return addSubdocument(COLLECTIONS.USER_PROJECTS, projectId, 'tasks', newDeliverable);
  });

  const results = await Promise.all(promises);
  console.log('[LocalStorage] All tasks saved, count:', results.length);
  return results;
}

export async function updateTask(projectId, id, title, status, userId, description, priority) {
  // The collectionName for setDocument is just the subcollection path
  const collectionName = `${COLLECTIONS.USER_PROJECTS}/${projectId}/tasks`;
  let completedAt = 0;
  if (status === 'done') completedAt = Date.now();

  const data = {
    title: title,
    status: status,
    description: description,
    completedAt: completedAt,
    priority: priority,
  };

  console.log('[LocalStorage] updateTask payload:', JSON.stringify(data, null, 2));

  // We need a custom setDocument for subcollections
  const db = _getDb();
  if (!db[COLLECTIONS.USER_PROJECTS]?.[projectId]?.['tasks']) {
    console.warn(`[LocalStorage] Subcollection for updateTask not found, creating.`);
    await ensureProjectExists(projectId);
    db[COLLECTIONS.USER_PROJECTS][projectId]['tasks'] = {};
  }
  
  const existing = db[COLLECTIONS.USER_PROJECTS][projectId]['tasks'][id] || {};
  const doc = { ...existing, ...data, id };
  db[COLLECTIONS.USER_PROJECTS][projectId]['tasks'][id] = doc;
  
  _saveDb(db);
  return _asyncDelay({ ...doc });
}

export async function deleteTask(projectId, taskId) {
  console.log(`[LocalStorage] Deleting task '${taskId}' from project '${projectId}'`);
  const db = _getDb();
  let deleted = false;
  
  if (db[COLLECTIONS.USER_PROJECTS]?.[projectId]?.['tasks']?.[taskId]) {
    delete db[COLLECTIONS.USER_PROJECTS][projectId]['tasks'][taskId];
    deleted = true;
  }

  if (deleted) {
    _saveDb(db);
  }
  return _asyncDelay({ id: taskId });
}

export async function ensureProjectExists(projectId, userId = 'default_user', templateId = 'default_template', title = null) {
  const db = _getDb();
  const collection = db[COLLECTIONS.USER_PROJECTS];
  
  if (!collection[projectId]) {
    console.log(`[LocalStorage] Project ${projectId} not found, creating it`);
    collection[projectId] = {
      id: projectId,
      userId,
      templateId,
      title: title || `Project ${projectId}`,
      status: 'in-progress',
      startDate: Date.now(),
      tasks: {}, // Initialize subcollections
      chatMessages: {}, // Initialize subcollections
      teammates: {}, // Initialize subcollections
    };
    _saveDb(db);
    return _asyncDelay({ id: projectId, created: true });
  }

  return _asyncDelay({ id: projectId, created: false });
}

export async function createProject(userId, userName, title) {
  console.log(`[LocalStorage] Creating new project for user ${userId}`);
  // Set existing active project to inactive
  const activeProject = await getActiveProject(userId);
  if (activeProject) {
    await updateDocument(COLLECTIONS.USER_PROJECTS, activeProject.id, {
      isActive: false,
      status: 'inactive',
    });
  }

  const projectRef = { id: _uuid() }; // Mock ref
  const projectData = {
    id: projectRef.id,
    userId: userId,
    title: title,
    status: 'active',
    isActive: true,
    startDate: Date.now(),
    team: [{
      id: userId,
      name: userName,
      role: 'owner',
    }],
    tasks: {}, // Initialize subcollections
    chatMessages: {}, // Initialize subcollections
    teammates: {}, // Initialize subcollections
  };

  // Use setDocument to create with specific ID
  await setDocument(COLLECTIONS.USER_PROJECTS, projectRef.id, projectData);
  await updateUserActiveProject(userId, projectRef.id);

  console.log(`[LocalStorage] Created new active project ${projectRef.id}`);
  return _asyncDelay(projectRef.id);
}

export async function getUserProjects(userId) {
  console.log(`[LocalStorage] Getting projects for user: ${userId}`);
  const db = _getDb();
  const projects = Object.values(db[COLLECTIONS.USER_PROJECTS] || {});
  const userProjects = projects.filter(p => p.userId === userId);
  console.log(`[LocalStorage] Total projects found: ${userProjects.length}`);
  return _asyncDelay(userProjects.map(p => ({ ...p })));
}

export async function getNotifications(userId) {
  console.log(`[LocalStorage] Getting notifications for user: ${userId}`);
  return getSubdocuments(COLLECTIONS.USERS, userId, 'notifications', {}, 'sentAt');
}

export async function getLateTasks(id, userId) {
  console.warn('[LocalStorage] getLateTasks is not fully implemented, returning empty array.');
  // This is complex logic to replicate.
  // A simple mock:
  return _asyncDelay([]);
}

export async function pushNotification(userId, type, message) {
  console.log(`[LocalStorage] Pushing notification for user: ${userId}`);
  const notif = {
    type: type,
    message: message,
    sentAt: Date.now(),
  };
  return addSubdocument(COLLECTIONS.USERS, userId, 'notifications', notif);
}

export async function clearNotifications(userId) {
  console.log(`[LocalStorage] Clearing notifications for user: ${userId}`);
  const db = _getDb();
  if (db[COLLECTIONS.USERS]?.[userId]?.['notifications']) {
    db[COLLECTIONS.USERS][userId]['notifications'] = {};
    _saveDb(db);
  }
  return _asyncDelay(null);
}

export async function getProjectWithTasks(projectId, userId) {
  console.log(`[LocalStorage] Looking for project ${projectId} for user ${userId}`);
  const project = await getDocumentById(COLLECTIONS.USER_PROJECTS, projectId);

  if (!project) {
    console.log(`[LocalStorage] Project ${projectId} does not exist`);
    return _asyncDelay(null);
  }

  if (project.userId !== userId) {
    console.log(`[LocalStorage] Access denied: Project ${projectId} belongs to ${project.userId}`);
    return _asyncDelay(null);
  }
  
  const db = _getDb();
  const tasks = Object.values(db[COLLECTIONS.USER_PROJECTS]?.[projectId]?.['tasks'] || {});
  const teammates = Object.values(db[COLLECTIONS.USER_PROJECTS]?.[projectId]?.['teammates'] || {});
  
  console.log(`[LocalStorage] Found project ${projectId} with ${tasks.length} total tasks`);

  let updatedProjectData = { ...project };
  if (teammates.length > 0) {
    updatedProjectData.team = teammates;
  }

  return _asyncDelay({
    project: updatedProjectData,
    tasks: tasks.map(t => ({ ...t })),
  });
}

export async function updateUserActiveProject(userId, projectId) {
  console.log(`[LocalStorage] Updating active project for user ${userId} to ${projectId}`);
  return updateDocument(COLLECTIONS.USERS, userId, {
    activeProjectId: projectId,
  });
}

export async function activateProject(userId, projectId) {
  console.log(`[LocalStorage] Activating project ${projectId} for user ${userId}`);
  const activeProject = await getActiveProject(userId);

  await updateDocument(COLLECTIONS.USER_PROJECTS, projectId, {
    isActive: true,
    status: 'active',
  });

  if (activeProject && activeProject.id !== projectId) {
    await updateDocument(COLLECTIONS.USER_PROJECTS, activeProject.id, {
      isActive: false,
      status: 'inactive',
    });
  }

  await updateUserActiveProject(userId, projectId);
  return _asyncDelay({ success: true });
}

export async function getUserMessageCountSince(projectId, userId, projectStartDate, currentDay) {
  const now = Date.now();
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
  console.log(`[LocalStorage] Counting messages for user ${userId} in project ${projectId} since ${new Date(twentyFourHoursAgo).toISOString()}`);

  const db = _getDb();
  const messages = Object.values(db[COLLECTIONS.USER_PROJECTS]?.[String(projectId)]?.['chatMessages'] || {});
  
  const count = messages.filter(msg => 
    msg.senderId === userId && (msg.timestamp || 0) >= twentyFourHoursAgo
  ).length;

  console.log(`[LocalStorage] Found ${count} user messages in last 24 hours`);
  return _asyncDelay(count);
}

// --- Project Management Rules ---

export async function canCreateNewProject(userId) {
  const projects = await getUserProjects(userId);
  const canCreate = projects.length < PROJECT_RULES.MAX_TOTAL_PROJECTS;
  console.log(`[LocalStorage] Can create new project: ${canCreate} (${projects.length}/${PROJECT_RULES.MAX_TOTAL_PROJECTS})`);
  return _asyncDelay(canCreate);
}

export async function getActiveProject(userId) {
  const projects = await getUserProjects(userId);
  const active = projects.find(p => p.isActive === true && !p.archivedAt);
  return _asyncDelay(active || null);
}

export async function getInactiveProjects(userId) {
  const projects = await getUserProjects(userId);
  const inactive = projects.filter(p => p.isActive === false && !p.archivedAt);
  console.log(`[LocalStorage] Found ${inactive.length} inactive projects`);
  return _asyncDelay(inactive);
}

export async function getArchivedProjects(userId) {
  const projects = await getUserProjects(userId);
  const archived = projects.filter(p => p.status === 'archived');
  console.log(`[LocalStorage] Found ${archived.length} archived projects`);
  return _asyncDelay(archived);
}

export async function archiveProject(projectId, userId) {
  console.log(`[LocalStorage] Archiving project ${projectId}`);
  const project = await getDocumentById(COLLECTIONS.USER_PROJECTS, projectId);
  if (!project || project.userId !== userId) {
    throw new Error('Project not found or access denied');
  }

  const archivedAt = Date.now();
  await updateDocument(COLLECTIONS.USER_PROJECTS, projectId, {
    isActive: false,
    status: 'archived',
    archivedAt: archivedAt,
  });

  const user = await getDocumentById(COLLECTIONS.USERS, userId);
  if (user && user.activeProjectId === projectId) {
    await updateDocument(COLLECTIONS.USERS, userId, {
      activeProjectId: null,
    });
  }

  return _asyncDelay({ success: true, message: 'Project archived successfully' });
}

export async function createAITemplate(aiProject, topic) {
  console.log(`[LocalStorage] Creating AI template for topic: ${topic}`);
  const templateData = {
    title: aiProject.title,
    description: aiProject.description,
    durationDays: PROJECT_RULES.DEFAULT_DEADLINE_DAYS,
    managerName: 'Alex',
    deliverables: aiProject.deliverables || [],
    availableTeammates: ['Rasoa', 'Rakoto'],
    topic: topic,
    aiGenerated: true,
    createdAt: Date.now(),
    isReusable: true, // Assuming AI templates are reusable
    usageCount: 0,
    usedBy: [],
  };
  const doc = await addDocument(COLLECTIONS.PROJECT_TEMPLATES, templateData);
  return _asyncDelay(doc.id);
}

export async function createAIGeneratedProject(userId, userName, topic, aiProject, existingTemplateId = null) {
  console.log(`[LocalStorage] Creating AI-generated project for topic: ${topic}`);
  const canCreate = await canCreateNewProject(userId);
  if (!canCreate) {
    throw new Error('Maximum number of projects reached. Please archive a project first.');
  }

  const activeProject = await getActiveProject(userId);
  if (activeProject) {
    await updateDocument(COLLECTIONS.USER_PROJECTS, activeProject.id, {
      isActive: false,
      status: 'inactive',
    });
  }

  let templateId;
  if (existingTemplateId) {
    templateId = existingTemplateId;
  } else {
    templateId = await createAITemplate(aiProject, topic);
  }
  
  await updateTemplateUsage(templateId, userId); // Track usage

  const projectRef = { id: _uuid() };
  const deadline = Date.now() + (PROJECT_RULES.DEFAULT_DEADLINE_DAYS * 24 * 60 * 60 * 1000);

  const projectData = {
    id: projectRef.id,
    userId: userId,
    templateId: templateId,
    title: aiProject.title,
    status: 'active',
    isActive: true,
    startDate: Date.now(),
    deadline: deadline,
    aiGenerated: true,
    topic: topic,
    description: aiProject.description,
    team: [{
      id: userId,
      name: userName,
      role: 'owner',
    }],
    tasks: {},
    chatMessages: {},
    teammates: {},
  };
  
  await setDocument(COLLECTIONS.USER_PROJECTS, projectRef.id, projectData);
  await updateUserActiveProject(userId, projectRef.id);
  
  return _asyncDelay(projectRef.id);
}

export async function getProjectWithTemplate(projectId, userId) {
  const project = await getDocumentById(COLLECTIONS.USER_PROJECTS, projectId);
  if (!project || project.userId !== userId) {
    return _asyncDelay(null);
  }

  const template = await getDocumentById(COLLECTIONS.PROJECT_TEMPLATES, project.templateId);
  
  return _asyncDelay({
    project: project,
    template: template,
  });
}

export async function getUserProjectsWithTemplates(userId) {
  const projects = await getUserProjects(userId);
  const projectsWithTemplates = [];

  for (const project of projects) {
    const template = await getDocumentById(COLLECTIONS.PROJECT_TEMPLATES, project.templateId);
    
    // Get teammates from subcollection
    const db = _getDb();
    const teammates = Object.values(db[COLLECTIONS.USER_PROJECTS]?.[project.id]?.['teammates'] || {});
    const teamData = teammates.length > 0 ? teammates : (project.team || []);

    const mergedProject = {
      ...project,
      description: template?.description || '',
      managerName: template?.managerName || '',
      team: teamData,
      durationDays: template?.durationDays,
      deliverables: template?.deliverables || [],
      availableTeammates: template?.availableTeammates || [],
      topic: template?.topic,
      aiGenerated: template?.aiGenerated || false,
    };
    projectsWithTemplates.push(mergedProject);
  }
  
  return _asyncDelay(projectsWithTemplates);
}

// --- Template Reuse Functions ---

export async function getUnusedTemplatesForTopic(topic, userId) {
  console.log(`[LocalStorage] Looking for unused templates for topic: ${topic}, user: ${userId}`);
  const templates = await getDocuments(COLLECTIONS.PROJECT_TEMPLATES, { 
    topic: topic,
    isReusable: true,
  });
  
  const unusedTemplates = templates.filter(template => {
    const usedBy = template.usedBy || [];
    return !usedBy.includes(userId);
  });
  
  console.log(`[LocalStorage] Found ${unusedTemplates.length} unused templates`);
  return _asyncDelay(unusedTemplates);
}

export async function getLeastUsedTemplatesForTopic(topic, limit = 3) {
  console.log(`[LocalStorage] Looking for least-used templates for topic: ${topic}`);
  const templates = await getDocuments(COLLECTIONS.PROJECT_TEMPLATES, { 
    topic: topic,
    isReusable: true,
  });

  const sortedTemplates = templates
    .sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0))
    .slice(0, limit);
    
  console.log(`[LocalStorage] Found ${sortedTemplates.length} least-used templates`);
  return _asyncDelay(sortedTemplates);
}

export async function updateTemplateUsage(templateId, userId) {
  console.log(`[LocalStorage] Updating template usage for template: ${templateId}, user: ${userId}`);
  const template = await getDocumentById(COLLECTIONS.PROJECT_TEMPLATES, templateId);
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }
  
  const usedBy = template.usedBy || [];
  const usageCount = template.usageCount || 0;
  
  if (!usedBy.includes(userId)) {
    usedBy.push(userId);
  }
  
  await updateDocument(COLLECTIONS.PROJECT_TEMPLATES, templateId, {
    usedBy: usedBy,
    usageCount: usageCount + 1,
    lastUsed: Date.now(),
  });
  
  console.log(`[LocalStorage] Updated template usage: ${usageCount + 1} total uses`);
  return _asyncDelay(null);
}
