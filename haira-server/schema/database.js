/**
 * Database Schema for hAIra
 * 
 * Collection: chat
 * Document Structure:
 * {
 *   projectId: string,      // ID of the project this chat belongs to
 *   content: string,         // The chat content/text
 *   timestamp: number        // Unix timestamp (milliseconds)
 * }
 * 
 * Indexes needed:
 * - projectId (for querying chats by project)
 * - timestamp (for ordering chats chronologically)
 */

export const COLLECTIONS = {
  CHAT: 'chat',
  SUMBMISSIONS: 'submissions',
  PROJECTS: 'projects',
  USERS: 'users'
};

export const CHAT_SCHEMA = {
  projectId: 'string',
  content: 'string',
  timestamp: 'number'
};

export const SUBMISSION_SCHEMA = {
  projectId: 'string',
  userId: 'string',
  fileUrl: 'string',
  timestamp: 'number'
};

export const PROJECT_SCHEMA = {
  name: 'string',
  description: 'string',
  createdBy: 'string',
  createdAt: 'number'
};