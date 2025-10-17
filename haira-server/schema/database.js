// Database Collections and Schema Definitions

export const COLLECTIONS = {
  CHAT: 'chats'
};

// Schema for Chat documents
export const CHAT_SCHEMA = {
  projectId: String,  // ID of the project this chat belongs to
  senderId: String,   // ID of the sender ('user_1' for users or 'ai_1' for AI)
  senderName: String, // Name of the sender
  text: String,       // Message content
  timestamp: Number,  // Message timestamp
  systemPrompt: String // System prompt used for AI messages (only stored with AI messages)
};
