// AI service layer - handles LLM interactions and context building
import { generateAIResponse as callOpenAI, generateAIContribution as callOpenAIContribution, generateAIProject as callOpenAIProject } from '../api/openaiService.js';
import { generateAIResponse as callGemini, generateGradeResponse as callGeminiGrade, generateDeliverablesResponse as callGeminiDeliverables, generateAIContribution as callGeminiContribution } from '../api/geminiService.js';
import { AI_AGENTS } from '../config/aiAgents.js';
import { getAgentContext, buildEnhancedPrompt } from './contextService.js';
import { getAIConfig, getPrimaryAPI, getFallbackAPI, isAPIAvailable } from './aiConfigService.js';
import { cleanAIResponse } from '../utils/editorTextUtils.js';

// In-memory cache for conversation summaries
const summaryCache = new Map();

/**
 * Generate AI response with conditional API selection based on environment
 * @param {string} userContent - User's message
 * @param {string} contextualPrompt - Full context prompt
 * @returns {Promise<string>} AI response text
 */
export async function generateAIResponse(userContent, contextualPrompt) {
  const config = getAIConfig();
  const primaryAPI = getPrimaryAPI();
  const fallbackAPI = getFallbackAPI();

  console.log(`🚀 AI Service: Using ${config.description}`);
  console.log(`   Primary API: ${primaryAPI || 'None'}`);
  console.log(`   Fallback API: ${fallbackAPI || 'None'}`);

  // Try primary API first
  if (primaryAPI === 'openai' && isAPIAvailable('openai')) {
    try {
      console.log('🚀 Making OpenAI API call (primary)...');
      return await callOpenAI(userContent, contextualPrompt);
    } catch (error) {
      console.error('[AI Service] OpenAI API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'gemini' && isAPIAvailable('gemini')) {
        console.log('🚀 Falling back to Gemini API...');
        try {
          return await callGemini(userContent, contextualPrompt);
        } catch (fallbackError) {
          console.error('[AI Service] Gemini fallback API call failed:', fallbackError.message || fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  } else if (primaryAPI === 'gemini' && isAPIAvailable('gemini')) {
    try {
      console.log('🚀 Making Gemini API call (primary)...');
      return await callGemini(userContent, contextualPrompt);
    } catch (error) {
      console.error('[AI Service] Gemini API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'openai' && isAPIAvailable('openai')) {
        console.log('🚀 Falling back to OpenAI API...');
        try {
          return await callOpenAI(userContent, contextualPrompt);
        } catch (fallbackError) {
          console.error('[AI Service] OpenAI fallback API call failed:', fallbackError.message || fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  } else {
    throw new Error('No AI API available. Please check your environment configuration.');
  }
}

/**
 * Generate grade response with conditional API selection
 * @param {string} userSubmission - User's submission content
 * @param {string} systemInstruction - System instructions for grading
 * @returns {Promise<string>} Grading response
 */
export async function generateGradeResponse(userSubmission, systemInstruction) {
  const primaryAPI = getPrimaryAPI();
  const fallbackAPI = getFallbackAPI();

  // Try primary API first
  if (primaryAPI === 'openai' && isAPIAvailable('openai')) {
    try {
      console.log('🚀 Making OpenAI API call for grading (primary)...');
      // OpenAI doesn't have a direct grade function, so we use generateAIResponse
      return await callOpenAI(userSubmission, systemInstruction);
    } catch (error) {
      console.error('[AI Service] OpenAI grading API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'gemini' && isAPIAvailable('gemini')) {
        console.log('🚀 Falling back to Gemini API for grading...');
        try {
          return await callGeminiGrade(userSubmission, systemInstruction);
        } catch (fallbackError) {
          console.error('[AI Service] Gemini fallback grading API call failed:', fallbackError.message || fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  } else if (primaryAPI === 'gemini' && isAPIAvailable('gemini')) {
    try {
      console.log('🚀 Making Gemini API call for grading (primary)...');
      return await callGeminiGrade(userSubmission, systemInstruction);
    } catch (error) {
      console.error('[AI Service] Gemini grading API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'openai' && isAPIAvailable('openai')) {
        console.log('🚀 Falling back to OpenAI API for grading...');
        try {
          return await callOpenAI(userSubmission, systemInstruction);
        } catch (fallbackError) {
          console.error('[AI Service] OpenAI fallback grading API call failed:', fallbackError.message || fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  } else {
    throw new Error('No AI API available for grading. Please check your environment configuration.');
  }
}

/**
 * Generate deliverables response with conditional API selection
 * @param {string} title - Project title
 * @param {string} systemInstruction - System instructions for deliverables
 * @returns {Promise<string>} Deliverables response
 */
export async function generateDeliverablesResponse(title, systemInstruction) {
  const primaryAPI = getPrimaryAPI();
  const fallbackAPI = getFallbackAPI();

  // Try primary API first
  if (primaryAPI === 'openai' && isAPIAvailable('openai')) {
    try {
      console.log('🚀 Making OpenAI API call for deliverables (primary)...');
      return await callOpenAI(title, systemInstruction);
    } catch (error) {
      console.error('[AI Service] OpenAI deliverables API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'gemini' && isAPIAvailable('gemini')) {
        console.log('🚀 Falling back to Gemini API for deliverables...');
        try {
          return await callGeminiDeliverables(title, systemInstruction);
        } catch (fallbackError) {
          console.error('[AI Service] Gemini fallback deliverables API call failed:', fallbackError.message || fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  } else if (primaryAPI === 'gemini' && isAPIAvailable('gemini')) {
    try {
      console.log('🚀 Making Gemini API call for deliverables (primary)...');
      return await callGeminiDeliverables(title, systemInstruction);
    } catch (error) {
      console.error('[AI Service] Gemini deliverables API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'openai' && isAPIAvailable('openai')) {
        console.log('🚀 Falling back to OpenAI API for deliverables...');
        try {
          return await callOpenAI(title, systemInstruction);
        } catch (fallbackError) {
          console.error('[AI Service] OpenAI fallback deliverables API call failed:', fallbackError.message || fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  } else {
    throw new Error('No AI API available for deliverables. Please check your environment configuration.');
  }
}

/**
 * Generate AI contribution response with conditional API selection
 * @param {string} userInput - User input
 * @param {Object} personaConfig - Persona configuration (temperature, max_tokens)
 * @param {string} systemInstruction - System instructions
 * @returns {Promise<string>} Contribution response
 */
export async function generateAIContribution(userInput, personaConfig, systemInstruction) {
  const primaryAPI = getPrimaryAPI();
  const fallbackAPI = getFallbackAPI();

  // Try primary API first
  if (primaryAPI === 'openai' && isAPIAvailable('openai')) {
    try {
      console.log('🚀 Making OpenAI API call for contribution (primary)...');
      return await callOpenAIContribution(userInput, personaConfig, systemInstruction);
    } catch (error) {
      console.error('[AI Service] OpenAI contribution API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'gemini' && isAPIAvailable('gemini')) {
        console.log('🚀 Falling back to Gemini API for contribution...');
        try {
          return await callGeminiContribution(userInput, personaConfig, systemInstruction);
        } catch (fallbackError) {
          console.error('[AI Service] Gemini fallback contribution API call failed:', fallbackError.message || fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  } else if (primaryAPI === 'gemini' && isAPIAvailable('gemini')) {
    try {
      console.log('🚀 Making Gemini API call for contribution (primary)...');
      return await callGeminiContribution(userInput, personaConfig, systemInstruction);
    } catch (error) {
      console.error('[AI Service] Gemini contribution API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'openai' && isAPIAvailable('openai')) {
        console.log('🚀 Falling back to OpenAI API for contribution...');
        try {
          return await callOpenAIContribution(userInput, personaConfig, systemInstruction);
        } catch (fallbackError) {
          console.error('[AI Service] OpenAI fallback contribution API call failed:', fallbackError.message || fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  } else {
    throw new Error('No AI API available for contribution. Please check your environment configuration.');
  }
}

/**
 * Generate AI project with conditional API selection
 * @param {string} prompt - Project generation prompt
 * @returns {Promise<Object>} Generated project data
 */
export async function generateAIProject(prompt) {
  const primaryAPI = getPrimaryAPI();
  const fallbackAPI = getFallbackAPI();

  // Try primary API first
  if (primaryAPI === 'openai' && isAPIAvailable('openai')) {
    try {
      console.log('🚀 Making OpenAI API call for project generation (primary)...');
      return await callOpenAIProject(prompt);
    } catch (error) {
      console.error('[AI Service] OpenAI project API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'gemini' && isAPIAvailable('gemini')) {
        console.log('🚀 Falling back to Gemini API for project generation...');
        try {
          return await generateProjectWithGemini(prompt);
        } catch (fallbackError) {
          console.error('[AI Service] Gemini fallback project API call failed:', fallbackError.message || fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  } else if (primaryAPI === 'gemini' && isAPIAvailable('gemini')) {
    try {
      console.log('🚀 Making Gemini API call for project generation (primary)...');
      return await generateProjectWithGemini(prompt);
    } catch (error) {
      console.error('[AI Service] Gemini project API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'openai' && isAPIAvailable('openai')) {
        console.log('🚀 Falling back to OpenAI API for project generation...');
        try {
          return await callOpenAIProject(prompt);
        } catch (fallbackError) {
          console.error('[AI Service] OpenAI fallback project API call failed:', fallbackError.message || fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  } else {
    throw new Error('No AI API available for project generation. Please check your environment configuration.');
  }
}

/**
 * Helper function to generate project with Gemini
 * @param {string} prompt - Project generation prompt
 * @returns {Promise<Object>} Generated project data
 */
async function generateProjectWithGemini(prompt) {
  // Gemini doesn't have direct project function, use generateAIResponse
  const systemPrompt = `You are an educational AI that creates engaging learning projects. 
Generate a project with:
- A compelling title (max 50 characters)
- A detailed description (2-3 sentences explaining the project)
- 3-5 specific deliverables (array of strings)

Format your response as JSON with keys: title, description, deliverables (array).

Example response:
{
  "title": "Market Research Analysis",
  "description": "Analyze consumer behavior in the tech industry through surveys, interviews, and data analysis to identify trends and opportunities.",
  "deliverables": ["Survey Design", "Data Collection", "Statistical Analysis", "Trend Report", "Recommendations"]
}`;

  const fullPrompt = `${systemPrompt}\n\nTopic: ${prompt}`;
  const response = await callGemini(fullPrompt, systemPrompt);
  
  // Try to parse JSON response
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    console.error('Error parsing Gemini response:', parseError);
  }
  
  // Fallback if JSON parsing fails
  return {
    title: "AI-Generated Learning Project",
    description: response.substring(0, 200) + "...",
    deliverables: ["Research", "Implementation", "Documentation"]
  };
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
    
    // Generate response using centralized AI service with fallback
    const response = await generateAIResponse(userMessage, enhancedPrompt);
    
    console.log(`[AI Service] ✅ Generated response for ${agentId} with context awareness`);
    console.log(`[AI Service] Response preview:`, response.substring(0, 100) + '...');
    
    return response;
    
  } catch (error) {
    console.error(`[AI Service] Error generating context-aware response:`, error);
    throw error;
  }
}

/**
 * Trigger AI agent response when mentioned in chat
 * Fetches context, generates response, and saves to chatMessages
 * 
 * @param {string} projectId - The project ID
 * @param {string} agentId - The AI agent ID (alex, rasoa, rakoto)
 * @param {Object} triggerMessage - The message that mentioned the agent
 * @param {Object} db - Firestore database instance
 * @returns {Promise<Object>} The generated message object
 */
export async function triggerAgentResponse(projectId, agentId, triggerMessage, db) {
  try {
    console.log(`[AI Service] 🤖 Triggering response for ${agentId} in project ${projectId}`);
    
    // 1. Fetch project data
    const projectDoc = await db.collection('userProjects').doc(projectId).get();
    if (!projectDoc.exists) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const projectData = projectDoc.data();
    
    // 2. Fetch recent chat messages for context
    const messagesSnapshot = await db.collection('userProjects')
      .doc(projectId)
      .collection('chatMessages')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();
    
    const conversationHistory = messagesSnapshot.docs
      .map(doc => doc.data())
      .reverse(); // Oldest first
    
    // 3. Build project info
    const projectInfo = {
      title: projectData.title || projectData.name || 'Untitled Project',
      currentDay: projectData.currentDay || 1,
      userId: projectData.userId,
      templateId: projectData.templateId
    };
    
    // 4. Generate AI response using existing context-aware function
    const aiResponse = await generateContextAwareResponse(
      agentId,
      projectId,
      projectInfo.userId,
      projectInfo.currentDay,
      triggerMessage.content
    );
    
    // 5. Generate unique message ID
    const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // 6. Create message object
    const agent = AI_AGENTS[agentId];
    const responseMessage = {
      messageId: generateId(),
      projectId: projectId,
      senderId: agentId,
      senderName: agent?.name || agentId,
      senderType: 'ai',
      content: aiResponse,
      timestamp: Date.now(),
      type: 'message',
      inReplyTo: triggerMessage.messageId || null
    };
    
    // 7. Save to chatMessages
    await db.collection('userProjects')
      .doc(projectId)
      .collection('chatMessages')
      .add(responseMessage);
    
    console.log(`[AI Service] ✅ ${agentId} responded successfully`);
    
    return responseMessage;
    
  } catch (error) {
    console.error(`[AI Service] ❌ Error triggering agent response for ${agentId}:`, error);
    throw error;
  }
}


/**
 * Generate AI-specific completion messages
 * @param {string} aiType - The AI teammate ID (alex, rasoa, rakoto)
 * @param {string} taskType - The task type (write, review, suggest)
 * @returns {Promise<string>} The completion message
 */
export async function generateCompletionMessage(aiType, taskType) {
  // Get the correct AI teammate
  let aiTeammate;
  if (['brown', 'elza', 'kati', 'steve', 'sam', 'rasoa', 'rakoto'].includes(aiType)) {
      aiTeammate = AI_AGENTS[aiType];
  } else if (aiType === 'ai_manager') {
      aiTeammate = AI_AGENTS.rasoa; // Legacy ai_manager maps to rasoa
  } else if (aiType === 'ai_helper') {
      aiTeammate = AI_AGENTS.rakoto; // Legacy ai_helper maps to rakoto
  } else {
      aiTeammate = AI_AGENTS.rasoa; // Default fallback
  }
  
  const completionPrompts = {
      write: `Generate a short, casual completion message (1-2 sentences max) for when you finish writing a section. Be true to your personality: ${aiTeammate.personality}. Make it sound natural and in character.`,
      review: `Generate a short, casual completion message (1-2 sentences max) for when you finish reviewing content. Be true to your personality: ${aiTeammate.personality}. Make it sound natural and in character.`,
      suggest: `Generate a short, casual completion message (1-2 sentences max) for when you finish suggesting improvements. Be true to your personality: ${aiTeammate.personality}. Make it sound natural and in character.`
  };
  
  const prompt = completionPrompts[taskType] || completionPrompts.write;
  
  try {
      // Create proper config object from teammate properties
      const config = {
          max_tokens: aiTeammate.maxTokens || 500,
          temperature: aiTeammate.temperature || 0.7
      };
      
      const systemInstruction = `You are ${aiTeammate.name}, ${aiTeammate.role}. ${aiTeammate.personality}`;
      
      const aiResponse = await generateAIContribution(prompt, config, systemInstruction);
      return cleanAIResponse(aiResponse);
  } catch (error) {
      console.error('[AI Service]: Error generating completion message:', error);
      // Fallback to default messages
      return aiType === 'ai_manager' ? '✅ Done — anything else to assign?' : '😴 I did something… kind of.';
  }
}