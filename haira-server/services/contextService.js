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
  console.log(`[ContextService] Building context for ${agentId} on project ${projectId}, day ${currentDay}`);
  
  try {
    // 1. Check if we have cached context for today (DISABLED - function not implemented)
    // const cachedContext = getDailyContext(projectId, currentDay);
    // if (cachedContext && (Date.now() - cachedContext.lastUpdated) < 300000) { // 5 minutes
    //   console.log(`[ContextService] ⚠️ Using cached context for ${agentId} - tasks: ${cachedContext.allTasks?.length || 0}`);
    //   return getEnhancedContextCache(projectId, currentDay, agentId);
    // }
    console.log(`[ContextService] 🔧 Fetching fresh context (caching disabled)`);
    
    
    // 2. Get project data and tasks from Firebase
    const projectData = await getProjectWithTasks(projectId, userId);
    
    if (!projectData) {
      console.log(`[ContextService] ❌ No project data found for ${projectId}`);
      return buildEmptyContext(agentId, currentDay);
    }
    
    console.log(`[ContextService] ✅ Project data loaded from Firestore:`);
    console.log(`[ContextService]    - Project: ${projectData.project?.title || projectData.project?.name || 'Untitled'}`);
    console.log(`[ContextService]    - Tasks: ${projectData.tasks?.length || 0}`);
    
    // CRITICAL CHECK: Verify tasks exist
    if (!projectData.tasks || projectData.tasks.length === 0) {
      console.log(`[ContextService] ⚠️⚠️⚠️ NO TASKS FETCHED FROM FIRESTORE!`);
      console.log(`[ContextService] projectData:`, JSON.stringify(projectData, null, 2));
    } else {
      console.log(`[ContextService] ✅ ${projectData.tasks.length} tasks fetched from Firestore:`);
      projectData.tasks.forEach((task, idx) => {
        console.log(`[ContextService]    ${idx + 1}. "${task.description || task.title}" [${task.status}] -> ${task.assignedTo}`);
      });
    }
    
    // 3. Get conversation history from memory (enhanced context)
    const conversationHistory = getConversationHistory(projectId, currentDay, 15);
    const previousDaysContext = getPreviousDaysContext(projectId, currentDay);
    const multiDaySummary = getMultiDaySummary(projectId, currentDay, 2);
    
    console.log(`[ContextService] ✅ Memory-based conversation context:`);
    console.log(`[ContextService]    - Current day messages: ${conversationHistory.length}`);
    console.log(`[ContextService]    - Previous days context: ${previousDaysContext.length}`);
    
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
    
    // 4. Organize tasks by assignee (enhanced with memory)
    const tasksByAssignee = organizeTasksByAssignee(projectData.tasks);
    
    // Get additional task context from memory
    const memoryTasks = getProjectTasks(projectId);
    const memoryProjectInfo = getProjectInfo(projectId);
    const formattedTasksForAI = formatTasksFromMemory(projectId);
    
    console.log(`[ContextService] ✅ Task memory context:`);
    console.log(`[ContextService]    - Memory tasks: ${memoryTasks.length}`);
    console.log(`[ContextService]    - Memory project: ${memoryProjectInfo.title || 'Unknown'}`);
    console.log(`[ContextService]    - Formatted for AI: ${formattedTasksForAI.length} chars`);
    
    // Debug logging for tasks
    console.log(`[ContextService] Project ${projectId} - Total tasks: ${projectData.tasks.length}`);
    console.log(`[ContextService] Tasks by assignee:`, JSON.stringify(tasksByAssignee, null, 2));
    console.log(`[ContextService] Agent ${agentId} tasks:`, tasksByAssignee[agentId] || []);
    
    // 5. Build agent-specific context
    console.log(`[ContextService] 🏗️ Building context object with ${projectData.tasks?.length || 0} tasks`);
    
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
    
    console.log(`[ContextService] ✅ Context built successfully for ${agentId}:`);
    console.log(`[ContextService]    - Total tasks: ${context.allTasks.length}`);
    console.log(`[ContextService]    - My tasks (${agentId}): ${context.myTasks.length}`);
    console.log(`[ContextService]    - User tasks: ${context.userTasks.length}`);
    console.log(`[ContextService]    - Unassigned tasks: ${context.unassignedTasks.length}`);
    console.log(`[ContextService]    - Conversation history: ${context.conversationHistory.length} messages`);
    console.log(`[ContextService]    - Previous days context: ${context.previousDaysContext.length} messages`);
    
    // Log what the AI agent will see
    if (context.allTasks.length > 0) {
      console.log(`[ContextService] Tasks that ${agentId} can see:`);
      context.allTasks.forEach((task, idx) => {
        console.log(`[ContextService]    ${idx + 1}. [${task.status || 'todo'}] ${task.title || task.text} -> ${task.assignedTo || 'unassigned'}`);
      });
    }
    
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
  
  console.log(`[ContextService] Organizing ${tasks?.length || 0} tasks...`);
  
  if (!tasks || tasks.length === 0) {
    console.log(`[ContextService] No tasks to organize`);
    return organized;
  }
  
  tasks.forEach((task, index) => {
    const assignee = (task.assignedTo || 'unassigned').toLowerCase().trim();
    const taskTitle = task.title || task.text || 'No title';
    
    console.log(`[ContextService] Task ${index + 1}: "${taskTitle}" -> assignedTo: "${assignee}"`);
    
    // Direct agent name match
    if (assignee === 'brown' || assignee.includes('brown')) {
      organized.brown.push(task);
      console.log(`[ContextService] ✅ Assigned to Brown`);
    } else if (assignee === 'elza' || assignee.includes('elza')) {
      organized.elza.push(task);
      console.log(`[ContextService] ✅ Assigned to Elza`);
    } else if (assignee === 'kati' || assignee.includes('kati')) {
      organized.kati.push(task);
      console.log(`[ContextService] ✅ Assigned to Kati`);
    } else if (assignee === 'steve' || assignee.includes('steve')) {
      organized.steve.push(task);
      console.log(`[ContextService] ✅ Assigned to Steve`);
    } else if (assignee === 'sam' || assignee.includes('sam')) {
      organized.sam.push(task);
      console.log(`[ContextService] ✅ Assigned to Sam`);
    } else if (assignee === 'rasoa' || assignee.includes('rasoa')) {
      organized.rasoa.push(task);
      console.log(`[ContextService] ✅ Assigned to Rasoa`);
    } else if (assignee === 'rakoto' || assignee.includes('rakoto')) {
      organized.rakoto.push(task);
      console.log(`[ContextService] ✅ Assigned to Rakoto`);
    } else if (assignee === 'user' || assignee === 'human' || assignee.length > 20) {
      // Long user IDs (Firebase UIDs)
      organized.user.push(task);
      console.log(`[ContextService] ✅ Assigned to User`);
    } else if (assignee === 'unassigned' || assignee === '') {
      organized.unassigned.push(task);
      console.log(`[ContextService] ✅ Unassigned`);
    } else {
      // Unknown assignee - treat as unassigned
      organized.unassigned.push(task);
      console.log(`[ContextService] ⚠️ Unknown assignee "${assignee}" - marking as unassigned`);
    }
  });
  
  console.log(`[ContextService] Final organization:`, {
    brown: organized.brown.length,
    elza: organized.elza.length,
    kati: organized.kati.length,
    steve: organized.steve.length,
    sam: organized.sam.length,
    rasoa: organized.rasoa.length,
    rakoto: organized.rakoto.length,
    user: organized.user.length,
    unassigned: organized.unassigned.length
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
  
  // Build MY assigned tasks section - this is the PRIMARY focus
  let myTasksSection = '';
  if (context.myTasks && context.myTasks.length > 0) {
    myTasksSection = `\n🎯 YOUR ASSIGNED TASKS:\n`;
    context.myTasks.forEach((task, idx) => {
      const statusEmoji = task.status === 'done' ? '✅' : task.status === 'inprogress' ? '🔄' : '📝';
      const priority = task.priority ? ` [Priority: ${task.priority}]` : '';
      myTasksSection += `${idx + 1}. ${statusEmoji} ${task.description || task.title} (${task.status})${priority}\n`;
    });
    myTasksSection += `\n`;
  } else {
    myTasksSection = `\n🎯 YOUR ASSIGNED TASKS: None currently assigned\n\n`;
  }
  
  // Build overall project status (secondary context)
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
  
  // Add previous days' context naturally
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
  
  // Conversation insights
  let insightsSection = '';
  if (context.enhancedConversationSummary) {
    if (context.potentialTasks.length > 0) {
      insightsSection += `💡 Potential tasks mentioned: ${context.potentialTasks.map(t => t.text).join(', ')}\n`;
    }
    if (context.actionItems.length > 0) {
      insightsSection += `✅ Action items: ${context.actionItems.map(t => t.text).join(', ')}\n`;
    }
  }
  
  // TASK-FOCUSED SYSTEM PROMPT - Your identity comes from your tasks
  const taskFocusedPrompt = `You are ${context.agentName}, an AI teammate on "${context.projectName}".

YOUR KNOWLEDGE AND CAPABILITIES come from YOUR ASSIGNED TASKS:
- Everything you know about is based on what tasks you're working on
- Your expertise is defined by your current assignments, not by a fixed role
- If you're assigned database tasks, you know about databases for THIS task
- If you're assigned design tasks, you know about design for THIS task
- When you have no tasks assigned, you're available to help with anything the team needs

CORE PRINCIPLES:
1. Your current tasks define what you're focused on and knowledgeable about
2. Answer questions based on the context of YOUR assigned work
3. You're a helpful teammate who adapts to project needs
4. Be concise (2-3 sentences), practical, and collaborative

When responding:
- Reference your tasks when they're relevant to the question
- Don't pretend to have expertise outside your assigned tasks
- If asked about something unrelated to your tasks, offer to help or suggest who might know better`;
  
  // Add memory-based task context if available
  let memoryTasksSection = '';
  if (context.memoryFormattedTasks && context.memoryFormattedTasks.length > 50) {
    memoryTasksSection = `\n📋 PROJECT TASK OVERVIEW (from memory):\n${context.memoryFormattedTasks}\n`;
  }

  return `
${taskFocusedPrompt}

Team Members: ${teammateList}
${context.alexAvailable ? '' : '(Alex is only available on Days 1, 3, 6)'}
${myTasksSection}${projectStatusSection}${memoryTasksSection}${previousDaysSection}${insightsSection}
Recent conversation:
${context.conversationSummary}

User just said: "${userMessage}"

Your response should be informed by your assigned tasks above. If the question relates to your tasks, draw on that context. If it doesn't relate to your tasks, be honest about that and offer general help instead.
`;
}

/**
 * Helper function to show how to assign tasks to AI agents
 * This is for reference - you need to update your task creation to use agent names
 */
export function getTaskAssignmentGuide() {
  return `
=== HOW TO ASSIGN TASKS TO AI AGENTS ===

To make AI agents aware of tasks, assign them using these names:

1. For Alex (Project Manager):
   assignedTo: "alex"

2. For Rasoa (Research Planner):
   assignedTo: "rasoa"

3. For Rakoto (Technical Developer):
   assignedTo: "rakoto"

4. For User (Human):
   assignedTo: "user" (or your user ID)

Example task structure:
{
  "title": "Write documentation",
  "description": "Create user guide",
  "status": "todo",
  "assignedTo": "rasoa"  ← This is the key field!
}

Current issue: Your tasks are assigned to user ID "SVX59K699GU3mNMhuF00K8FWOoY2"
Solution: Change assignedTo to "alex", "rasoa", "rakoto", or "user"
`;
}

export default {
  getAgentContext,
  buildEnhancedPrompt,
  getTaskAssignmentGuide
};