// conversationMemory.js - Memory module for storing conversation history

// In-memory conversation cache for each project
// Structure: Map<projectId, Map<day, Array<message>>>
const conversationMemory = new Map();

/**
 * Store a message in the conversation memory
 * @param {string} projectId - Project ID
 * @param {number} day - Current project day
 * @param {Object} message - The message object to store
 */
export function storeMessage(projectId, day, message) {
  // Initialize maps if they don't exist
  if (!conversationMemory.has(projectId)) {
    conversationMemory.set(projectId, new Map());
  }
  
  const projectMemory = conversationMemory.get(projectId);
  if (!projectMemory.has(day)) {
    projectMemory.set(day, []);
  }
  
  // Add the message to the memory
  const dayMemory = projectMemory.get(day);
  dayMemory.push(message);
  
  // Limit to last 50 messages per day to prevent memory bloat
  if (dayMemory.length > 50) {
    projectMemory.set(day, dayMemory.slice(-50));
  }
  
  console.log(`[Memory] Stored message for project ${projectId}, day ${day}. Memory size: ${dayMemory.length}`);
}

/**
 * Retrieve conversation history for a project and day
 * @param {string} projectId - Project ID
 * @param {number} day - Current project day
 * @param {number} [limit=15] - Maximum number of messages to retrieve
 * @returns {Array} Array of message objects
 */
export function getConversationHistory(projectId, day, limit = 15) {
  if (!conversationMemory.has(projectId)) {
    return [];
  }
  
  const projectMemory = conversationMemory.get(projectId);
  if (!projectMemory.has(day)) {
    return [];
  }
  
  const dayMemory = projectMemory.get(day);
  return dayMemory.slice(-limit);
}

/**
 * Get a summary of the conversation for the given project and day
 * @param {string} projectId - Project ID
 * @param {number} day - Project day
 * @returns {string} Formatted conversation summary
 */
export function getConversationSummary(projectId, day) {
  const history = getConversationHistory(projectId, day);
  if (history.length === 0) {
    return 'No previous conversation recorded for today.';
  }
  
  return history
    .map(msg => `${msg.senderName}: ${msg.content || msg.text}`)
    .join('\n');
}

/**
 * Get conversation history across multiple days (for context continuity)
 * @param {string} projectId - Project ID
 * @param {number} currentDay - Current project day
 * @param {number} daysBack - How many previous days to include (default: 2)
 * @param {number} [limit=20] - Maximum total messages to retrieve
 * @returns {Array} Array of message objects with day information
 */
export function getMultiDayHistory(projectId, currentDay, daysBack = 2, limit = 20) {
  if (!conversationMemory.has(projectId)) {
    return [];
  }
  
  const projectMemory = conversationMemory.get(projectId);
  const allMessages = [];
  
  // Collect messages from current day and previous days
  for (let day = Math.max(1, currentDay - daysBack); day <= currentDay; day++) {
    if (projectMemory.has(day)) {
      const dayMessages = projectMemory.get(day);
      // Add day information to each message
      dayMessages.forEach(msg => {
        allMessages.push({
          ...msg,
          day: day,
          isToday: day === currentDay
        });
      });
    }
  }
  
  // Return the most recent messages up to the limit
  return allMessages.slice(-limit);
}

/**
 * Get a formatted summary across multiple days
 * @param {string} projectId - Project ID
 * @param {number} currentDay - Current project day
 * @param {number} daysBack - How many previous days to include
 * @returns {string} Formatted conversation summary with day markers
 */
export function getMultiDaySummary(projectId, currentDay, daysBack = 2) {
  const history = getMultiDayHistory(projectId, currentDay, daysBack);
  
  if (history.length === 0) {
    return 'No previous conversation recorded.';
  }
  
  let summary = '';
  let lastDay = null;
  
  history.forEach(msg => {
    // Add day marker when day changes
    if (msg.day !== lastDay) {
      if (summary) summary += '\n';
      summary += `\n--- Day ${msg.day} ${msg.isToday ? '(Today)' : ''} ---\n`;
      lastDay = msg.day;
    }
    summary += `${msg.senderName}: ${msg.content || msg.text}\n`;
  });
  
  return summary;
}

/**
 * Get key decisions or important points from previous days
 * @param {string} projectId - Project ID
 * @param {number} currentDay - Current project day
 * @returns {Array} Array of important messages from previous days
 */
export function getPreviousDaysContext(projectId, currentDay) {
  if (!conversationMemory.has(projectId)) {
    return [];
  }
  
  const projectMemory = conversationMemory.get(projectId);
  const importantMessages = [];
  
  // Look at previous days only (not current day)
  for (let day = 1; day < currentDay; day++) {
    if (projectMemory.has(day)) {
      const dayMessages = projectMemory.get(day);
      // Get last few messages from each previous day (key decisions)
      const keyMessages = dayMessages.slice(-3).map(msg => ({
        ...msg,
        day: day
      }));
      importantMessages.push(...keyMessages);
    }
  }
  
  // Return the most recent important messages
  return importantMessages.slice(-10);
}

/**
 * Clear conversation memory for testing purposes
 * @param {string} [projectId] - Optional project ID to clear only that project
 */
export function clearMemory(projectId = null) {
  if (projectId) {
    conversationMemory.delete(projectId);
  } else {
    conversationMemory.clear();
  }
}

export default {
  storeMessage,
  getConversationHistory,
  getConversationSummary,
  getMultiDayHistory,
  getMultiDaySummary,
  getPreviousDaysContext,
  clearMemory
};