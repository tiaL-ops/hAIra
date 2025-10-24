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

    // 6. Update user teammate stats
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
            
            // Decrement daily quota
            await updateTeammateStats(projectId, mentionedId, {
              'state.messagesLeftToday': FieldValue.increment(-1),
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
    res.json({
      success: true,
      chats: allMessages,
      message: message,
      mentionsHandled: mentionsHandled
    });

  } catch (error) {
    console.error('❌ Error posting chat message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * POST /api/project/:id/init-teammates
 * Initialize teammates subcollection for a project (migration helper)
 * For now, only creates Rasoa and Rakoto
 */
router.post('/:id/init-teammates', verifyFirebaseToken, async (req, res) => {
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

    // 3. Initialize teammates - Human user + Rasoa + Rakoto
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
      joinedAt: FieldValue.serverTimestamp()
    };
    batch.set(teammatesRef.doc(userId), humanTeammate);

    // Create only Rasoa and Rakoto
    const selectedAgents = ['rasoa', 'rakoto'];
    let agentCount = 0;

    for (const agentId of selectedAgents) {
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
