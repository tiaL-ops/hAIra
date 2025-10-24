// Database Collections and Schema Definitions

export const COLLECTIONS = {
  USERS: 'users',
  PROJECT_TEMPLATES: 'projectTemplates',
  USER_PROJECTS: 'userProjects',
  CHAT: 'chats' // Legacy collection - will be migrated to subcollections
};

// Schema for User documents
export const USER_SCHEMA = {
  // --- Basic Info ---
  name: String,           // User's display name
  email: String,          // User's email address
  avatarUrl: String,      // Profile picture (base64 or URL)
  
  // --- State ---
  activeProjectId: String, // Reference to user's current active project
  
  // --- Profile Summary ---
  summary: {
    xp: Number,                 // Total XP (sum of all grades)
    level: Number,              // Calculated from XP
    totalProjectsCompleted: Number,
    averageGrade: Number,
    achievements: Array         // e.g. ["first_project", "team_leader"]
  },
  
  // --- User Settings ---
  preferences: {
    language: String            // 'en' | 'fr'
  }
};

// Schema for Project Template documents
export const PROJECT_TEMPLATE_SCHEMA = {
  title: String,        // Template name (e.g., "Product Design")
  description: String,  // Description of the project
  topic: String, // Project topic
  durationDays: Number, // Expected duration in days
  managerName: String,  // Name of the AI project manager
  deliverables: Array,  // Array of required deliverables
  availableTeammates: Array, // Array of AI teammates that can be selected
  createdAt: Number, // Timestamp when the template was created
  
  // Template Reuse Tracking
  usedBy: Array,        // Array of user IDs who have used this template
  usageCount: Number,   // Total number of times this template has been used
  lastUsed: Number,     // Timestamp of last usage (null if never used)
  isReusable: Boolean,  // Whether this template can be reused (default: true)
  maxReuses: Number     // Maximum number of reuses allowed (null for unlimited)
};

// Schema for User Project documents (instances of templates)
export const USER_PROJECT_SCHEMA = {
  userId: String,     // Reference to the user who owns this project
  templateId: String, // Reference to the template this project is based on
  title: String,      // Project title (copied from template)
  status: String,     // Project status (e.g., "started", "in-progress", "submitted", "graded")
  startDate: Number,  // Timestamp when project was started
  dailyMeetingTime: String, // Preferred meeting time
  team: Array,        // Array of team members (user and AI)

  // NEW FIELDS FOR PROJECT MANAGEMENT
  isActive: Boolean,     // true for active project, false for archived
  deadline: Number,      // 7-day deadline timestamp
  archivedAt: Number,    // When project was archived (null if not archived)

  draftReport: {      // Draft project report (autosaved)
    content: String,
    lastSaved: Number
  },
  finalReport: {      // Final project submission
    content: String,
    submittedAt: Number
  },
  finalReflection: String, // AI-generated reflection
  reflectionUpdatedAt: Number, // When reflection was last updated
  grade: {            // Project evaluation
    overall: Number,
    workPercentage: Number,
    responsiveness: Number,
    reportQuality: Number
  }
};

// Schema for Chat Message documents (subcollection of userProjects)
export const CHAT_MESSAGE_SCHEMA = {
  senderId: String,   // ID of the sender ('user', 'rasoa', 'rakoto')
  senderName: String, // Display name of the sender
  senderType: String, // Type of sender ('human' or 'ai')
  text: String,       // Message content
  timestamp: Number,  // Message timestamp
  reaction: String,   // Optional AI reaction to messages
  systemPrompt: String, // System prompt used for AI messages (only stored with AI messages)
  isActiveHours: Boolean, // Whether message was sent during AI active hours
  messageType: String // Type of message ('regular', 'checkin', 'sleep_response')
};

// Schema for Task documents (subcollection of userProjects)
export const TASK_SCHEMA = {
  title: String,      // Task title
  assignedTo: String, // User or AI ID this task is assigned to
  status: String,     // Task status (e.g., "todo", "in-progress", "done")
  description: String, // Detailed description of the task
  createdAt: Number,  // Timestamp when task was created
  completedAt: Number, // Timestamp when task was completed
  priority: Number    // 1: Low, 2: Medium, 3: High, 4: Very very high-Fatal
};

// Legacy schema for Chat documents (to be migrated, do not mind this part)
export const CHAT_SCHEMA = {
  projectId: String,  // ID of the project this chat belongs to
  senderId: String,   // ID of the sender ('user_1' for users or 'ai_1' for AI)
  senderName: String, // Name of the sender
  text: String,       // Message content
  timestamp: Number,  // Message timestamp
  systemPrompt: String // System prompt used for AI messages (only stored with AI messages)
};


// ...existing code...

// Schema for Teammate documents (subcollection of userProjects)
export const TEAMMATE_SCHEMA = {
  // --- Identity ---
  id: String,                  // Unique teammate ID ('ai_manager', 'ai_helper', or userId)
  name: String,                // Display name (e.g., "Alex (Project Manager)", "Landy RAKOTOARISON")
  type: String,                // Teammate type: 'ai' | 'human'
  role: String,                // Role in project (e.g., "Project Manager", "owner", "AI Team Member")
  
  // --- UI Properties ---
  avatar: String,              // Avatar path or URL (e.g., "/src/images/Alex.png")
  color: String,               // Color code for UI display (e.g., "#9b59b6")
  
  // --- AI Configuration (null for human teammates) ---
  config: {
    maxTokens: Number,         // Max tokens for AI response (e.g., 50)
    temperature: Number,       // AI temperature setting (e.g., 0.7)
    emoji: String,             // Representative emoji (e.g., "🧠")
    personality: String,       // Personality traits (e.g., "organized, deadline-focused")
    prompt: String,            // Full system prompt for AI agent
    isActive: Boolean,         // Whether AI agent is currently active
    activeDays: Array,         // Days when AI is active (e.g., [1, 3, 6]) - null for humans
    activeHours: {             // Hours when AI is active - null for humans
      start: Number,           // Start hour in UTC (e.g., 9)
      end: Number              // End hour in UTC (e.g., 18)
    },
    maxMessagesPerDay: Number, // Daily message limit (e.g., 2 for Alex) - null for unlimited
    sleepResponses: Array      // Array of responses when AI is offline - null for humans
  },
  
  // --- Current State (dynamic data) ---
  state: {
    status: String,            // Current status: 'online' | 'offline' | 'busy'
    currentTask: String,       // ID of current task being worked on (null if none)
    assignedTasks: Array,      // Array of task IDs currently assigned to this teammate
    lastActive: Number,        // Timestamp of last activity
    messagesLeftToday: Number  // Remaining daily message quota (resets at midnight)
  },
  
  // --- Statistics (incremental counters) ---
  stats: {
    tasksAssigned: Number,     // Total number of tasks ever assigned
    tasksCompleted: Number,    // Total number of tasks completed
    messagesSent: Number,      // Total number of messages sent
    wordsContributed: Number   // Total words contributed to report (synced with wordContributions)
  },
  
  // --- Timestamps ---
  createdAt: Number,           // Timestamp when teammate was added to project
  updatedAt: Number            // Timestamp of last update to this document
};