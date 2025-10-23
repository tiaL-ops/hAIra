// AI service layer - handles LLM interactions and context building
import { generateAIResponse as callOpenAI } from '../api/openaiService.js';
import { AI_AGENTS } from '../config/aiAgents.js';
import { getAgentContext, buildEnhancedPrompt } from './contextService.js';

// In-memory cache for conversation summaries
const summaryCache = new Map();

/**
 * Generate AI response with error handling
 * @param {string} userContent - User's message
 * @param {string} contextualPrompt - Full context prompt
 * @returns {Promise<string>} AI response text
 */
export async function generateAIResponse(userContent, contextualPrompt) {
  try {
    return await callOpenAI(userContent, contextualPrompt);
  } catch (error) {
    console.error('[AI Service] Error generating response:', error);
    throw error;
  }
}

/**
 * Build contextual prompt for an agent
 * @param {string} agentId - Agent identifier (alex, rasoa, rakoto)
 * @param {Object} projectInfo - Enhanced project information
 * @param {Array} conversationHistory - Recent conversation messages
 * @returns {string} Complete contextual prompt
 */
export function buildContextualPrompt(agentId, projectInfo, conversationHistory) {
  const agent = AI_AGENTS[agentId];
  if (!agent) return '';
  
  const teammates = Object.keys(AI_AGENTS)
    .filter(id => id !== agentId)
    .map(id => AI_AGENTS[id].name)
    .join(', ');
  
  const recentChat = conversationHistory
    .slice(-8)
    .map(msg => `${msg.senderName}: ${msg.content}`)
    .join('\n') || 'No recent messages.';
  
  const roleDescription = agentId === 'alex' 
    ? 'AI Project Manager (leads project, ensures coordination)'
    : agentId === 'rasoa'
    ? 'Planner (organizes tasks, manages Kanban)'
    : 'Developer (executes assigned tasks)';
  
  return `
AGENT IDENTITY:
- Name: ${agent.name}
- Role: ${roleDescription}
- Teammates: ${teammates}

PROJECT CONTEXT:
- Project: ${projectInfo.name || 'Untitled Project'}
- Duration: 7 days (Current Day: ${projectInfo.currentDay || 1})
- Lead: ${projectInfo.userName || 'User'}
- Alex (PM) is ${projectInfo.alexAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'} today (active Days 1, 3, 6)

${projectInfo.tasks || ''}

CONVERSATION SUMMARY (Last 15 messages):
${projectInfo.conversationSummary || 'No prior conversation.'}

MOST RECENT EXCHANGE:
${recentChat}
${projectInfo.specialContext || ''}

${agent.systemPrompt}

GUIDELINES:
- Respond naturally as if chatting with teammates
- Keep tone brief, cooperative, and human
- Reference tasks and progress when relevant
- Build on previous conversation context
`;
}

/**
 * Get or generate conversation summary with caching
 * @param {string} projectId - Project identifier
 * @param {number} currentDay - Current project day
 * @param {Array} recentChats - Recent chat messages
 * @returns {string} Conversation summary
 */
export function getConversationSummary(projectId, currentDay, recentChats) {
  const cacheKey = `${projectId}_day${currentDay}`;
  
  // Check cache
  if (summaryCache.has(cacheKey) && recentChats.length % 10 !== 0) {
    console.log(`[AI Service] ♻️  Using cached summary for ${cacheKey}`);
    return summaryCache.get(cacheKey);
  }
  
  // Generate new summary
  const summary = recentChats
    .slice(-15)
    .map(chat => `${chat.senderName}: ${chat.text || chat.content}`)
    .join('\n');
  
  summaryCache.set(cacheKey, summary);
  console.log(`[AI Service] ✅ Generated new summary for ${cacheKey}`);
  
  return summary;
}

/**
 * Build special context for Alex unavailability
 * @param {boolean} alexMentioned - Whether Alex was mentioned
 * @param {boolean} isAlexActive - Whether Alex is active today
 * @param {string} agentId - Current agent ID
 * @param {number} currentDay - Current project day
 * @returns {string} Special context message or empty string
 */
export function buildSpecialContext(alexMentioned, isAlexActive, agentId, currentDay) {
  if (alexMentioned && !isAlexActive && agentId !== 'alex') {
    return `\n\nIMPORTANT: User mentioned @Alex, but Alex is only active on Days 1, 3, and 6. Today is Day ${currentDay}. Acknowledge this politely and offer to help. Be brief.`;
  }
  return '';
}

/**
 * Clear cache for a specific project/day (useful for testing)
 * @param {string} projectId - Project identifier
 * @param {number} [day] - Optional specific day to clear
 */
export function clearSummaryCache(projectId, day = null) {
  if (day) {
    summaryCache.delete(`${projectId}_day${day}`);
  } else {
    // Clear all days for this project
    for (const key of summaryCache.keys()) {
      if (key.startsWith(projectId)) {
        summaryCache.delete(key);
      }
    }
  }
}

/**
 * Generate AI response with full context awareness
 * This version ensures the AI agent has complete knowledge of:
 * - Project details and current status
 * - Tasks assigned to them and teammates
 * - Conversation history from memory and Firebase
 * 
 * @param {string} agentId - Agent ID (alex, rasoa, rakoto)
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 * @param {number} currentDay - Current project day
 * @param {string} userMessage - User's message
 * @returns {Promise<string>} AI response with full context
 */
export async function generateContextAwareResponse(agentId, projectId, userId, currentDay, userMessage) {
  try {
    console.log(`[AI Service] Generating context-aware response for ${agentId}`);
    console.log(`[AI Service] Project: ${projectId}, User: ${userId}, Day: ${currentDay}`);
    
    // Get comprehensive context
    const context = await getAgentContext(projectId, userId, currentDay, agentId);
    
    // Log context details
    console.log(`[AI Service] ✅ Context received for ${agentId}:`, {
      projectName: context.projectName,
      totalTasks: context.allTasks.length,
      myTasks: context.myTasks.length,
      teammateTasks: Object.keys(context.teammateTasks).length,
      userTasks: context.userTasks.length,
      unassignedTasks: context.unassignedTasks.length,
      conversationHistory: context.conversationHistory.length,
      previousDaysContext: context.previousDaysContext.length,
      potentialTasks: context.potentialTasks?.length || 0,
      actionItems: context.actionItems?.length || 0,
      keyTopics: context.keyTopics?.length || 0,
      hasEnhancedContext: !!context.enhancedConversationSummary
    });
    
    // CRITICAL: Verify tasks are in context
    if (context.allTasks.length === 0) {
      console.log(`[AI Service] ⚠️⚠️⚠️ NO TASKS IN CONTEXT for ${agentId}!`);
    } else {
      console.log(`[AI Service] 🎯 Tasks in context for ${agentId}:`);
      context.allTasks.forEach((task, idx) => {
        console.log(`[AI Service]   ${idx + 1}. "${task.description || task.title}" [${task.status}] -> ${task.assignedTo}`);
      });
    }
    
    // Build enhanced prompt with full awareness
    const enhancedPrompt = buildEnhancedPrompt(agentId, context, userMessage);
    
    console.log(`[AI Service] ✅ Enhanced prompt built for ${agentId}:`);
    console.log(`[AI Service]    - Prompt length: ${enhancedPrompt.length} characters`);
    console.log(`[AI Service]    - Tasks in prompt: ${context.allTasks.length}`);
    console.log(`[AI Service]    - Conversation messages: ${context.conversationHistory.length}`);
    
    // Log a snippet of the task section in the prompt
    if (context.allTasks.length > 0) {
      const taskSection = enhancedPrompt.match(/=== ALL PROJECT TASKS ===([\s\S]*?)(?:===|$)/)?.[1] || '';
      if (taskSection) {
        console.log(`[AI Service] Task section preview (first 500 chars):`, taskSection.substring(0, 500));
      }
    }
    
    // Log the COMPLETE task section to verify it's there
    const taskSectionMatch = enhancedPrompt.match(/=== ALL PROJECT TASKS FROM FIRESTORE ===([\s\S]*?)(?:===|$)/);
    if (taskSectionMatch) {
      console.log(`[AI Service] 🔍 FULL TASK SECTION BEING SENT TO AI:`);
      console.log(taskSectionMatch[0].substring(0, 1000));
    } else {
      console.log(`[AI Service] ⚠️⚠️⚠️ NO TASK SECTION FOUND IN PROMPT!`);
    }
    
    // Generate response
    const response = await callOpenAI(userMessage, enhancedPrompt);
    
    console.log(`[AI Service] ✅ Generated response for ${agentId} with context awareness`);
    console.log(`[AI Service] Response preview:`, response.substring(0, 100) + '...');
    
    return response;
    
  } catch (error) {
    console.error(`[AI Service] Error generating context-aware response:`, error);
    throw error;
  }
}