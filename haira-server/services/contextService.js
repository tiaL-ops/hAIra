// contextService.js - Enhanced context management for AI agents
// Ensures AI agents are always aware of project, tasks, and assignments

import { getProjectWithTasks } from './firebaseService.js';
import { 
  getConversationHistory, 
  getConversationSummary, 
  getMultiDayHistory,
  getMultiDaySummary,
  getPreviousDaysContext 
} from '../config/conversationMemory.js';
import { storeProjectData, formatTasksForAI, getProjectTasks } from '../config/taskMemory.js';
import { AI_AGENTS } from '../config/aiAgents.js';

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
    // 1. Get project data and tasks from Firebase
    const projectData = await getProjectWithTasks(projectId, userId);
    
    if (!projectData) {
      console.log(`[ContextService] No project data found for ${projectId}`);
      return buildEmptyContext(agentId, currentDay);
    }
    
    // 2. Store in task memory for quick access
    storeProjectData(projectId, projectData.tasks, projectData.project);
    
    // 3. Get conversation history from memory (including previous days)
    const conversationHistory = getConversationHistory(projectId, currentDay, 15);
    const conversationSummary = getConversationSummary(projectId, currentDay);
    
    // Get multi-day context for continuity across days
    const multiDayHistory = getMultiDayHistory(projectId, currentDay, 2, 20); // Last 2 days
    const multiDaySummary = getMultiDaySummary(projectId, currentDay, 2);
    const previousDaysContext = getPreviousDaysContext(projectId, currentDay);
    
    // 4. Organize tasks by assignee
    const tasksByAssignee = organizeTasksByAssignee(projectData.tasks);
    
    // Debug logging for tasks
    console.log(`[ContextService] Project ${projectId} - Total tasks: ${projectData.tasks.length}`);
    console.log(`[ContextService] Tasks by assignee:`, JSON.stringify(tasksByAssignee, null, 2));
    console.log(`[ContextService] Agent ${agentId} tasks:`, tasksByAssignee[agentId] || []);
    
    // 5. Build agent-specific context
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
      
      // Team context
      teammates: getTeammateInfo(agentId),
      alexAvailable: AI_AGENTS.alex?.activeDays?.includes(currentDay) || false,
      
      // Formatted summaries for AI prompts
      formattedTasks: formatTasksForAI(projectId),
      taskSummary: buildTaskSummary(projectData.tasks),
      assignmentSummary: buildAssignmentSummary(tasksByAssignee, agentId)
    };
    
    console.log(`[ContextService] Context built successfully. Tasks: ${context.allTasks.length}, My tasks: ${context.myTasks.length}`);
    
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
    alex: [],
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
    const assignee = (task.assignedTo || task.assignee || 'unassigned').toLowerCase();
    const taskTitle = task.title || task.text || 'No title';
    const taskDescription = task.description || '';
    
    console.log(`[ContextService] Task ${index + 1}: "${taskTitle}" -> assignedTo: "${assignee}"`);
    console.log(`[ContextService] Task details:`, {
      title: taskTitle,
      description: taskDescription,
      status: task.status,
      assignedTo: assignee
    });
    
    // Match assignee to known agents or user
    if (assignee.includes('alex')) {
      organized.alex.push(task);
      console.log(`[ContextService] -> Assigned to Alex`);
    } else if (assignee.includes('rasoa')) {
      organized.rasoa.push(task);
      console.log(`[ContextService] -> Assigned to Rasoa`);
    } else if (assignee.includes('rakoto')) {
      organized.rakoto.push(task);
      console.log(`[ContextService] -> Assigned to Rakoto`);
    } else if (assignee.includes('user') || assignee.includes('human') || task.userId || assignee.length > 20) {
      // If assignedTo is a long user ID, treat as user task
      organized.user.push(task);
      console.log(`[ContextService] -> Assigned to User (ID: ${assignee})`);
    } else {
      organized.unassigned.push(task);
      console.log(`[ContextService] -> Unassigned`);
    }
  });
  
  console.log(`[ContextService] Final organization:`, {
    alex: organized.alex.length,
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
  
  // Build detailed task awareness
  let taskContext = `\n=== CURRENT PROJECT STATUS ===\n`;
  taskContext += `Project: "${context.projectName}"\n`;
  taskContext += `Day ${context.currentDay} of 7-day sprint\n`;
  taskContext += `${context.taskSummary}\n\n`;
  
  // Show ALL tasks to every agent so they know what's happening
  taskContext += `=== ALL PROJECT TASKS ===\n`;
  taskContext += `(You can see all tasks and who they're assigned to)\n\n`;
  
  if (context.allTasks.length > 0) {
    context.allTasks.forEach((task, idx) => {
      const title = task.title || task.text || 'Untitled';
      const description = task.description || '';
      const status = task.status || 'todo';
      const assignedTo = task.assignedTo || 'unassigned';
      
      // Determine who this task belongs to
      let assigneeName = 'Unknown';
      if (assignedTo.includes('alex') || assignedTo === 'alex') {
        assigneeName = 'Alex (Project Manager)';
      } else if (assignedTo.includes('rasoa') || assignedTo === 'rasoa') {
        assigneeName = 'Rasoa (Research Planner)';
      } else if (assignedTo.includes('rakoto') || assignedTo === 'rakoto') {
        assigneeName = 'Rakoto (Technical Developer)';
      } else if (assignedTo.includes('user') || assignedTo.length > 20) {
        assigneeName = 'User (Human team member)';
      } else {
        assigneeName = `Unassigned (${assignedTo})`;
      }
      
      taskContext += `${idx + 1}. [${status}] ${title}\n`;
      if (description) {
        taskContext += `   Description: ${description}\n`;
      }
      taskContext += `   Assigned to: ${assigneeName}\n\n`;
    });
  } else {
    taskContext += `No tasks defined yet.\n\n`;
  }
  
  // Add specific assignments for this agent
  if (context.myTasks.length > 0) {
    taskContext += `=== YOUR SPECIFIC ASSIGNMENTS ===\n`;
    context.myTasks.forEach((task, idx) => {
      const title = task.title || task.text || 'Untitled';
      const description = task.description || '';
      const status = task.status || 'todo';
      
      taskContext += `${idx + 1}. [${status}] ${title}\n`;
      if (description) {
        taskContext += `   Description: ${description}\n`;
      }
      taskContext += `   (This is YOUR task)\n\n`;
    });
  } else {
    taskContext += `=== YOUR ASSIGNMENTS ===\n`;
    taskContext += `You have no specific tasks assigned to you.\n\n`;
  }
  
  // Add previous days' context if available
  let previousDaysSection = '';
  if (context.previousDaysContext && context.previousDaysContext.length > 0) {
    previousDaysSection += `\n=== CONTEXT FROM PREVIOUS DAYS ===\n`;
    previousDaysSection += `(Key points from earlier discussions - remember these when responding)\n\n`;
    
    let lastDay = null;
    context.previousDaysContext.forEach(msg => {
      if (msg.day !== lastDay) {
        previousDaysSection += `Day ${msg.day}:\n`;
        lastDay = msg.day;
      }
      previousDaysSection += `  ${msg.senderName}: ${msg.content || msg.text}\n`;
    });
    previousDaysSection += '\n';
  }
  
  return `
${agent.systemPrompt}

=== CURRENT CONTEXT ===
You are: ${context.agentName} (${context.agentRole})
Project: ${context.projectName}
Day: ${context.currentDay}/7
Teammates: ${teammateList}
Alex (PM) status: ${context.alexAvailable ? 'AVAILABLE today' : 'NOT available today (only active Days 1, 3, 6)'}

${taskContext}
${previousDaysSection}

=== TODAY'S CONVERSATION (Day ${context.currentDay}) ===
${context.conversationSummary}

=== CURRENT MESSAGE ===
User: ${userMessage}

=== RESPONSE GUIDELINES ===
- You are ${context.agentName}. NEVER speak as other agents.
- You can see ALL project tasks and who they're assigned to.
- Reference any task when relevant, even if not assigned to you.
- Be aware of what everyone is working on (User, Alex, Rasoa, Rakoto).
- REMEMBER and reference previous days' discussions when relevant.
- Build on the conversation history naturally across all days.
- Keep responses brief (2-4 sentences) and conversational.
- If asked about tasks, you can reference ANY task from the project.
- If asked about project status, use the task information above.
- When the day changes, acknowledge continuity: "Following up from yesterday..." or "As we discussed earlier..."
- You can help coordinate tasks even if they're not assigned to you.
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

