import { USER_SCHEMA } from '../schema/database.js';

class User {
  constructor(
    name,
    email,
    activeProjectId = null,
    summary = {
      xp: 0,
      level: 1,
      totalProjectsCompleted: 0,
      averageGrade: 0,
      achievements: []
    },
    preferences = {
      language: 'en'
    }
  ) {
    this.name = name;
    this.email = email;
    this.activeProjectId = activeProjectId;
    this.summary = summary;
    this.preferences = preferences;
  }

  toFirestore() {
    // Always use schema from database.js
    const doc = {};
    
    for (const key of Object.keys(USER_SCHEMA)) {
      if (this[key] !== undefined) {
        doc[key] = this[key];
      }
    }
    return doc;
  }

  static fromFirestore(snapshot) {
    const data = snapshot.data();
    
    return new User(
      data.name,
      data.email,
      data.activeProjectId || null,
      data.summary || {
        xp: 0,
        level: 1,
        totalProjectsCompleted: 0,
        averageGrade: 0,
        achievements: []
      },
      data.preferences || {
        language: 'en'
      }
    );
  }
  
  // Calculate level based on XP
  static calculateLevel(xp) {
    // Simple level formula: level = sqrt(xp / 100) + 1
    // This means:
    // Level 1: 0 XP
    // Level 2: 100 XP
    // Level 3: 400 XP
    // Level 4: 900 XP
    // And so on...
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }
  
  // Update XP and recalculate level
  updateXP(xp) {
    this.summary.xp = xp;
    this.summary.level = User.calculateLevel(xp);
    return this;
  }
  
  // Add an achievement if not already present
  addAchievement(achievementId) {
    if (!this.summary.achievements.includes(achievementId)) {
      this.summary.achievements.push(achievementId);
    }
    return this;
  }
  
  // Update language preference
  setLanguage(language) {
    if (language === 'en' || language === 'fr') {
      this.preferences.language = language;
    }
    return this;
  }
}

export default User;