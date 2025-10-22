// taskMemory.js - Memory module for storing project tasks and information

// In-memory task cache for each project
// Structure: Map<projectId, { tasks: Array<task>, projectInfo: Object }>
const taskMemory = new Map();

/**
 * Store project tasks and information in memory
 * @param {string} projectId - Project ID
 * @param {Array} tasks - Array of task objects
 * @param {Object} projectInfo - Project information object
 */
export function storeProjectData(projectId, tasks = [], projectInfo = {}) {
  taskMemory.set(projectId, {
    tasks: tasks || [],
    projectInfo: projectInfo || {},
    lastUpdated: Date.now()
  });
  
  console.log(`[TaskMemory] Stored project data for ${projectId}. Tasks: ${tasks.length}, Project title: ${projectInfo?.title || 'Unknown'}`);
}

/**
 * Retrieve tasks for a specific project
 * @param {string} projectId - Project ID
 * @returns {Array} Array of task objects or empty array if not found
 */
export function getProjectTasks(projectId) {
  const projectData = taskMemory.get(projectId);
  if (!projectData) {
    return [];
  }
  
  return projectData.tasks || [];
}

/**
 * Get project information for a specific project
 * @param {string} projectId - Project ID
 * @returns {Object} Project information object or empty object if not found
 */
export function getProjectInfo(projectId) {
  const projectData = taskMemory.get(projectId);
  if (!projectData) {
    return {};
  }
  
  return projectData.projectInfo || {};
}

/**
 * Format tasks for AI context
 * @param {string} projectId - Project ID
 * @returns {string} Formatted task list for AI context
 */
export function formatTasksForAI(projectId) {
  const tasks = getProjectTasks(projectId);
  if (!tasks || tasks.length === 0) {
    return 'TASKS: No specific tasks have been defined for this project yet.';
  }
  
  const tasksByStatus = {
    todo: [],
    inprogress: [],
    review: [],
    done: []
  };
  
  // Group tasks by status
  tasks.forEach(task => {
    const status = task.status?.toLowerCase().replace(/[\s-]/g, '') || 'todo';
    if (tasksByStatus[status]) {
      tasksByStatus[status].push(task);
    } else {
      tasksByStatus.todo.push(task);
    }
  });
  
  // Format tasks by status
  let formattedTasks = 'TASKS:\n';
  
  if (tasksByStatus.todo.length > 0) {
    formattedTasks += '📋 To Do:\n' + 
      tasksByStatus.todo.map(t => `- ${t.text || t.description || t.title}`).join('\n') + '\n\n';
  }
  
  if (tasksByStatus.inprogress.length > 0) {
    formattedTasks += '🔄 In Progress:\n' + 
      tasksByStatus.inprogress.map(t => `- ${t.text || t.description || t.title}`).join('\n') + '\n\n';
  }
  
  if (tasksByStatus.review.length > 0) {
    formattedTasks += '👀 In Review:\n' + 
      tasksByStatus.review.map(t => `- ${t.text || t.description || t.title}`).join('\n') + '\n\n';
  }
  
  if (tasksByStatus.done.length > 0) {
    formattedTasks += '✅ Done:\n' + 
      tasksByStatus.done.map(t => `- ${t.text || t.description || t.title}`).join('\n') + '\n\n';
  }
  
  return formattedTasks;
}

/**
 * Extract tasks from chat history
 * @param {Array} chatMessages - Array of chat messages
 * @returns {Array} Extracted tasks
 */
export function extractTasksFromChat(chatMessages) {
  const taskRegex = /task[s]?:?\s*(.+?)(?:\.|$)/i;
  const tasks = [];
  
  chatMessages.forEach(msg => {
    const content = msg.content || msg.text || '';
    const matches = content.match(taskRegex);
    
    if (matches && matches[1]) {
      tasks.push({
        text: matches[1].trim(),
        status: 'todo',
        source: 'chat',
        messageId: msg.id || null,
        extractedAt: Date.now()
      });
    }
  });
  
  return tasks;
}

/**
 * Clear task memory for a project
 * @param {string} [projectId] - Optional project ID to clear only that project
 */
export function clearTaskMemory(projectId = null) {
  if (projectId) {
    taskMemory.delete(projectId);
  } else {
    taskMemory.clear();
  }
}

export default {
  storeProjectData,
  getProjectTasks,
  getProjectInfo,
  formatTasksForAI,
  extractTasksFromChat,
  clearTaskMemory
};