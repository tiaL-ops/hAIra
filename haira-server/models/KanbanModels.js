import { TASK_SCHEMA } from '../schema/database.js';

class Task {
  constructor(title, assignedTo, status, description, createdAt, completedAt, priority) {
    this.title = title;
    this.assignedTo = assignedTo;
    this.status = status;
    this.description = description;
    this.createdAt = createdAt;
    this.completedAt = completedAt;
    this.priority = priority;
  }

  toFirestore() {
    // Always use schema from database.js
    const doc = {};
    for (const key of Object.keys(TASK_SCHEMA)) {
      if (this[key] !== undefined) {
        doc[key] = this[key];
      }
    }
    return doc;
  }

  static fromFirestore(snapshot) {
    const data = snapshot.data();
    return new Task(
      data.title,
      data.assignedTo,
      data.status,
      data.description,
      data.createdAt,
      data.completedAt,
      data.priority
    );
  }

  static PRIORITY = {
    LOW : {value : 1, name : 'Low'},
    MEDIUM : {value : 2, name : 'Medium'},
    HIGH : {value : 3, name : 'High'},
    VERY_HIGH : {value : 4, name : 'Very High'}
  }
}

export default Task;