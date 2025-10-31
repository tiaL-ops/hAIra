// contextService.js - Enhanced context management for AI agents
// Ensures AI agents are always aware of project, tasks, and assignments

import { getProjectWithTasks, querySubcollection } from './databaseService.js';
import { AI_AGENTS } from '../config/aiAgents.js';
import { getConversationHistory, getPreviousDaysContext, getMultiDaySummary } from '../config/conversationMemory.js';
import { formatTasksForAI as formatTasksFromMemory, getProjectTasks, getProjectInfo } from '../config/taskMemory.js';

/**
 * Get comprehensive context for AI agents
 * This ensures agents know: project details, their tasks, teammates' tasks, and conversation history
 * 
 * @param {string} projectId - The project ID
 * @param {string} userId - The user ID
 * @param {number} currentDay - Current project day
 * @param {string} agentId - The agent requesting context (alex, rasoa, rakoto)
 * @returns {Promise<Object>} Complete context object
 */
export async function getAgentContext(projectId, userId, currentDay, agentId) {
  
  try {
    // Get project data and tasks from Firebase
    const projectData = await getProjectWithTasks(projectId, userId);
    
    if (!projectData) {
      return buildEmptyContext(agentId, currentDay);
    }
    
    
    
    // Get conversation history from memory (enhanced context)
    const conversationHistory = getConversationHistory(projectId, currentDay, 15);
    const previousDaysContext = getPreviousDaysContext(projectId, currentDay);
    const multiDaySummary = getMultiDaySummary(projectId, currentDay, 2);
    
    const conversationSummary = conversationHistory.length > 0 
      ? conversationHistory.map(msg => `${msg.senderName || 'Unknown'}: ${msg.content || ''}`).join('\n')
      : 'No conversation history yet.';
    
    // Multi-day context includes previous days
    const multiDayHistory = [...previousDaysContext, ...conversationHistory];
    
    // Enhanced conversation summary
    const enhancedConversationSummary = {
      potentialTasks: [],
      actionItems: [],
      keyTopics: []
    };
    
    // Organize tasks by assignee (enhanced with memory)
    const tasksByAssignee = organizeTasksByAssignee(projectData.tasks);
    
    // Get additional task context from memory
    const formattedTasksForAI = formatTasksFromMemory(projectId);
    
    
    // Build agent-specific context
    const context = {
      // Project information
      projectId,
      projectName: projectData.project.title || projectData.project.name || 'Untitled Project',
      projectDescription: projectData.project.description || '',
      startDate: projectData.project.startDate,
      currentDay,
      
      // Agent information
      agentId,
      agentName: AI_AGENTS[agentId]?.name || agentId,
      agentRole: AI_AGENTS[agentId]?.role || 'Team Member',
      
      // Task context
      allTasks: projectData.tasks || [],
      myTasks: tasksByAssignee[agentId] || [],
      teammateTasks: getTeammateTasks(tasksByAssignee, agentId),
      userTasks: tasksByAssignee[userId] || tasksByAssignee['user'] || [],
      unassignedTasks: tasksByAssignee['unassigned'] || [],
      
      // Conversation context
      conversationHistory,
      conversationSummary,
      multiDayHistory,
      multiDaySummary,
      previousDaysContext,
      
      // Enhanced conversation insights
      enhancedConversationSummary,
      potentialTasks: enhancedConversationSummary.potentialTasks || [],
      actionItems: enhancedConversationSummary.actionItems || [],
      keyTopics: enhancedConversationSummary.keyTopics || [],
      
      // Team context
      teammates: getTeammateInfo(agentId),
      alexAvailable: AI_AGENTS.alex?.activeDays?.includes(currentDay) || false,
      
      // Formatted summaries for AI prompts
      formattedTasks: formatTasksForAI(projectData.tasks),
      memoryFormattedTasks: formattedTasksForAI, // Enhanced memory-based task formatting
      taskSummary: buildTaskSummary(projectData.tasks),
      assignmentSummary: buildAssignmentSummary(tasksByAssignee, agentId)
    };
    
    
    return context;
    
  } catch (error) {
    console.error(`[ContextService] Error building context:`, error);
    return buildEmptyContext(agentId, currentDay);
  }
}

/**
 * Organize tasks by assignee (agent or user)
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Tasks grouped by assignee ID
 */
function organizeTasksByAssignee(tasks) {
  const organized = {
    brown: [],
    elza: [],
    kati: [],
    steve: [],
    sam: [],
    rasoa: [],
    rakoto: [],
    user: [],
    unassigned: []
  };
  
  if (!tasks || tasks.length === 0) {
    return organized;
  }
  
  tasks.forEach((task, index) => {
    const assignee = (task.assignedTo || 'unassigned').toLowerCase().trim();
    const taskTitle = task.title || task.text || 'No title';
    
    // Direct agent name match
    if (assignee === 'brown' || assignee.includes('brown')) {
      organized.brown.push(task);
    } else if (assignee === 'elza' || assignee.includes('elza')) {
      organized.elza.push(task);
    } else if (assignee === 'kati' || assignee.includes('kati')) {
      organized.kati.push(task);
    } else if (assignee === 'steve' || assignee.includes('steve')) {
      organized.steve.push(task);
    } else if (assignee === 'sam' || assignee.includes('sam')) {
      organized.sam.push(task);
    } else if (assignee === 'rasoa' || assignee.includes('rasoa')) {
      organized.rasoa.push(task);
    } else if (assignee === 'rakoto' || assignee.includes('rakoto')) {
      organized.rakoto.push(task);
    } else if (assignee === 'user' || assignee === 'human' || assignee.length > 20) {
      // Long user IDs (Firebase UIDs)
      organized.user.push(task);
    } else if (assignee === 'unassigned' || assignee === '') {
      organized.unassigned.push(task);
    } else {
      // Unknown assignee - treat as unassigned
      organized.unassigned.push(task);  
    }
  });
  
  return organized;
}

/**
 * Get tasks assigned to teammates (excluding current agent)
 * @param {Object} tasksByAssignee - Tasks organized by assignee
 * @param {string} currentAgentId - Current agent ID
 * @returns {Object} Tasks for each teammate
 */
function getTeammateTasks(tasksByAssignee, currentAgentId) {
  const teammates = {};
  
  Object.keys(AI_AGENTS).forEach(agentId => {
    if (agentId !== currentAgentId) {
      teammates[agentId] = {
        name: AI_AGENTS[agentId].name,
        tasks: tasksByAssignee[agentId] || []
      };
    }
  });
  
  return teammates;
}

/**
 * Get information about teammates
 * @param {string} currentAgentId - Current agent ID
 * @returns {Array} Array of teammate info objects
 */
function getTeammateInfo(currentAgentId) {
  return Object.keys(AI_AGENTS)
    .filter(id => id !== currentAgentId)
    .map(id => ({
      id,
      name: AI_AGENTS[id].name,
      role: AI_AGENTS[id].role,
      personality: AI_AGENTS[id].personality
    }));
}

/**
 * Build a summary of all tasks
 * @param {Array} tasks - Array of task objects
 * @returns {string} Human-readable task summary
 */
function buildTaskSummary(tasks) {
  if (!tasks || tasks.length === 0) {
    return 'No tasks defined yet.';
  }
  
  const statusCounts = {
    todo: 0,
    inprogress: 0,
    review: 0,
    done: 0
  };
  
  tasks.forEach(task => {
    const status = (task.status || 'todo').toLowerCase().replace(/[\s-]/g, '');
    if (statusCounts[status] !== undefined) {
      statusCounts[status]++;
    } else {
      statusCounts.todo++;
    }
  });
  
  return `Total: ${tasks.length} tasks (${statusCounts.todo} to do, ${statusCounts.inprogress} in progress, ${statusCounts.review} in review, ${statusCounts.done} done)`;
}

/**
 * Build a summary of task assignments for current agent
 * @param {Object} tasksByAssignee - Tasks organized by assignee
 * @param {string} agentId - Current agent ID
 * @returns {string} Assignment summary
 */
function buildAssignmentSummary(tasksByAssignee, agentId) {
  const myTasks = tasksByAssignee[agentId] || [];
  const summary = [];
  
  if (myTasks.length > 0) {
    summary.push(`You have ${myTasks.length} task(s) assigned:`);
    myTasks.forEach((task, idx) => {
      const taskText = task.text || task.description || task.title || 'Untitled task';
      const status = task.status || 'todo';
      summary.push(`  ${idx + 1}. [${status}] ${taskText}`);
    });
  } else {
    summary.push('You have no tasks assigned yet.');
  }
  
  return summary.join('\n');
}

/**
 * Format tasks for AI context
 * @param {Array} tasks - Array of task objects
 * @returns {string} Formatted task list for AI context
 */
function formatTasksForAI(tasks) {
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
 * Build empty context when project data is not available
 * @param {string} agentId - Agent ID
 * @param {number} currentDay - Current day
 * @returns {Object} Empty context object
 */
function buildEmptyContext(agentId, currentDay) {
  return {
    projectId: null,
    projectName: 'No active project',
    projectDescription: '',
    startDate: Date.now(),
    currentDay,
    agentId,
    agentName: AI_AGENTS[agentId]?.name || agentId,
    agentRole: AI_AGENTS[agentId]?.role || 'Team Member',
    allTasks: [],
    myTasks: [],
    teammateTasks: {},
    userTasks: [],
    unassignedTasks: [],
    conversationHistory: [],
    conversationSummary: 'No conversation history.',
    multiDayHistory: [],
    multiDaySummary: 'No conversation history.',
    previousDaysContext: [],
    teammates: getTeammateInfo(agentId),
    alexAvailable: AI_AGENTS.alex?.activeDays?.includes(currentDay) || false,
    formattedTasks: 'No tasks defined yet.',
    taskSummary: 'No tasks defined yet.',
    assignmentSummary: 'You have no tasks assigned yet.'
  };
}

/**
 * Build enhanced contextual prompt with full awareness
 * @param {string} agentId - Agent ID
 * @param {Object} context - Context from getAgentContext
 * @param {string} userMessage - Current user message
 * @returns {string} Enhanced prompt for AI
 */
export function buildEnhancedPrompt(agentId, context, userMessage) {
  const agent = AI_AGENTS[agentId];
  if (!agent) return '';
  
  const teammateList = context.teammates.map(t => `${t.name} (${t.role})`).join(', ');
  
  // Build MY assigned tasks section (same as before)
  let myTasksSection = '';
  if (context.myTasks && context.myTasks.length > 0) {
    myTasksSection = `\n🎯 YOUR (My) ASSIGNED TASKS (My Top Priority):\n`;
    context.myTasks.forEach((task, idx) => {
      const statusEmoji = task.status === 'done' ? '✅' : task.status === 'inprogress' ? '🔄' : '📝';
      const priority = task.priority ? ` [Priority: ${task.priority}]` : '';
      myTasksSection += `${idx + 1}. ${statusEmoji} ${task.description || task.title} (${task.status})${priority}\n`;
    });
    myTasksSection += `\n`;
  } else {
    myTasksSection = `\n🎯 YOUR (My) ASSIGNED TASKS: None right now. I'm free to help out!\n\n`;
  }
  
  // Build overall project status (same as before)
  let projectStatusSection = '';
  if (context.allTasks.length > 0) {
    const todoTasks = context.allTasks.filter(t => t.status === 'todo');
    const inProgressTasks = context.allTasks.filter(t => t.status === 'inprogress');
    const completedTasks = context.allTasks.filter(t => t.status === 'done');
    
    projectStatusSection = `📊 Overall Project Status (Day ${context.currentDay}/7):\n`;
    if (completedTasks.length > 0) projectStatusSection += `✅ ${completedTasks.length} completed | `;
    if (inProgressTasks.length > 0) projectStatusSection += `🔄 ${inProgressTasks.length} in progress | `;
    if (todoTasks.length > 0) projectStatusSection += `📝 ${todoTasks.length} to do`;
    projectStatusSection += `\n\n`;
  }
  
  // Add previous days' context (same as before)
  let previousDaysSection = '';
  if (context.previousDaysContext && context.previousDaysContext.length > 0) {
    previousDaysSection += `\n💭 Earlier discussions:\n`;
    let lastDay = null;
    context.previousDaysContext.slice(-5).forEach(msg => { // Only last 5 messages
      if (msg.day !== lastDay) {
        previousDaysSection += `Day ${msg.day}: `;
        lastDay = msg.day;
      }
      previousDaysSection += `${msg.senderName}: ${msg.content || msg.text}\n`;
    });
    previousDaysSection += '\n';
  }
  
  // Conversation insights (same as before)
  let insightsSection = '';
  if (context.enhancedConversationSummary) {
    if (context.potentialTasks.length > 0) {
      insightsSection += `💡 Potential tasks mentioned: ${context.potentialTasks.map(t => t.text).join(', ')}\n`;
    }
    if (context.actionItems.length > 0) {
      insightsSection += `✅ Action items: ${context.actionItems.map(t => t.text).join(', ')}\n`;
    }
  }
  
  // Add memory-based task context if available (same as before)
  let memoryTasksSection = '';
  if (context.memoryFormattedTasks && context.memoryFormattedTasks.length > 50) {
    memoryTasksSection = `\n📋 PROJECT TASK OVERVIEW (from memory):\n${context.memoryFormattedTasks}\n`;
  }

  // =================================================================
  // === NEW, MORE NATURAL PROMPT STARTS HERE ===
  // =================================================================

  const taskFocusedPrompt = `
You are ${context.agentName}, a teammate on the "${context.projectName}" project.
Your entire personality is: **${agent.personality}**.
Let this personality guide *everything* you say. Don't be a generic AI. Be ${context.agentName}.

---

### Your Teammate Vibe:

1.  **BE NATURAL:** Talk like a person, not a bot. Use a friendly, relaxed tone. Emojis are great. Small talk is good. Phrases like "Aha, I see," "Oh, that's a good point," or "Yep, I've been working on..." are perfect.
2.  **BE YOURSELF (Your Personality):** Fully lean into your personality (${agent.personality}). If you're 'critical', ask probing questions. If you're 'energetic', be enthusiastic.
3.  **NEVER USE A PREFIX:** **DO NOT** start your message with your name, like "${context.agentName}:". Just jump right into what you want to say.
4.  **BE A REAL TEAMMATE (This is key!):**
    * **Ask about their work:** Be curious! Ask the user how *their* tasks are going. ("How's that 'XYZ' task coming along?", "Making any progress on the 'ABC' feature?")
    * **Talk about your work:** Casually mention what you're focused on, *especially* if it's relevant. ("Speaking of databases, I've been digging into my task on the user schema...", "Yeah, I'm free right now, just finished my last task.")
    * **Encourage momentum:** Be a good teammate. ("Nice, keep that momentum going!", "That sounds tough, but you've got this.", "Great idea! We should add that as a task.")
    * **Read the room:** Pay attention to the conversation. Don't repeat what someone *just* said. Build on their ideas. ("Adding to what Elza said, we also need to...")

---

### How to Use Your Knowledge:

* **IF IT RELATES TO YOUR TASKS:** Awesome! This is your expertise. Answer based on your assigned tasks. Mention your task if it feels natural. ("Oh, for my task 'Refactor Login API', I'm actually...").
* **IF IT'S ABOUT THE PROJECT (but not your tasks):** You're still on the team! Use the project status info and conversation history to give a helpful, collaborative answer.
* **IF IT'S RANDOM (off-topic):** Don't be a robot. Respond naturally using your personality. ("Haha, good question... but hey, back to this project, I was thinking...")
`;

  // =================================================================
  // === NEW, MORE NATURAL RETURN STATEMENT ===
  // =================================================================

  return `
${taskFocusedPrompt}

### Context for Your Response:

${myTasksSection}
${projectStatusSection}
${memoryTasksSection}
${previousDaysSection}
${insightsSection}

---
### The Conversation So Far:
${context.conversationSummary}

### The User (${context.userName}) Just Said:
"${userMessage}"

---
**Your Natural Response (as ${context.agentName}):**
(Remember: No prefix! Just start talking. Be yourself. Ask them a question back. Keep the momentum going!)
`;
}




export default {
  getAgentContext,
  buildEnhancedPrompt,

};