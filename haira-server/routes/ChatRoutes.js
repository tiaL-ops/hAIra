// Phase 3: Chat Routes with Teammates Sync + Context Awareness

import express from 'express';
import admin from 'firebase-admin';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import {
  getTeammates,
  getTeammate,
  updateTeammateStats,
  isTeammateAvailable,
  extractMentions,
  getSleepResponse
} from '../services/teammateService.js';
import { 
  getUserMessageCountSince, 
  firebaseAvailable, 
  getDocumentById, 
  querySubcollection,
  addSubdocument,
  updateDocument
} from '../services/databaseService.js';
import { getProjectDay } from '../utils/chatUtils.js';
import { storeMessage, getConversationSummary } from '../config/conversationMemory.js';
import { storeProjectData } from '../config/taskMemory.js';

// Context-aware AI imports
import { 
  generateAIResponse, 
  generateContextAwareResponse 
} from '../services/aiService.js';
import { AI_AGENTS } from '../config/aiAgents.js';
import { trimToSentences } from '../utils/chatUtils.js';
import { getAgentContext, buildEnhancedPrompt } from '../services/contextService.js';

const router = express.Router();

// Check if enhanced context is available
const USE_ENHANCED_CONTEXT = typeof generateContextAwareResponse === 'function';

const getFieldValue = () => {
  if (firebaseAvailable) {
    try {
      return admin.firestore.FieldValue;
    } catch (error) {
      console.warn('Firebase admin not available, using mock FieldValue');
    }
  }
  return {
    increment: (value) => ({ _increment: value }),
    serverTimestamp: () => ({ _serverTimestamp: true, _value: Date.now() })
  };
};

/**
 * Generate intelligent sign-off with context
 */
async function generateIntelligentSignOff(lastMessage, projectId, currentDay) {
  try {
    const tasks = await querySubcollection('userProjects', projectId, 'tasks');
    const completedTasks = tasks.filter(t => t.status === 'done');
    const inProgressTasks = tasks.filter(t => t.status === 'inprogress');
    
    let signOffMessage = `That's your 7 messages for today! `;
    
    if (completedTasks.length > 0) {
      signOffMessage += `Great work completing ${completedTasks.length} task${completedTasks.length > 1 ? 's' : ''}! `;
    }
    
    if (inProgressTasks.length > 0) {
      signOffMessage += `Keep up the momentum on the ${inProgressTasks.length} task${inProgressTasks.length > 1 ? 's' : ''} in progress. `;
    }
    
    signOffMessage += `See you tomorrow! 👋`;
    return signOffMessage;
  } catch (error) {
    console.error('[SignOff] Error:', error);
    return "Great progress today! See you tomorrow! 👋";
  }
}

/**
 * Generate context-aware AI response (inline - replaces triggerAgentResponse)
 */
async function generateAgentResponseWithContext(projectId, agentId, userMessage, currentDay, userId) {
  // main problem HERE IS THAT GENERATE RESPONSE IS NOT GETTING ENOUGH CONTEXT
  try {
    console.log("🥳 Time tio get an awmnser, what we know:")
console.log({
  projectId: projectId,
  agentID: agentId,
  userMessage: userMessage,
  dayWeAre: currentDay,
  userId: userId
});

    const agentName = AI_AGENTS[agentId]?.name || agentId;
    let aiResponse;
    
    // Try enhanced context first
    if (USE_ENHANCED_CONTEXT) {
      try {
        console.log(`🔥🔥🔥🔥🔥🔥[Context] Generating enhanced context response for ${agentName}`);
        aiResponse = await generateContextAwareResponse(
          agentId, 
          projectId, 
          userId, 
          currentDay, 
          userMessage.content
        );
      } catch (enhancedError) {
        console.error(`⚠️ Enhanced context failed for ${agentName}:`, enhancedError.message);
      }
    }
    
    // Fallback: Standard context method
    if (!aiResponse) {
      console.log(` 😿😿😿😿😿😿😿😿😿 Standart ${agentName}`);
      // Get recent messages
      const recentMessages = await querySubcollection('userProjects', projectId, 'chatMessages', {
        orderBy: [{ field: 'timestamp', direction: 'desc' }],
        limit: 15
      });
      
      // Get conversation from memory
      const memoryConversation = getConversationSummary(projectId, currentDay);
      const dbConv = recentMessages.reverse().map(c => `${c.senderName}: ${c.content}`).join('\n');
      const conversationContext = memoryConversation || dbConv;
      
      // Get tasks for context
      const tasks = await querySubcollection('userProjects', projectId, 'tasks');
      const projectDoc = await getDocumentById('userProjects', projectId);
      
      const projectData = {
        project: {
          title: projectDoc?.title || 'Untitled Project',
          startDate: projectDoc?.startDate
        },
        tasks: tasks
      };
      
      // Build prompt with context
      const prompt = buildContextualPrompt(agentId, { 
        projectData, 
        conversationSummary: conversationContext, 
        currentDay 
      }, recentMessages);
      
      aiResponse = await generateAIResponse(userMessage.content, prompt);
      aiResponse = trimToSentences(aiResponse, 50);
    }
    
    // Ensure response has agent name prefix
    if (!aiResponse.startsWith(agentName + ':')) {
      aiResponse = `${agentName}: ${aiResponse}`;
    }
    
    return aiResponse;
    
  } catch (error) {
    console.error(`❌ Error generating response for ${agentId}:`, error);
    const agentName = AI_AGENTS[agentId]?.name || agentId;
    return `${agentName}: I'm having trouble responding right now. Let me get back to you!`;
  }
}

/**
 * GET /api/project/:id/chat
 */
router.get('/:id/chat', verifyFirebaseToken, async (req, res) => {
  const { id: projectId } = req.params;
  const userId = req.user.uid;

  try {
    const projectDoc = await getDocumentById('userProjects', projectId);
    
    if (!projectDoc) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectDoc.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await querySubcollection('userProjects', projectId, 'chatMessages', {
      orderBy: [{ field: 'timestamp', direction: 'asc' }],
      limit: 100
    });

    const teammates = await getTeammates(projectId);
    const teammatesMap = teammates.reduce((acc, teammate) => {
      acc[teammate.id] = teammate;
      return acc;
    }, {});

    const enrichedMessages = messages.map(msg => {
      const sender = teammatesMap[msg.senderId];
      return {
        ...msg,
        senderName: sender?.name || 'Unknown',
        senderAvatar: sender?.avatar || null,
        senderColor: sender?.color || '#cccccc',
        senderRole: sender?.role || 'Unknown',
        senderStatus: sender?.state?.status || 'offline',
        senderType: sender?.type || 'unknown'
      };
    });

    const availability = {};
    const currentDay = getProjectDay(new Date(projectDoc?.startDate || Date.now()));
    
    for (const teammate of teammates) {
      if (teammate.type === 'ai') {
        availability[teammate.id] = await isTeammateAvailable(projectId, teammate.id);
      }
    }

    // Store project data in memory
    try {
      const tasks = await querySubcollection('userProjects', projectId, 'tasks');
      storeProjectData(projectId, tasks, {
        title: projectDoc.title || 'Untitled Project',
        currentDay: currentDay,
        userId: projectDoc.userId
      });
    } catch (error) {
      console.error('[Memory] Error storing project data:', error);
    }

    res.json({
      chats: enrichedMessages,
      teammates: teammatesMap,
      availability,
      currentDay
    });

  } catch (error) {
    console.error('❌ Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/project/:id/chat
 * WITH FULL CONTEXT AWARENESS
 */
router.post('/:id/chat', verifyFirebaseToken, async (req, res) => {
  const { id: projectId } = req.params;
  const { content } = req.body;
  const userId = req.user.uid;

  try {
    // 1. Validate request
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // 2. Verify project access
    const projectDoc = await getDocumentById('userProjects', projectId);
    
    if (!projectDoc) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectDoc.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 3. Validate user is a teammate
    const userTeammate = await getTeammate(projectId, userId);
    
    if (!userTeammate) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    // 4. Check quota
    const projectStart = new Date(projectDoc?.startDate || Date.now());
    const currentDay = getProjectDay(projectStart);
    const userMsgsToday = await getUserMessageCountSince(projectId, userId, projectStart, currentDay);
    
    if (userMsgsToday >= 7) {
      return res.status(429).json({ 
        error: 'Daily message limit reached',
        quotaExceeded: true,
        messagesUsedToday: userMsgsToday,
        dailyLimit: 7,
        currentProjectDay: currentDay
      });
    }
    
    let quotaWarning = null;
    if (userMsgsToday >= 5) {
      const remaining = 7 - userMsgsToday;
      quotaWarning = `${remaining} message${remaining === 1 ? '' : 's'} remaining today`;
    }

    // 5. Create and save user message
    const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const message = {
      messageId: generateId(),
      projectId: projectId,
      senderId: userId,
      senderName: userTeammate.name,
      senderType: userTeammate.type,
      content: content.trim(),
      timestamp: Date.now(),
      type: 'message'
    };
    console.log("POPOOO HERE IS THE MESSAGE: ", message)
    await addSubdocument('userProjects', projectId, 'chatMessages', null, message);

    // 6. Store in memory for AI context
    storeMessage(projectId, currentDay, {
      id: message.messageId,
      senderId: message.senderId,
      senderName: message.senderName,
      content: message.content,
      timestamp: message.timestamp,
      type: message.type
    });

    // 7. Update task memory
    try {
      const tasks = await querySubcollection('userProjects', projectId, 'tasks');
      storeProjectData(projectId, tasks, {
        title: projectDoc.title || 'Untitled Project',
        currentDay: currentDay,
        userId: projectDoc.userId
      });
      
    } catch (taskError) {
      console.error('[Memory] Error updating task memory:', taskError);
    }

    // 8. Update user stats
    await updateTeammateStats(projectId, userId, {
      'stats.messagesSent': getFieldValue()?.increment(1),
      'state.lastActive': Date.now(),
      'state.status': 'online'
    });

    // 9. Extract mentions
    const mentions = extractMentions(content);

    const mentionsHandled = [];
    
    // 10. Handle mentions WITH CONTEXT
    for (const mentionedId of mentions) {
      try {
        const mentionedTeammate = await getTeammate(projectId, mentionedId);
        
        if (!mentionedTeammate || mentionedTeammate.type === 'human') {
          continue;
        }

        const availabilityCheck = await isTeammateAvailable(projectId, mentionedId);
        
        if (availabilityCheck.available) {
          
          try {
            // Generate response WITH CONTEXT
            const aiResponse = await generateAgentResponseWithContext(
              projectId, 
              mentionedId, 
              message, 
              currentDay, 
              userId
            );
            
            const agentName = AI_AGENTS[mentionedId]?.name || mentionedTeammate.name;
            
            // Save AI response
            const aiMessage = {
              messageId: generateId(),
              projectId: projectId,
              senderId: mentionedId,
              senderName: agentName,
              senderType: 'ai',
              content: aiResponse,
              timestamp: Date.now(),
              type: 'message'
            };
            
            await addSubdocument('userProjects', projectId, 'chatMessages', null, aiMessage);
            
            // Store in memory
            storeMessage(projectId, currentDay, {
              id: aiMessage.messageId,
              senderId: mentionedId,
              senderName: agentName,
              content: aiResponse,
              timestamp: aiMessage.timestamp,
              type: 'message'
            });
            
            await updateTeammateStats(projectId, mentionedId, {
              'stats.messagesSent': getFieldValue()?.increment(1),
              'state.lastActive': Date.now(),
              'state.status': 'online'
            });
            
            mentionsHandled.push({
              teammateId: mentionedId,
              name: agentName,
              responded: true
            });
            
            
          } catch (aiError) {
            console.error(`❌ AI error for ${mentionedTeammate.name}:`, aiError);
            mentionsHandled.push({
              teammateId: mentionedId,
              name: mentionedTeammate.name,
              responded: false,
              error: 'Failed to generate response'
            });
          }
          
        } else {
          // Unavailable - sleep response
          
          const sleepMessage = getSleepResponse(mentionedTeammate, availabilityCheck);
          
          await addSubdocument('userProjects', projectId, 'chatMessages', null, {
            messageId: generateId(),
            projectId: projectId,
            senderId: mentionedId,
            senderName: mentionedTeammate.name,
            senderType: 'ai',
            content: sleepMessage,
            timestamp: Date.now(),
            type: 'system'
          });
          
          await updateTeammateStats(projectId, mentionedId, {
            'stats.missedMentions': getFieldValue()?.increment(1)
          });
          
          mentionsHandled.push({
            teammateId: mentionedId,
            name: mentionedTeammate.name,
            responded: false,
            reason: availabilityCheck.reason,
            sleepMessage: sleepMessage
          });
        }
        
      } catch (mentionError) {
        console.error(`❌ Mention error for ${mentionedId}:`, mentionError);
      }
    }

    // 11. Auto-responses (no mentions) WITH CONTEXT
    const probabilityHandled = [];
    
    if (mentions.length === 0) {
      
      const allTeammates = await getTeammates(projectId);
      const aiTeammates = allTeammates.filter(t => t.type === 'ai');
      
      for (const teammate of aiTeammates) {
        const agentId = teammate.id;
        
        try {
          const availabilityCheck = await isTeammateAvailable(projectId, agentId);
          
          if (availabilityCheck.available) {
            
            try {
              // Generate response WITH CONTEXT
              const aiResponse = await generateAgentResponseWithContext(
                projectId, 
                agentId, 
                message, 
                currentDay, 
                userId
              );
              
              const agentName = AI_AGENTS[agentId]?.name || teammate.name;
              
              const aiMessage = {
                messageId: generateId(),
                projectId: projectId,
                senderId: agentId,
                senderName: agentName,
                senderType: 'ai',
                content: aiResponse,
                timestamp: Date.now(),
                type: 'message'
              };
              
              await addSubdocument('userProjects', projectId, 'chatMessages', null, aiMessage);
              
              storeMessage(projectId, currentDay, {
                id: aiMessage.messageId,
                senderId: agentId,
                senderName: agentName,
                content: aiResponse,
                timestamp: aiMessage.timestamp,
                type: 'message'
              });
              
              await updateTeammateStats(projectId, agentId, {
                'stats.messagesSent': getFieldValue()?.increment(1),
                'state.lastActive': Date.now(),
                'state.status': 'online'
              });
              
              probabilityHandled.push({
                teammateId: agentId,
                name: agentName,
                responded: true,
                trigger: 'auto-response'
              });
              
              
            } catch (aiError) {
              console.error(`❌ Auto-response error for ${teammate.name}:`, aiError);
              probabilityHandled.push({
                teammateId: agentId,
                name: teammate.name,
                responded: false,
                error: 'Failed to generate response',
                trigger: 'auto-response'
              });
            }
          } else {
            probabilityHandled.push({
              teammateId: agentId,
              name: teammate.name,
              responded: false,
              reason: availabilityCheck.reason,
              trigger: 'auto-response'
            });
          }
          
        } catch (probError) {
          console.error(`❌ Auto-response error for ${agentId}:`, probError);
        }
      }
    }

    // 12. Intelligent sign-off on 7th message
    if (userMsgsToday === 6) {
      
      try {
        const signOffMessage = await generateIntelligentSignOff(content, projectId, currentDay);
        
        await addSubdocument('userProjects', projectId, 'chatMessages', null, {
          messageId: generateId(),
          projectId: projectId,
          senderId: 'rasoa',
          senderName: 'Rasoa',
          senderType: 'ai',
          content: signOffMessage,
          timestamp: Date.now(),
          type: 'system'
        });
        
        storeMessage(projectId, currentDay, {
          senderId: 'rasoa',
          senderName: 'Rasoa',
          content: signOffMessage,
          timestamp: Date.now(),
          type: 'system'
        });
      } catch (signOffError) {
        console.error(`❌ Sign-off error:`, signOffError);
      }
    }

    // 13. Fetch all messages
    const allMessages = await querySubcollection('userProjects', projectId, 'chatMessages', {
      orderBy: [{ field: 'timestamp', direction: 'asc' }]
    });

    // 14. Return response
    const messagesAfterThis = userMsgsToday + 1;
    const remainingAfterThis = 7 - messagesAfterThis;
    
    res.json({
      success: true,
      chats: allMessages,
      message: message,
      mentionsHandled: mentionsHandled,
      probabilityHandled: probabilityHandled,
      currentProjectDay: currentDay,
      quotaWarning: remainingAfterThis > 0 && remainingAfterThis <= 2 
        ? `${remainingAfterThis} message${remainingAfterThis === 1 ? '' : 's'} remaining today`
        : null,
      quotaExceeded: messagesAfterThis >= 7,
      messagesUsedToday: messagesAfterThis,
      dailyLimit: 7
    });

  } catch (error) {
    console.error('❌ POST /:id/chat ERROR:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

/**
 * POST /api/project/:id/init-teammates
 */
router.post('/:id/init-teammates', verifyFirebaseToken, async (req, res) => {
  const { id: projectId } = req.params;
  const { selectedAgents } = req.body;
  const userId = req.user.uid;

  try {
    const projectDoc = await getDocumentById('userProjects', projectId);
    
    if (!projectDoc) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectDoc.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const teammates = await querySubcollection('userProjects', projectId, 'teammates');

    if (teammates.length > 0) {
      return res.json({ 
        success: true, 
        message: 'Teammates already initialized',
        count: teammates.length
      });
    }

    const validAgents = ['brown', 'elza', 'kati', 'steve', 'sam', 'rasoa', 'rakoto'];
    const agentsToCreate = selectedAgents && Array.isArray(selectedAgents) 
      ? selectedAgents.filter(id => validAgents.includes(id)).slice(0, 2)
      : ['brown', 'elza'];
    
    if (agentsToCreate.length === 0) {
      return res.status(400).json({ error: 'Please select at least one valid teammate' });
    }

    const humanTeammate = {
      id: userId,
      name: projectDoc.userName || 'You',
      type: 'human',
      role: 'Project Owner',
      avatar: '👤',
      color: '#2196F3',
      config: {
        maxMessagesPerDay: 7,
        isActive: true
      },
      state: {
        messagesLeftToday: 7,
        lastActiveDay: 0,
        status: 'online'
      },
      stats: {
        messagesSent: 0,
        messagesReceived: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
      },
      joinedAt: firebaseAvailable ? getFieldValue()?.serverTimestamp() : Date.now()
    };
    await addSubdocument('userProjects', projectId, 'teammates', userId, humanTeammate);

    let agentCount = 0;

    for (const agentId of agentsToCreate) {
      const agent = AI_AGENTS[agentId];
      if (!agent) continue;

      const aiTeammate = {
        id: agentId,
        name: agent.name,
        type: 'ai',
        role: agent.role,
        avatar: agent.avatar || '🤖',
        color: agent.color || '#666666',
        emoji: agent.emoji || agent.avatar || '🤖',
        personality: agent.personality || 'Helpful AI assistant',
        config: {
          isActive: true,
          activeDays: agent.activeDays || [0, 1, 2, 3, 4, 5, 6],
          activeHours: agent.activeHours || { start: 0, end: 24 },
          messageQuota: {
            daily: agent.maxMessagesPerDay || 10,
            perResponse: 1
          },
          maxMessagesPerDay: agent.maxMessagesPerDay || 10,
          maxTokens: agent.maxTokens || 500,
          temperature: agent.temperature || 0.7,
          sleepResponses: agent.sleepResponses || []
        },
        prompt: {
          systemPrompt: agent.systemPrompt || '',
          exampleMessages: agent.exampleMessages || {}
        },
        state: {
          isAvailable: true,
          messagesLeftToday: agent.maxMessagesPerDay || 10,
          lastActiveDay: 0,
          sleepUntilDay: null,
          status: 'online'
        },
        stats: {
          messagesSent: 0,
          messagesReceived: 0,
          tasksAssigned: 0,
          tasksCompleted: 0,
          missedMentions: 0,
          lastResetDate: new Date().toISOString().split('T')[0]
        },
        joinedAt: firebaseAvailable ? getFieldValue()?.serverTimestamp() : Date.now()
      };

      await addSubdocument('userProjects', projectId, 'teammates', agentId, aiTeammate);
      agentCount++;
    }

    const teamArray = [
      {
        id: userId,
        name: projectDoc.userName || 'You',
        role: 'Project Owner',
        type: 'human'
      },
      ...agentsToCreate.map(agentId => {
        const agent = AI_AGENTS[agentId];
        return {
          id: agentId,
          name: agent.name,
          role: agent.role,
          type: 'ai'
        };
      })
    ];

    await updateDocument('userProjects', projectId, {
      team: teamArray,
      teamUpdatedAt: firebaseAvailable ? getFieldValue()?.serverTimestamp() : Date.now()
    });

    res.json({
      success: true,
      message: 'Teammates initialized successfully',
      count: agentCount + 1
    });

  } catch (error) {
    console.error('❌ Error initializing teammates:', error);
    res.status(500).json({ error: 'Failed to initialize teammates' });
  }
});

export default router;