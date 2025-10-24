// Phase 3: Chat Routes with Teammates Sync
import express from 'express';
import admin from 'firebase-admin';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import {
  getTeammates,
  getTeammate,
  validateTeammate,
  updateTeammateStats,
  isTeammateAvailable,
  extractMentions,
  getSleepResponse
} from '../services/teammateService.js';
import { triggerAgentResponse } from '../services/aiService.js';
import { getDefaultResponseAgents } from '../utils/chatUtils.js';
import { getUserMessageCountSince } from '../services/firebaseService.js';
import { getProjectDay } from '../utils/chatUtils.js';

const router = express.Router();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

/**
 * GET /api/project/:id/chat
 * Fetch chat messages with enriched teammate data and availability info
 */
router.get('/:id/chat', verifyFirebaseToken, async (req, res) => {
  const { id: projectId } = req.params;
  const userId = req.user.uid;

  try {
    // 1. Verify user has access to project
    const projectDoc = await db.collection('userProjects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 2. Fetch chat messages
    const messagesSnapshot = await db.collection('userProjects')
      .doc(projectId)
      .collection('chatMessages')
      .orderBy('timestamp', 'asc')
      .limit(100)
      .get();

    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 3. Fetch all teammates
    const teammates = await getTeammates(projectId);
    
    // Convert to object for easy lookup { teammateId: teammateData }
    const teammatesMap = teammates.reduce((acc, teammate) => {
      acc[teammate.id] = teammate;
      return acc;
    }, {});

    // 4. Enrich messages with teammate data
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

    // 5. Calculate availability for each AI agent
    const availability = {};
    const currentDay = projectDoc.data().currentDay || 1;
    
    for (const teammate of teammates) {
      if (teammate.type === 'ai') {
        availability[teammate.id] = await isTeammateAvailable(projectId, teammate.id);
      }
    }

    // 6. Return response
    res.json({
      chats: enrichedMessages,  // Use 'chats' for consistency with POST response
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
 * Send a chat message and sync with teammates
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

    // 2. Verify user has access to project
    const projectDoc = await db.collection('userProjects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

        // 3. Validate user is a teammate
    const userTeammate = await getTeammate(projectId, userId);
    
    if (!userTeammate) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    // 3.5. Check user's daily message quota (7 messages per 24 hours)
    // Use project data already fetched in step 2
    const projectData = projectDoc.data();
    const projectStart = new Date(projectData?.startDate || Date.now());
    const currentDay = getProjectDay(projectStart);
    
    // Count actual messages sent in last 24 hours
    const userMsgsToday = await getUserMessageCountSince(projectId, userId, projectStart, currentDay);
    console.log(`📊 User quota check: ${userMsgsToday}/7 messages sent in last 24 hours`);
    
    // Hard limit: 7 messages per 24 hours
    if (userMsgsToday >= 7) {
      return res.status(429).json({ 
        error: 'Daily message limit reached',
        message: 'You have reached your daily message limit. You can send 7 messages per 24 hours.',
        quotaExceeded: true,
        messagesSentToday: userMsgsToday,
        messagesLeftToday: 0,
        maxMessagesPerDay: 7,
        currentProjectDay: currentDay
      });
    }
    
    // Warning when approaching limit (at 5/7 messages)
    let quotaWarning = null;
    if (userMsgsToday >= 5) {
      const remaining = 7 - userMsgsToday;
      quotaWarning = remaining === 1 
        ? `${remaining} message remaining today` 
        : `${remaining} messages remaining today`;
      console.log(`⚠️ Quota warning: ${quotaWarning}`);
    }

    // 4. Generate message ID
    const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // 5. Create and save chat message
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

    await db.collection('userProjects')
      .doc(projectId)
      .collection('chatMessages')
      .add(message);

    console.log(`✅ Message saved from ${userTeammate.name}`);

    // 6. Update user teammate stats (no quota decrement - we count actual messages)
    await updateTeammateStats(projectId, userId, {
      'stats.messagesSent': FieldValue.increment(1),
      'state.lastActive': Date.now(),
      'state.status': 'online'
    });

    // 7. Extract @mentions from message
    const mentions = extractMentions(content);
    console.log(`📢 Mentions detected:`, mentions);

    // 8. Handle each mention
    const mentionsHandled = [];
    
    for (const mentionedId of mentions) {
      try {
        // Fetch mentioned teammate
        const mentionedTeammate = await getTeammate(projectId, mentionedId);
        
        // Skip if not found or if human (humans don't auto-respond)
        if (!mentionedTeammate) {
          console.log(`⚠️ Mentioned teammate ${mentionedId} not found`);
          continue;
        }
        
        if (mentionedTeammate.type === 'human') {
          console.log(`👤 Mentioned ${mentionedTeammate.name} (human, no auto-response)`);
          continue;
        }

        // Check availability for AI agents
        const availabilityCheck = await isTeammateAvailable(projectId, mentionedId);
        
        if (availabilityCheck.available) {
          // Agent is available - trigger AI response
          console.log(`🤖 ${mentionedTeammate.name} is available, triggering response...`);
          
          try {
            await triggerAgentResponse(projectId, mentionedId, message, db);
            
            // Update stats (no quota decrement for AI agents)
            await updateTeammateStats(projectId, mentionedId, {
              'stats.messagesSent': FieldValue.increment(1),
              'state.lastActive': Date.now(),
              'state.status': 'online'
            });
            
            mentionsHandled.push({
              teammateId: mentionedId,
              name: mentionedTeammate.name,
              responded: true
            });
            
            console.log(`✅ ${mentionedTeammate.name} responded successfully`);
            
          } catch (aiError) {
            console.error(`❌ Error triggering AI response for ${mentionedTeammate.name}:`, aiError);
            mentionsHandled.push({
              teammateId: mentionedId,
              name: mentionedTeammate.name,
              responded: false,
              error: 'Failed to generate response'
            });
          }
          
        } else {
          // Agent is unavailable - send sleep response
          console.log(`😴 ${mentionedTeammate.name} is unavailable: ${availabilityCheck.reason}`);
          
          const sleepMessage = getSleepResponse(mentionedTeammate, availabilityCheck);
          
          await db.collection('userProjects')
            .doc(projectId)
            .collection('chatMessages')
            .add({
              messageId: generateId(),
              projectId: projectId,
              senderId: mentionedId,
              senderName: mentionedTeammate.name,
              senderType: 'ai',
              content: sleepMessage,
              timestamp: Date.now(),
              type: 'system'
            });
          
          // Optional: Track missed mention
          await updateTeammateStats(projectId, mentionedId, {
            'stats.missedMentions': FieldValue.increment(1)
          });
          
          mentionsHandled.push({
            teammateId: mentionedId,
            name: mentionedTeammate.name,
            responded: false,
            reason: availabilityCheck.reason,
            sleepMessage: sleepMessage
          });
          
          console.log(`💤 Sleep response sent for ${mentionedTeammate.name}`);
        }
        
      } catch (mentionError) {
        console.error(`❌ Error handling mention for ${mentionedId}:`, mentionError);
      }
    }

    // 8.5. Handle probability-based responses (AI agents responding without @mentions)
    // Only trigger if no mentions were detected (to avoid double responses)
    const probabilityHandled = [];
    
    if (mentions.length === 0) {
      console.log(`🎲 No mentions detected, checking probability-based responses...`);
      
      // Get all AI teammates for this project
      const allTeammates = await getTeammates(projectId);
      const aiTeammates = allTeammates.filter(t => t.type === 'ai');
      
      console.log(`🎲 AI teammates in project:`, aiTeammates.map(t => t.id));
      
      // If no AI teammates, skip
      if (aiTeammates.length === 0) {
        console.log(`⚠️ No AI teammates found in project`);
      } else {
        // Randomly select which AI teammates should respond
        const probabilityAgents = getDefaultResponseAgents(aiTeammates.map(t => t.id));
        console.log(`🎲 Probability selected agents:`, probabilityAgents);
        
        for (const agentId of probabilityAgents) {
          try {
            // Fetch agent teammate
            const agentTeammate = await getTeammate(projectId, agentId);
            
            if (!agentTeammate) {
              console.log(`⚠️ Probability agent ${agentId} not found`);
              continue;
            }
          
            if (agentTeammate.type !== 'ai') {
              console.log(`⚠️ ${agentId} is not an AI agent, skipping`);
              continue;
            }
            
            // Check availability
            const availabilityCheck = await isTeammateAvailable(projectId, agentId);
            
            if (availabilityCheck.available) {
              // Agent is available - trigger AI response
              console.log(`🎲 ${agentTeammate.name} responding (probability-based)...`);
              
              try {
                await triggerAgentResponse(projectId, agentId, message, db);
                
                // Update stats (no quota decrement for AI agents)
                await updateTeammateStats(projectId, agentId, {
                  'stats.messagesSent': FieldValue.increment(1),
                  'state.lastActive': Date.now(),
                  'state.status': 'online'
                });
                
                probabilityHandled.push({
                  teammateId: agentId,
                  name: agentTeammate.name,
                  responded: true,
                  trigger: 'probability'
                });
                
                console.log(`✅ ${agentTeammate.name} responded (probability-based)`);
                
              } catch (aiError) {
                console.error(`❌ Error in probability response for ${agentTeammate.name}:`, aiError);
                probabilityHandled.push({
                  teammateId: agentId,
                  name: agentTeammate.name,
                  responded: false,
                  error: 'Failed to generate response'
                });
              }
              
            } else {
              // Agent is unavailable - skip (no sleep message for probability responses)
              console.log(`😴 ${agentTeammate.name} unavailable for probability response: ${availabilityCheck.reason}`);
              probabilityHandled.push({
                teammateId: agentId,
                name: agentTeammate.name,
                responded: false,
                reason: availabilityCheck.reason,
                trigger: 'probability'
              });
            }
            
          } catch (probError) {
            console.error(`❌ Error handling probability response for ${agentId}:`, probError);
          }
        }
      }
    } else {
      console.log(`📢 Mentions detected, skipping probability-based responses`);
    }

    // 8.6. Add intelligent sign-off if this is the 7th message (last message allowed)
    if (userMsgsToday === 6) { // This is the 7th message
      console.log(`🎯 7th message detected - adding intelligent sign-off from Rasoa`);
      
      try {
        // Get all tasks to summarize
        const tasksSnapshot = await db.collection('userProjects')
          .doc(projectId)
          .collection('tasks')
          .get();
        
        const tasks = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Build task summary with more natural language
        let taskSummary = '';
        const todoTasks = tasks.filter(t => t.status === 'todo');
        const inProgressTasks = tasks.filter(t => t.status === 'inprogress');
        const completedTasks = tasks.filter(t => t.status === 'done');
        
        if (tasks.length > 0) {
          taskSummary = `\n\n� Today's progress:\n`;
          
          if (completedTasks.length > 0) {
            taskSummary += `Great work! We completed ${completedTasks.length} task${completedTasks.length > 1 ? 's' : ''}. `;
          }
          
          if (inProgressTasks.length > 0) {
            taskSummary += `${inProgressTasks.length} task${inProgressTasks.length > 1 ? 's are' : ' is'} in progress. `;
          }
          
          if (todoTasks.length > 0) {
            taskSummary += `Still have ${todoTasks.length} task${todoTasks.length > 1 ? 's' : ''} to tackle.`;
          }
        } else {
          taskSummary = `\n\nNo tasks on the Kanban board yet. `;
        }
        
        // Get recent chat messages to check if tasks were discussed
        const recentMessages = await db.collection('userProjects')
          .doc(projectId)
          .collection('chatMessages')
          .orderBy('timestamp', 'desc')
          .limit(10)
          .get();
        
        const chatTexts = recentMessages.docs.map(doc => (doc.data().content || doc.data().text || '').toLowerCase()).join(' ');
        const hasTaskDiscussion = chatTexts.includes('task') || chatTexts.includes('work on') || 
                                   chatTexts.includes('need to') || chatTexts.includes('should do');
        
        let kanbanReminder = '';
        if (hasTaskDiscussion && tasks.length < 3) {
          kanbanReminder = `\n\n💡 Reminder: Add any tasks we discussed to the Kanban board so we don't forget!`;
        }
        
        // Build natural sign-off message
        const signOffMessage = `That's your 7 messages for today! ${taskSummary}${kanbanReminder}\n\nLet's continue tomorrow. See you! 👋`;
        
        // Save sign-off message from Rasoa
        await db.collection('userProjects')
          .doc(projectId)
          .collection('chatMessages')
          .add({
            messageId: generateId(),
            projectId: projectId,
            senderId: 'rasoa',
            senderName: 'Rasoa',
            senderType: 'ai',
            content: signOffMessage,
            timestamp: Date.now(),
            type: 'system'
          });
        
        console.log(`✅ Intelligent sign-off added from Rasoa`);
        
      } catch (signOffError) {
        console.error(`❌ Error adding sign-off:`, signOffError);
        // Continue without sign-off if there's an error
      }
    }

    // 9. Fetch all messages to return (including AI responses)
    const allMessagesSnapshot = await db.collection('userProjects')
      .doc(projectId)
      .collection('chatMessages')
      .orderBy('timestamp', 'asc')
      .get();
    
    const allMessages = allMessagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 10. Return success response with all messages
    const messagesAfterThis = userMsgsToday + 1; // Count including this message
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
      quotaExceeded: messagesAfterThis >= 7, // Will be true on 7th message
      messagesUsedToday: messagesAfterThis,
      dailyLimit: 7
    });

  } catch (error) {
    console.error('❌ Error posting chat message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * POST /api/project/:id/init-teammates
 * Initialize teammates subcollection for a project
 * Accepts selectedAgents array to create only chosen teammates (up to 2)
 */
router.post('/:id/init-teammates', verifyFirebaseToken, async (req, res) => {
  const { id: projectId } = req.params;
  const { selectedAgents } = req.body; // Get selected agents from request body
  const userId = req.user.uid;

  try {
    // 1. Verify user has access to project
    const projectDoc = await db.collection('userProjects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 2. Check if teammates already exist
    const teammatesSnap = await db
      .collection('userProjects')
      .doc(projectId)
      .collection('teammates')
      .get();

    if (teammatesSnap.size > 0) {
      return res.json({ 
        success: true, 
        message: 'Teammates already initialized',
        count: teammatesSnap.size
      });
    }

    // 3. Validate selected agents
    const validAgents = ['brown', 'elza', 'kati', 'steve', 'sam', 'rasoa', 'rakoto'];
    const agentsToCreate = selectedAgents && Array.isArray(selectedAgents) 
      ? selectedAgents.filter(id => validAgents.includes(id)).slice(0, 2) // Max 2 agents
      : ['brown', 'elza']; // Default to brown and elza if not specified
    
    if (agentsToCreate.length === 0) {
      return res.status(400).json({ error: 'Please select at least one valid teammate' });
    }

    // 4. Initialize teammates - Human user + selected AI agents
    const { AI_AGENTS } = await import('../config/aiAgents.js');
    const batch = db.batch();
    const teammatesRef = db.collection('userProjects').doc(projectId).collection('teammates');

    // Create human user teammate
    const humanTeammate = {
      id: userId,
      name: projectDoc.data().userName || 'You',
      type: 'human',
      role: 'Project Owner',
      avatar: '👤',
      color: '#2196F3',
      config: {
        maxMessagesPerDay: 7, // User gets 7 messages per day
        isActive: true
      },
      state: {
        messagesLeftToday: 7, // Start with 7 messages
        lastActiveDay: 0,
        status: 'online'
      },
      stats: {
        messagesSent: 0,
        messagesReceived: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
      },
      joinedAt: FieldValue.serverTimestamp()
    };
    batch.set(teammatesRef.doc(userId), humanTeammate);

    // Create only the selected AI teammates (up to 2)
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
          isActive: true, // Enable the agent by default
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
        joinedAt: FieldValue.serverTimestamp()
      };

      batch.set(teammatesRef.doc(agentId), aiTeammate);
      agentCount++;
    }

    await batch.commit();

    res.json({
      success: true,
      message: 'Teammates initialized successfully',
      count: agentCount + 1 // AI agents + human user
    });

  } catch (error) {
    console.error('❌ Error initializing teammates:', error);
    res.status(500).json({ error: 'Failed to initialize teammates' });
  }
});

export default router;
