// AI service layer - handles LLM interactions and context building
import { generateAIResponse as callOpenAI, generateAIContribution as callOpenAIContribution, generateAIProject as callOpenAIProject } from '../api/openaiService.js';
import { generateAIResponse as callGemini, generateGradeResponse as callGeminiGrade, generateDeliverablesResponse as callGeminiDeliverables, generateAIContribution as callGeminiContribution } from '../api/geminiService.js';
import { AI_AGENTS } from '../config/aiAgents.js';
import { getAgentContext, buildEnhancedPrompt } from './contextService.js';
import { getAIConfig, getPrimaryAPI, getFallbackAPI, isAPIAvailable } from './aiConfigService.js';
import { getDocumentById, querySubcollection, addSubdocument } from './databaseService.js';
import { storeMessage } from '../config/conversationMemory.js';
import { getProjectDay } from '../utils/chatUtils.js';

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

  // Try primary API first
  if (primaryAPI === 'openai' && isAPIAvailable('openai')) {
    try {
      return await callOpenAI(userContent, contextualPrompt);
    } catch (error) {
      console.error('[AI Service] OpenAI API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'gemini' && isAPIAvailable('gemini')) {
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
      return await callGemini(userContent, contextualPrompt);
    } catch (error) {
      console.error('[AI Service] Gemini API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'openai' && isAPIAvailable('openai')) {
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
      // OpenAI doesn't have a direct grade function, so we use generateAIResponse
      return await callOpenAI(userSubmission, systemInstruction);
    } catch (error) {
      console.error('[AI Service] OpenAI grading API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'gemini' && isAPIAvailable('gemini')) {
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
      return await callGeminiGrade(userSubmission, systemInstruction);
    } catch (error) {
      console.error('[AI Service] Gemini grading API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'openai' && isAPIAvailable('openai')) {
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
      return await callOpenAI(title, systemInstruction);
    } catch (error) {
      console.error('[AI Service] OpenAI deliverables API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'gemini' && isAPIAvailable('gemini')) {
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
      return await callGeminiDeliverables(title, systemInstruction);
    } catch (error) {
      console.error('[AI Service] Gemini deliverables API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'openai' && isAPIAvailable('openai')) {
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
      return await callOpenAIContribution(userInput, personaConfig, systemInstruction);
    } catch (error) {
      console.error('[AI Service] OpenAI contribution API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'gemini' && isAPIAvailable('gemini')) {
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
      return await callGeminiContribution(userInput, personaConfig, systemInstruction);
    } catch (error) {
      console.error('[AI Service] Gemini contribution API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'openai' && isAPIAvailable('openai')) {
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
      return await callOpenAIProject(prompt);
    } catch (error) {
      console.error('[AI Service] OpenAI project API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'gemini' && isAPIAvailable('gemini')) {
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
      return await generateProjectWithGemini(prompt);
    } catch (error) {
      console.error('[AI Service] Gemini project API call failed:', error.message || error);
      
      // Try fallback if available
      if (fallbackAPI === 'openai' && isAPIAvailable('openai')) {
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
    return summaryCache.get(cacheKey);
  }
  
  // Generate new summary
  const summary = recentChats
    .slice(-15)
    .map(chat => `${chat.senderName}: ${chat.text || chat.content}`)
    .join('\n');
  
  summaryCache.set(cacheKey, summary);
  
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
  // Quick fallback for testing when AI APIs are not available
  const mockResponses = {
    'steve': `Hey! I'm Steve, your technical problem-solver. I see you're working on this project. Let me help you break down the technical challenges and find practical solutions. What specific technical aspect would you like to tackle first?`,
    'kati': `Hi there! I'm Kati, your creative collaborator. I love bringing fresh ideas and creative approaches to projects. What creative challenges are you facing? I'm here to help you think outside the box!`,
    'brown': `Hello! I'm Brown, your strategic researcher. I focus on methodology and connecting ideas to bigger frameworks. What research questions do you have? I can help you structure your approach.`,
    'elza': `Hey! I'm Elza, your creative problem solver. I bring enthusiasm and innovative thinking to the team. What creative solutions are we exploring today?`,
    'sam': `Hi! I'm Sam, your communication specialist. I help make complex ideas clear and engaging. How can I help you communicate your project better?`,
    'rasoa': `Hello! I'm Rasoa, your project coordinator. I keep things organized and on track. What project management challenges can I help you with?`,
    'rakoto': `Hey! I'm Rakoto, your data analyst. I help make sense of information and find patterns. What data or analysis do you need help with?`
  };
  
  try {
    // Get comprehensive context
    const context = await getAgentContext(projectId, userId, currentDay, agentId);
    
    // Build enhanced prompt with full awareness
    const enhancedPrompt = buildEnhancedPrompt(agentId, context, userMessage);
    console.log('🌹🌹🌹🌹🌹🌹🌹 here is the enhance Prompt',enhancedPrompt)

    // Generate response using centralized AI service with fallback
    let response;
    try {
      response = await generateAIResponse(userMessage, enhancedPrompt);
    } catch (error) {
      // Mock response when AI APIs are not available
      const mockResponses = {
        'steve': `Let's break down the technical challenges and find practical solutions. What specific technical aspect would you like to tackle first?`,
        'kati': `I love bringing fresh ideas and creative approaches to projects. What creative challenges are you facing? I'm here to help you think outside the box!`,
        'brown': `I focus on methodology and connecting ideas to bigger frameworks. What research questions do you have? I can help you structure your approach.`,
        'elza': `I bring enthusiasm and innovative thinking to the team. What creative solutions are we exploring today?`,
        'sam': `I help make complex ideas clear and engaging. How can I help you communicate your project better?`,
        'rasoa': `I keep things organized and on track. What project management challenges can I help you with?`,
        'rakoto': `I help make sense of information and find patterns. What data or analysis do you need help with?`
      };
      response = mockResponses[agentId] || `I'm here to help with your project. What would you like to work on?`;
    }
    
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
export async function triggerAgentResponse(projectId, agentId, triggerMessage) {
  // Quick fallback for testing when AI APIs are not available
  const mockResponses = {
    'steve': `Hey! I'm Steve, your technical problem-solver. I see you're working on this project. Let me help you break down the technical challenges and find practical solutions. What specific technical aspect would you like to tackle first?`,
    'kati': `Hi there! I'm Kati, your creative collaborator. I love bringing fresh ideas and creative approaches to projects. What creative challenges are you facing? I'm here to help you think outside the box!`,
    'brown': `Hello! I'm Brown, your strategic researcher. I focus on methodology and connecting ideas to bigger frameworks. What research questions do you have? I can help you structure your approach.`,
    'elza': `Hey! I'm Elza, your creative problem solver. I bring enthusiasm and innovative thinking to the team. What creative solutions are we exploring today?`,
    'sam': `Hi! I'm Sam, your communication specialist. I help make complex ideas clear and engaging. How can I help you communicate your project better?`,
    'rasoa': `Hello! I'm Rasoa, your project coordinator. I keep things organized and on track. What project management challenges can I help you with?`,
    'rakoto': `Hey! I'm Rakoto, your data analyst. I help make sense of information and find patterns. What data or analysis do you need help with?`
  };
  
  try {
    
    // 1. Fetch project data
    const projectData = await getDocumentById('userProjects', projectId);
    if (!projectData) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    // 2. Fetch recent chat messages for context
    const messages = await querySubcollection('userProjects', projectId, 'chatMessages');
    const conversationHistory = messages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
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
    await addSubdocument('userProjects', projectId, 'chatMessages', null, responseMessage);
    
    // Store AI response in conversation memory for future context
    const currentDay = getProjectDay(projectData.startDate);
    storeMessage(projectId, currentDay, {
      id: responseMessage.messageId,
      senderId: responseMessage.senderId,
      senderName: responseMessage.senderName,
      content: responseMessage.content,
      timestamp: responseMessage.timestamp,
      type: responseMessage.type
    });
    
    return responseMessage;
    
  } catch (error) {
    console.error(`[AI Service] ❌ Error triggering agent response for ${agentId}:`, error);
    throw error;
  }
}
