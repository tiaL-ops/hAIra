// routes/chat.js — compact orchestrator with enhanced context awareness
import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import {
  ensureProjectExists,
  getChats,
  addUserChat,
  addChat,
  getProjectWithTasks,
  getUserMessageCountSince
} from '../services/firebaseService.js';
import { generateAIResponse, buildContextualPrompt, generateContextAwareResponse } from '../services/aiService.js';
import { AI_AGENTS } from '../config/aiAgents.js';
import { trimToSentences, getProjectDay, decideResponders } from '../utils/chatUtils.js';
import { storeMessage, getConversationHistory, getConversationSummary } from '../config/conversationMemory.js';
import { storeProjectData, formatTasksForAI, extractTasksFromChat } from '../config/taskMemory.js';
import { clearOldContextCache } from '../services/dailyContextCache.js';
import { getAgentContext } from '../services/contextService.js'; // Import for intelligent sign-off

const router = express.Router();
const USE_SUBCOLLECTIONS = true;
let USE_ENHANCED_CONTEXT = true; // Enable full context awareness for AI agents

/**
 * Generate intelligent sign-off message that addresses the last message and summarizes tasks
 * @param {string} lastMessage - The user's last message
 * @param {Object} context - Enhanced context with tasks and conversation insights
 * @param {number} currentDay - Current project day
 * @returns {Promise<string>} Intelligent sign-off message
 */
async function generateIntelligentSignOff(lastMessage, context, currentDay) {
  try {
    // Build task summary for sign-off
    let taskSummary = '';
    if (context.allTasks && context.allTasks.length > 0) {
      const activeTasks = context.allTasks.filter(task => !task.completed);
      const completedTasks = context.allTasks.filter(task => task.completed);
      
      if (activeTasks.length > 0) {
        taskSummary = `\n\n📋 Today's progress: We have ${activeTasks.length} active tasks`;
        if (completedTasks.length > 0) {
          taskSummary += ` and completed ${completedTasks.length} tasks`;
        }
        taskSummary += '.';
      }
    }
    
    // Build conversation insights summary
    let insightsSummary = '';
    if (context.enhancedConversationSummary) {
      const insights = context.enhancedConversationSummary;
      if (insights.potentialTasks && insights.potentialTasks.length > 0) {
        insightsSummary += `\n\n💡 We discussed some potential tasks that might need to be added to the Kanban board.`;
      }
      if (insights.actionItems && insights.actionItems.length > 0) {
        insightsSummary += `\n\n✅ We identified ${insights.actionItems.length} action items to follow up on.`;
      }
    }
    
    // Create personalized sign-off based on last message
    const lastMessageLower = lastMessage.toLowerCase();
    let personalizedResponse = '';
    
    if (lastMessageLower.includes('task') || lastMessageLower.includes('work') || lastMessageLower.includes('project')) {
      personalizedResponse = `Got it! I understand about the tasks and project work.${taskSummary}${insightsSummary}`;
    } else if (lastMessageLower.includes('tomorrow') || lastMessageLower.includes('next')) {
      personalizedResponse = `Perfect! Looking forward to continuing tomorrow.`;
    } else if (lastMessageLower.includes('thanks') || lastMessageLower.includes('thank')) {
      personalizedResponse = `You're welcome! Happy to help.`;
    } else {
      personalizedResponse = `Thanks for the update!`;
    }
    
    // Build the complete intelligent sign-off
    const signOffMessage = `${personalizedResponse}${taskSummary}${insightsSummary}\n\nSee you tomorrow! 👋`;
    
    console.log(`[ChatRoutes] Generated intelligent sign-off: "${signOffMessage}"`);
    return signOffMessage;
    
  } catch (error) {
    console.error('[ChatRoutes] Error generating intelligent sign-off:', error);
    return "Great progress today! See you tomorrow.";
  }
}

router.get('/:id/chat', verifyFirebaseToken, async (req, res) => {
  try {
    console.log("HELLO?")
    const { id } = req.params;
    if (USE_SUBCOLLECTIONS) await ensureProjectExists(id);

    // Load project to compute current day (and validate access)
    let projectData = null;
    try {
      projectData = await getProjectWithTasks(id, req.user.uid);
      
      // Store project data and tasks in memory for AI context
      if (projectData) {
        console.log(`[ChatRoutes][GET] Project title: ${projectData.project?.title || projectData.project?.name || 'Untitled'}`);
        console.log(`[ChatRoutes][GET] Tasks fetched from Firestore: ${projectData.tasks?.length || 0}`);
        
        if (projectData.tasks && projectData.tasks.length > 0) {
          console.log(`[ChatRoutes][GET] Task summary from Firestore:`);
          projectData.tasks.forEach((task, index) => {
            console.log(`[ChatRoutes][GET]   Task ${index + 1}: "${task.title || task.text}" -> ${task.assignedTo || 'unassigned'} [${task.status || 'no status'}]`);
          });
        }
        
        storeProjectData(
          id, 
          projectData.tasks || [], 
          projectData.project || { title: 'Untitled Project' }
        );
        console.log(`[ChatRoutes][GET] ✅ Project data stored in memory for AI agents`);
      } else {
        console.log(`[ChatRoutes][GET] ⚠️ No project data found for project ${id}`);
      }
    } catch (e) {
      // Non-fatal for listing chats, just log
      console.warn('[ChatRoutes][GET] Unable to load project for day calc:', e?.message || e);
    }
    const projectStart = new Date(projectData?.project?.startDate || Date.now());
    const currentDay = getProjectDay(projectStart);
    
    // Check message quota (7 messages per 24 hours)
    const userMsgsToday = await getUserMessageCountSince(id, req.user.uid, projectStart, currentDay);
    const quotaExceeded = userMsgsToday >= 7;
    let quotaWarning = null;
    if (userMsgsToday >= 5 && !quotaExceeded) {
      quotaWarning = `${7 - userMsgsToday} messages remaining today`;
    }

    // Fetch chats
    const chats = await getChats(id, USE_SUBCOLLECTIONS);
    
    // Extract potential tasks mentioned in chat messages
    const chatTasks = extractTasksFromChat(chats);
    if (chatTasks.length > 0) {
      console.log(`[ChatRoutes][GET] Extracted ${chatTasks.length} tasks from chat messages`);
      // Merge with existing tasks in memory
      storeProjectData(
        id,
        [...(projectData?.tasks || []), ...chatTasks],
        projectData?.project || { title: 'Untitled Project' }
      );
    }

    // Clean up old context cache periodically
    clearOldContextCache(id);

    // Decide responders "as soon as chat opens"
    // Use the latest user message content if available, otherwise empty string
    const lastUserMsg = (chats || []).find(c => c.senderId === req.user.uid || c.senderId === 'user');
    const contentForDecision = lastUserMsg?.text || lastUserMsg?.content || '';
    const { agents: responders, alexMentioned } = decideResponders(contentForDecision, currentDay, AI_AGENTS);

    // Mirror the same diagnostics you asked for in POST
    console.log(`[ChatRoutes][GET] Content (for decision): "${contentForDecision}"`);
    console.log(`[ChatRoutes][GET] Day: ${currentDay}, Alex active days:`, AI_AGENTS.alex.activeDays);
    console.log(`[ChatRoutes][GET] Responding agents:`, responders, `alexMentioned:`, alexMentioned);

    // Include day and responder preview in the response (non-breaking addition)
    return res.json({
      chats: chats || [],
      currentProjectDay: currentDay,
      responderPreview: responders,
      alexMentioned,
      quotaWarning,
      quotaExceeded,
      messagesUsedToday: userMsgsToday,
      dailyLimit: 7
    });
  } catch (err) {
    console.error('GET /:id/chat ERROR', err);
    return res.status(500).json({ error: 'Failed fetching chats', details: err.message });
  }
});

router.post('/:id/chat', verifyFirebaseToken, async (req, res) => {
  try {
     console.log("HELLO 2?")
    const { id } = req.params;
    const { content, testProjectDay } = req.body;
    const userId = req.user.uid;
    const userName = req.user.name || 'User';
    if (!content) return res.status(400).json({ error: 'Content required' });

    if (USE_SUBCOLLECTIONS) await ensureProjectExists(id, userId);
    const projectData = await getProjectWithTasks(id, userId);
    
    // Store project data and tasks in memory for AI context immediately
    if (projectData) {
      console.log(`[ChatRoutes][POST] Storing project data - Title: ${projectData.project?.title || projectData.project?.name || 'Untitled'}`);
      console.log(`[ChatRoutes][POST] Tasks count: ${projectData.tasks?.length || 0}`);
      
      if (projectData.tasks && projectData.tasks.length > 0) {
        console.log(`[ChatRoutes][POST] Task details from Firestore:`);
        projectData.tasks.forEach((task, index) => {
          console.log(`[ChatRoutes][POST]   Task ${index + 1}:`, {
            id: task.id,
            title: task.title || task.text || 'No title',
            assignedTo: task.assignedTo,
            status: task.status
          });
        });
      }
      
      storeProjectData(
        id, 
        projectData.tasks || [], 
        projectData.project || { title: 'Untitled Project' }
      );
      console.log(`[ChatRoutes][POST] ✅ Project data stored in memory for context service`);
    }
    
    const projectStart = new Date(projectData?.project?.startDate || Date.now());
    const currentDay = getProjectDay(projectStart, testProjectDay);

    // Check the user's daily message limit (7 messages per 24 hours)
    const userMsgsToday = await getUserMessageCountSince(id, userId, projectStart, currentDay);
    console.log(`[ChatRoutes] User has sent ${userMsgsToday}/7 messages in last 24 hours`);
    
    // Hard limit of 7 messages per 24 hours
    if (userMsgsToday >= 7) {
      return res.status(429).json({ 
        error: 'Daily message limit reached (7/24h)', 
        quotaExceeded: true,
        currentProjectDay: currentDay 
      });
    }
    
    // Warning when approaching limit (at 5/7 messages)
    let quotaWarning = null;
    if (userMsgsToday >= 5) {
      quotaWarning = `${7 - userMsgsToday} messages remaining today`;
    }

    const userChat = await addUserChat(id, content, userId, userName, USE_SUBCOLLECTIONS);
    const responses = [userChat];
    
    // Store the user message in memory for AI context
    storeMessage(id, currentDay, {
      senderId: userId,
      senderName: userName,
      content: content,
      timestamp: userChat.timestamp
    });

    const { agents: responders, alexMentioned } = decideResponders(content, currentDay, AI_AGENTS);
    console.log(`[ChatRoutes] Content: "${content}"`);
    console.log(`[ChatRoutes] Day: ${currentDay}, Alex active days:`, AI_AGENTS.alex.activeDays);
    console.log(`[ChatRoutes] Responding agents:`, responders, `alexMentioned:`, alexMentioned);
    
    // If Alex was mentioned but not active, add acknowledgment from teammates
    if (alexMentioned && !AI_AGENTS.alex.activeDays.includes(currentDay)) {
      console.log(`[ChatRoutes] Alex mentioned on day ${currentDay} but not active. Teammates will respond.`);
    }
    
    // Get conversations from memory for better context
    const memoryConversation = getConversationSummary(id, currentDay);
    console.log(`[ChatRoutes] Memory conversation available: ${memoryConversation.length > 0}`);
    
    for (const agentId of responders) {
      let text;
      let prompt = '';
      
      if (USE_ENHANCED_CONTEXT) {
        // Use enhanced context-aware response generation
        console.log(`[ChatRoutes] Using enhanced context for ${agentId}`);
        console.log(`[ChatRoutes] Project: ${id}, User: ${userId}, Day: ${currentDay}`);
        console.log(`[ChatRoutes] User message: "${content}"`);
        try {
          text = await generateContextAwareResponse(agentId, id, userId, currentDay, content);
          console.log(`[ChatRoutes] Generated response for ${agentId}: "${text.substring(0, 100)}..."`);
        } catch (e) {
          console.error('[ChatRoutes] Enhanced context error, falling back to standard:', e);
          // Fallback to standard method
          USE_ENHANCED_CONTEXT = false;
        }
      }
      
      if (!USE_ENHANCED_CONTEXT || !text) {
        // Standard context method (fallback) - include Firestore tasks explicitly
        const recent = await getChats(id, USE_SUBCOLLECTIONS);
        const dbConv = recent.slice(-15).map(c => `${c.senderName}: ${c.text || c.content}`).join('\n');
        const conv = memoryConversation || dbConv;

        const specialContext = alexMentioned && agentId !== 'alex'
          ? `IMPORTANT: Alex was mentioned but is not available today (Day ${currentDay}). Acknowledge this briefly if relevant to the question.`
          : null;

        // Ensure tasks are formatted for fallback prompt
        const formattedTasks = formatTasksForAI(id);

        prompt = buildContextualPrompt(
          agentId,
          {
            name: projectData?.project?.title || projectData?.project?.name || 'Untitled Project',
            currentDay,
            userName: req.user?.name || 'User',
            alexAvailable: AI_AGENTS.alex.activeDays.includes(currentDay),
            tasks: formattedTasks,
            conversationSummary: conv,
            specialContext
          },
          recent
        );

        text = await generateAIResponse(content, prompt).catch(e => {
          console.error('AI error', e);
          return `${AI_AGENTS[agentId].name}: Sorry, I'm having trouble right now.`;
        });
      }

      text = trimToSentences(text, 50);
      if (!text.startsWith(AI_AGENTS[agentId].name + ':')) text = `${AI_AGENTS[agentId].name}: ${text}`;
      const aiChat = await addChat(id, text, agentId, AI_AGENTS[agentId].name, prompt, USE_SUBCOLLECTIONS);
      
      // Store AI response in memory
      storeMessage(id, currentDay, {
        senderId: agentId,
        senderName: AI_AGENTS[agentId].name,
        content: text,
        timestamp: aiChat.timestamp
      });
      
      responses.push(aiChat);
    }

    // Add intelligent sign-off message if quota is reached (7/7 messages)
    if (userMsgsToday >= 6) { // This is the 7th message, so add sign-off
      try {
        // Get enhanced context for intelligent sign-off
        const context = await getAgentContext(id, userId, currentDay, 'rasoa');
        
        // Build intelligent sign-off message
        const signOffMessage = await generateIntelligentSignOff(content, context, currentDay);
        
        const signOffChat = await addChat(id, signOffMessage, 'rasoa', 'Rasoa', null, USE_SUBCOLLECTIONS);
        
        // Store sign-off message in memory
        storeMessage(id, currentDay, {
          senderId: 'rasoa',
          senderName: 'Rasoa',
          content: signOffMessage,
          timestamp: signOffChat.timestamp
        });
        
        responses.push(signOffChat);
      } catch (error) {
        console.error('[ChatRoutes] Error generating intelligent sign-off:', error);
        // Fallback to simple sign-off
        const fallbackSignOff = "Great progress today! See you tomorrow.";
        const signOffChat = await addChat(id, fallbackSignOff, 'rasoa', 'Rasoa', null, USE_SUBCOLLECTIONS);
        
        storeMessage(id, currentDay, {
          senderId: 'rasoa',
          senderName: 'Rasoa',
          content: fallbackSignOff,
          timestamp: signOffChat.timestamp
        });
        
        responses.push(signOffChat);
      }
    }

    return res.status(201).json({ 
      messages: responses, 
      currentProjectDay: currentDay,
      quotaWarning: quotaWarning,
      quotaExceeded: userMsgsToday >= 6, // Will be exceeded after this message
      messagesUsedToday: userMsgsToday + 1,
      dailyLimit: 7,
      activeAgents: responders
    });
  } catch (e) {
    console.error('POST /:id/chat ERROR:', e);
    console.error('Stack:', e.stack);
    return res.status(500).json({ error: 'Failed to create chat', details: e.message });
  }
});

export default router;
