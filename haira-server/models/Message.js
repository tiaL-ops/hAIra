class Message {
  constructor(projectId, content, timestamp = Date.now()) {
    this.projectId = projectId;
    this.content = content;
    this.timestamp = timestamp;
  }

  toFirestore() {
    return {
      projectId: this.projectId,
      content: this.content,
      timestamp: this.timestamp
    };
  }

  static fromFirestore(snapshot) {
    const data = snapshot.data();
    return new Message(data.projectId, data.content, data.timestamp);
  }
}

export default Message;