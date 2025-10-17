/**
 * Database Schema for hAIra
 * 
 * Collection: messages
 * Document Structure:
 * {
 *   projectId: string,      // ID of the project this message belongs to
 *   content: string,         // The message content/text
 *   timestamp: number        // Unix timestamp (milliseconds)
 * }
 * 
 * Indexes needed:
 * - projectId (for querying messages by project)
 * - timestamp (for ordering messages chronologically)
 */

export const COLLECTIONS = {
  MESSAGES: 'messages'
};

export const MESSAGE_SCHEMA = {
  projectId: 'string',
  content: 'string',
  timestamp: 'number'
};
