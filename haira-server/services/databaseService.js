/*
 * databaseService.js
 * 
 * Smart wrapper that automatically uses Firebase when available,
 * or falls back to localStorage when Firebase is not available.
 * 
 * This module exports all the same functions as firebaseService.js,
 * but automatically routes them to the correct implementation.
 */

import * as FirebaseService from './firebaseService.js';
import * as LocalStorageService from './localStorageService.js';

// Get Firebase availability flag
const { firebaseAvailable } = FirebaseService;

console.log(firebaseAvailable ? 
  '🔥 Database Service: Using Firebase' : 
  '💾 Database Service: Using localStorage fallback');

// Helper function to route to correct service
function getService() {
  return firebaseAvailable ? FirebaseService : LocalStorageService;
}

// Export all functions, automatically routing to Firebase or localStorage
export const db = firebaseAvailable ? FirebaseService.db : LocalStorageService.db;
export const addDocument = (...args) => getService().addDocument(...args);
export const addSubdocument = (...args) => getService().addSubdocument(...args);
export const setDocument = (...args) => getService().setDocument(...args);
export const updateDocument = (...args) => getService().updateDocument(...args);
export const deleteDocument = (...args) => getService().deleteDocument(...args);
export const getDocumentById = (...args) => getService().getDocumentById(...args);
export const queryDocuments = (...args) => getService().queryDocuments(...args);
export const getDocuments = (...args) => getService().getDocuments(...args);
export const querySubcollection = (...args) => getService().querySubcollection(...args);
export const getSubdocuments = (...args) => getService().getSubdocuments(...args);
export const getChatMessagesByUser = (...args) => getService().getChatMessagesByUser(...args);

// Chat functions
export const addChat = (...args) => getService().addChat(...args);
export const addUserChat = (...args) => getService().addUserChat(...args);
export const addAIChat = (...args) => getService().addAIChat(...args);
export const getChats = (...args) => getService().getChats(...args);

// Project functions
export const updateUserProject = (...args) => getService().updateUserProject(...args);
export const addTasks = (...args) => getService().addTasks(...args);
export const updateTask = (...args) => getService().updateTask(...args);
export const deleteTask = (...args) => getService().deleteTask(...args);
export const ensureProjectExists = (...args) => getService().ensureProjectExists(...args);
export const createProject = (...args) => getService().createProject(...args);
export const getUserProjects = (...args) => getService().getUserProjects(...args);
export const getNotifications = (...args) => getService().getNotifications(...args);
export const getLateTasks = (...args) => getService().getLateTasks(...args);
export const pushNotification = (...args) => getService().pushNotification(...args);
export const clearNotifications = (...args) => getService().clearNotifications(...args);
export const getProjectWithTasks = (...args) => getService().getProjectWithTasks(...args);
export const updateUserActiveProject = (...args) => getService().updateUserActiveProject(...args);
export const activateProject = (...args) => getService().activateProject(...args);
export const getUserMessageCountSince = (...args) => getService().getUserMessageCountSince(...args);

// Project management functions
export const canCreateNewProject = (...args) => getService().canCreateNewProject(...args);
export const getActiveProject = (...args) => getService().getActiveProject(...args);
export const getInactiveProjects = (...args) => getService().getInactiveProjects(...args);
export const getArchivedProjects = (...args) => getService().getArchivedProjects(...args);
export const archiveProject = (...args) => getService().archiveProject(...args);
export const createAITemplate = (...args) => getService().createAITemplate(...args);
export const createAIGeneratedProject = (...args) => getService().createAIGeneratedProject(...args);
export const getProjectWithTemplate = (...args) => getService().getProjectWithTemplate(...args);
export const getUserProjectsWithTemplates = (...args) => getService().getUserProjectsWithTemplates(...args);
export const getUnusedTemplatesForTopic = (...args) => getService().getUnusedTemplatesForTopic(...args);
export const getLeastUsedTemplatesForTopic = (...args) => getService().getLeastUsedTemplatesForTopic(...args);
export const updateTemplateUsage = (...args) => getService().updateTemplateUsage(...args);

// Export the availability flag
export { firebaseAvailable };

