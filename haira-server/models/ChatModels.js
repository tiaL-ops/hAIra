import { CHAT_MESSAGE_SCHEMA } from '../schema/database.js';

class ChatMessage {
  constructor(
    projectId, 
    text, 
    senderId, 
    senderName, 
    senderType = 'human',
    systemPrompt = null, 
    timestamp = Date.now(),
    isActiveHours = true,
    messageType = 'regular'
  ) {
    this.projectId = projectId;
    this.text = text;
    this.senderId = senderId;
    this.senderName = senderName;
    this.senderType = senderType;
    this.timestamp = timestamp;
    this.isActiveHours = isActiveHours;
    this.messageType = messageType;
    
    // Only include systemPrompt for AI messages
    if (systemPrompt && senderType === 'ai') {
      this.systemPrompt = systemPrompt;
    }
  }

  toFirestore() {
    // Always use schema from database.js
    const doc = {};
    for (const key of Object.keys(CHAT_MESSAGE_SCHEMA)) {
      if (this[key] !== undefined) {
        doc[key] = this[key];
      }
    }
    return doc;
  }

  static fromFirestore(snapshot) {
    const data = snapshot.data();
    return new ChatMessage(
      data.projectId,
      data.text,
      data.senderId,
      data.senderName,
      data.senderType || 'human',
      data.systemPrompt,
      data.timestamp,
      data.isActiveHours,
      data.messageType || 'regular'
    );
  }
}

export default ChatMessage;