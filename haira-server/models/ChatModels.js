import { CHAT_SCHEMA } from '../schema/database.js';

class Chat {
  constructor(projectId, content, timestamp = Date.now()) {
    this.projectId = String(projectId);  // Ensure projectId is always a string
    this.content = String(content);      // Ensure content is always a string
    this.timestamp = Number(timestamp);  // Ensure timestamp is always a number
  }

  toFirestore() {
    // Always use schema from database.js
    const doc = {};
    for (const key of Object.keys(CHAT_SCHEMA)) {
      doc[key] = this[key];
    }
    return doc;
  }

  static fromFirestore(snapshot) {
    const data = snapshot.data();
    return new Chat(data.projectId, data.content, data.timestamp);
  }
}

export default Chat;