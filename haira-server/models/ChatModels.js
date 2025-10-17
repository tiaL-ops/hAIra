import { CHAT_SCHEMA } from '../schema/database.js';

class Chat {
  constructor(projectId, text, senderId, senderName, systemPrompt = null, timestamp = Date.now()) {
    this.projectId = projectId;
    this.text = text;
    this.senderId = senderId;
    this.senderName = senderName;
    this.timestamp = timestamp;
    
    // Only include systemPrompt for AI messages
    if (systemPrompt && senderId === 'ai_1') {
      this.systemPrompt = systemPrompt;
    }
  }

  toFirestore() {
    // Always use schema from database.js
    const doc = {};
    for (const key of Object.keys(CHAT_SCHEMA)) {
      if (this[key] !== undefined) {
        doc[key] = this[key];
      }
    }
    return doc;
  }

  static fromFirestore(snapshot) {
    const data = snapshot.data();
    return new Chat(
      data.projectId, 
      data.text, 
      data.senderId,
      data.senderName, 
      data.systemPrompt, 
      data.timestamp
    );
  }
}

export default Chat;