// dailyContextCache.js - Daily context cache for AI agents
// Helps AI agents remember conversations and suggest task updates

import { getConversationHistory } from '../config/conversationMemory.js';

// Daily context cache for each project
// Structure: Map<projectId, Map<day, Object>>
const dailyContextCache = new Map();

/**
 * Store daily context for a project
 * @param {string} projectId - Project ID
 * @param {number} day - Current project day
 * @param {Object} context - Context object to store
 */
export function storeDailyContext(projectId, day, context) {
  if (!dailyContextCache.has(projectId)) {
    dailyContextCache.set(projectId, new Map());
  }
  
  const projectCache = dailyContextCache.get(projectId);
  projectCache.set(day, {
    ...context,
    lastUpdated: Date.now(),
    cachedAt: new Date().toISOString()
  });
}

/**
 * Get daily context for a project
 * @param {string} projectId - Project ID
 * @param {number} day - Current project day
 * @returns {Object|null} Cached context or null
 */
export function getDailyContext(projectId, day) {
  if (!dailyContextCache.has(projectId)) {
    return null;
  }
  
  const projectCache = dailyContextCache.get(projectId);
  return projectCache.get(day) || null;
}

/**
 * Extract potential tasks from conversation
 * @param {Array} messages - Array of conversation messages
 * @returns {Array} Array of potential tasks
 */
export function extractPotentialTasks(messages) {
  const potentialTasks = [];
  
  // Keywords that might indicate tasks
  const taskKeywords = [
    'need to', 'should', 'must', 'have to', 'todo', 'task', 'work on',
    'implement', 'create', 'build', 'develop', 'design', 'fix', 'update',
    'review', 'test', 'deploy', 'setup', 'configure', 'install'
  ];
  
  messages.forEach(message => {
    if (message.senderId === 'user' && message.content) {
      const content = message.content.toLowerCase();
      
      // Check if message contains task indicators
      const hasTaskKeywords = taskKeywords.some(keyword => content.includes(keyword));
      
      if (hasTaskKeywords) {
        potentialTasks.push({
          text: message.content,
          timestamp: message.timestamp,
          suggestedBy: 'conversation_analysis',
          confidence: hasTaskKeywords ? 0.7 : 0.3
        });
      }
    }
  });
  
  return potentialTasks;
}

/**
 * Generate conversation summary for the day
 * @param {string} projectId - Project ID
 * @param {number} day - Current project day
 * @returns {Object} Conversation summary
 */
export function generateConversationSummary(projectId, day) {
  const messages = getConversationHistory(projectId, day, 50);
  
  if (messages.length === 0) {
    return {
      summary: 'No conversations today',
      keyTopics: [],
      potentialTasks: [],
      actionItems: []
    };
  }
  
  // Extract key topics
  const keyTopics = extractKeyTopics(messages);
  
  // Extract potential tasks
  const potentialTasks = extractPotentialTasks(messages);
  
  // Extract action items
  const actionItems = extractActionItems(messages);
  
  // Generate summary
  const summary = generateSummaryText(messages, keyTopics, potentialTasks, actionItems);
  
  return {
    summary,
    keyTopics,
    potentialTasks,
    actionItems,
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1]
  };
}

/**
 * Extract key topics from conversation
 * @param {Array} messages - Array of messages
 * @returns {Array} Array of key topics
 */
function extractKeyTopics(messages) {
  const topics = new Set();
  
  // Common project-related keywords
  const topicKeywords = [
    'feature', 'bug', 'issue', 'requirement', 'specification', 'design',
    'architecture', 'database', 'api', 'frontend', 'backend', 'testing',
    'deployment', 'documentation', 'meeting', 'deadline', 'priority'
  ];
  
  messages.forEach(message => {
    if (message.content) {
      const content = message.content.toLowerCase();
      topicKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          topics.add(keyword);
        }
      });
    }
  });
  
  return Array.from(topics);
}

/**
 * Extract action items from conversation
 * @param {Array} messages - Array of messages
 * @returns {Array} Array of action items
 */
function extractActionItems(messages) {
  const actionItems = [];
  
  const actionKeywords = [
    'action item', 'next steps', 'follow up', 'remind', 'check',
    'verify', 'confirm', 'update', 'notify', 'schedule'
  ];
  
  messages.forEach(message => {
    if (message.content) {
      const content = message.content.toLowerCase();
      actionKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          actionItems.push({
            text: message.content,
            timestamp: message.timestamp,
            suggestedBy: 'action_item_detection'
          });
        }
      });
    }
  });
  
  return actionItems;
}

/**
 * Generate summary text
 * @param {Array} messages - Array of messages
 * @param {Array} keyTopics - Array of key topics
 * @param {Array} potentialTasks - Array of potential tasks
 * @param {Array} actionItems - Array of action items
 * @returns {string} Summary text
 */
function generateSummaryText(messages, keyTopics, potentialTasks, actionItems) {
  const userMessages = messages.filter(m => m.senderId === 'user');
  const aiMessages = messages.filter(m => m.senderId !== 'user');
  
  let summary = `Today's conversation had ${messages.length} messages (${userMessages.length} from user, ${aiMessages.length} from AI team).`;
  
  if (keyTopics.length > 0) {
    summary += ` Key topics discussed: ${keyTopics.join(', ')}.`;
  }
  
  if (potentialTasks.length > 0) {
    summary += ` ${potentialTasks.length} potential tasks were mentioned in conversation.`;
  }
  
  if (actionItems.length > 0) {
    summary += ` ${actionItems.length} action items were identified.`;
  }
  
  return summary;
}

/**
 * Get context cache for AI agent with conversation insights
 * @param {string} projectId - Project ID
 * @param {number} day - Current project day
 * @param {string} agentId - Agent ID
 * @returns {Object} Enhanced context with conversation insights
 */
export function getEnhancedContextCache(projectId, day, agentId) {
  const cachedContext = getDailyContext(projectId, day);
  const conversationSummary = generateConversationSummary(projectId, day);
  
  return {
    ...cachedContext,
    conversationSummary,
    agentId,
    day,
    projectId,
    hasConversationInsights: conversationSummary.potentialTasks.length > 0 || 
                           conversationSummary.actionItems.length > 0
  };
}

/**
 * Clear old context cache (older than 7 days)
 * @param {string} projectId - Project ID
 */
export function clearOldContextCache(projectId) {
  if (!dailyContextCache.has(projectId)) {
    return;
  }
  
  const projectCache = dailyContextCache.get(projectId);
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  for (const [day, context] of projectCache.entries()) {
    if (context.lastUpdated < sevenDaysAgo) {
      projectCache.delete(day);
    }
  }
  
}

/**
 * Get all cached context for a project
 * @param {string} projectId - Project ID
 * @returns {Map} Map of day to context
 */
export function getAllCachedContext(projectId) {
  return dailyContextCache.get(projectId) || new Map();
}