// Database Collections and Schema Definitions

export const COLLECTIONS = {
  USERS: 'users',
  PROJECT_TEMPLATES: 'projectTemplates',
  USER_PROJECTS: 'userProjects',
  CHAT: 'chats' // Legacy collection - will be migrated to subcollections
};

// Schema for User documents
export const USER_SCHEMA = {
  name: String,           // User's display name
  email: String,          // User's email address
  activeProjectId: String // Reference to user's current active project
};

// Schema for Project Template documents
export const PROJECT_TEMPLATE_SCHEMA = {
  title: String,        // Template name (e.g., "Product Design")
  description: String,  // Description of the project
  durationDays: Number, // Expected duration in days
  managerName: String,  // Name of the AI project manager
  deliverables: Array,  // Array of required deliverables
  availableTeammates: Array // Array of AI teammates that can be selected
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
  finalReport: {      // Final project submission
    content: String,
    submittedAt: Number
  },
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