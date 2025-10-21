import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { addUserChat, addChat, getChats, ensureProjectExists, getProjectWithTasks } from '../services/firebaseService.js';
import { generateAIResponse } from '../api/openaiService.js';
import { AI_AGENTS, isActiveHours, getSleepResponse, buildContextualPrompt, getAgentContext } from '../config/aiAgents.js';
const router = express.Router();

// Flag to control whether to use new schema with subcollections or legacy flat structure

const USE_SUBCOLLECTIONS = true;

// Get all chats for a project
router.get('/:id/chat', verifyFirebaseToken, async (req, res) => {
  const { id } = req.params;
  try {
    console.log(`[API] Fetching chats for project ${id}, param type:`, typeof id);
    
    // If using subcollections, ensure the project exists first
    if (USE_SUBCOLLECTIONS) {
      await ensureProjectExists(id);
    }
    
    // Get chats using the appropriate method
    const chats = await getChats(id, USE_SUBCOLLECTIONS);
    
    if (!chats || chats.length === 0) {
      console.log(`[API] No chats found for project ${id}`);
      return res.json({ chats: [] });
    }
    res.json({ 
      chats,
      debug: {
        projectId: id,
        chatCount: chats.length,
        timestamp: Date.now(),
        usingSubcollections: USE_SUBCOLLECTIONS
      }
    });
  } catch (err) {
    console.error(`[API] Error fetching chats for project ${id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Add a new chat to a project with dual AI responses
router.post('/:id/chat', verifyFirebaseToken, async (req, res) => {
  const { id } = req.params;
  const { content, activeHours } = req.body;
  const userId = req.user.uid;
  const userName = req.user.name;
  
  if (!content) return res.status(400).json({ error: 'Content required' });
  
  // Use custom active hours from client, or default to 9-17
  const startHour = activeHours?.start ?? 9;
  const endHour = activeHours?.end ?? 17;
  
  try {
    // Ensure the project exists first
    if (USE_SUBCOLLECTIONS) {
      await ensureProjectExists(id, userId);
    }
    
    // Fetch project information for context
    const projectData = await getProjectWithTasks(id, userId);
    const projectInfo = projectData ? {
      id: id,
      name: projectData.project.title || projectData.project.name || 'Untitled Project',
      description: projectData.project.description || 'No description available'
    } : {
      id: id,
      name: 'New Project',
      description: 'New project'
    };
    
    console.log(`[ChatRoutes] Project context:`, projectInfo);
    
    // Save user message to Firebase
    const userChat = await addUserChat(
      id, 
      content, 
      userId, 
      userName, 
      USE_SUBCOLLECTIONS
    );
    
    const allResponses = [userChat];
    const currentHour = new Date().getUTCHours();
    const activeHoursNow = currentHour >= startHour && currentHour < endHour;
    
    // Randomly decide who responds and in what order
    let respondingAgents = [];
    
    if (!activeHoursNow) {
      // Outside active hours - all agents send sleep messages
      respondingAgents = ['alex', 'rasoa', 'rakoto'];
    } else {
      // Active hours - randomly decide who responds
      const randomChance = Math.random();
      
      if (randomChance < 0.2) {
        // 20% chance: Only Alex (PM) responds
        respondingAgents = ['alex'];
      } else if (randomChance < 0.35) {
        // 15% chance: Only Rasoa responds
        respondingAgents = ['rasoa'];
      } else if (randomChance < 0.5) {
        // 15% chance: Only Rakoto responds
        respondingAgents = ['rakoto'];
      } else if (randomChance < 0.7) {
        // 20% chance: Alex + one other
        respondingAgents = Math.random() < 0.5 ? ['alex', 'rasoa'] : ['alex', 'rakoto'];
      } else if (randomChance < 0.85) {
        // 15% chance: Two teammates (no Alex)
        respondingAgents = Math.random() < 0.5 ? ['rasoa', 'rakoto'] : ['rakoto', 'rasoa'];
      } else {
        // 15% chance: All three respond
        const orders = [
          ['alex', 'rasoa', 'rakoto'],
          ['alex', 'rakoto', 'rasoa'],
          ['rasoa', 'alex', 'rakoto'],
          ['rakoto', 'alex', 'rasoa']
        ];
        respondingAgents = orders[Math.floor(Math.random() * orders.length)];
      }
    }
    
    console.log(`[ChatRoutes] Active hours: ${activeHoursNow}, Responding agents: ${respondingAgents.join(', ')}`);
    
    // Handle responding AI agents
    for (const agentId of respondingAgents) {
      const agent = AI_AGENTS[agentId];
      
      if (!activeHoursNow) {
        // AI is asleep - send sleep response
        const sleepMessage = getSleepResponse(agentId);
        const sleepChat = await addChat(
          id, 
          sleepMessage, 
          agentId, 
          agent.name, 
          null, 
          USE_SUBCOLLECTIONS
        );
        allResponses.push(sleepChat);
      } else {
        // AI is active - generate proper response
        try {
          // Fetch recent conversation history for context
          const recentChats = await getChats(id, USE_SUBCOLLECTIONS);
          const conversationHistory = recentChats.slice(-10).map(chat => ({
            senderName: chat.senderName,
            content: chat.text || chat.content,
            senderId: chat.senderId
          }));
          
          // Build contextual prompt with project info, agent identity, and conversation history
          const contextualPrompt = buildContextualPrompt(agentId, projectInfo, conversationHistory);
          
          let aiResponseText = await generateAIResponse(
            content, 
            contextualPrompt
          );
          
          // Enforce word limit - truncate if necessary
          const words = aiResponseText.trim().split(/\s+/);
          if (words.length > 30) {
            aiResponseText = words.slice(0, 30).join(' ') + '...';
            console.log(`[ChatRoutes] Truncated ${agentId} response from ${words.length} to 30 words`);
          }
          
          // Ensure agent identifies themselves
          if (!aiResponseText.toLowerCase().includes(agentId) && !aiResponseText.toLowerCase().includes(agent.name.toLowerCase())) {
            aiResponseText = `${agent.name}: ${aiResponseText}`;
          }
          
          const aiChat = await addChat(
            id, 
            aiResponseText, 
            agentId, 
            agent.name, 
            contextualPrompt, 
            USE_SUBCOLLECTIONS
          );
          allResponses.push(aiChat);
        } catch (aiError) {
          console.error(`Error generating ${agentId} response:`, aiError);
          // Send a fallback message if AI generation fails
          let fallbackMessage;
          if (agentId === 'alex') {
            fallbackMessage = "Alex: I'm experiencing technical issues. Let me regroup and get back to you!";
          } else if (agentId === 'rasoa') {
            fallbackMessage = "Rasoa: I'm having technical difficulties. Let me get back to you!";
          } else {
            fallbackMessage = "Rakoto: Uh... my brain isn't working right now 😅";
          }
          
          const fallbackChat = await addChat(
            id, 
            fallbackMessage, 
            agentId, 
            agent.name, 
            null, 
            USE_SUBCOLLECTIONS
          );
          allResponses.push(fallbackChat);
        }
      }
      
      // Add a small delay between agents if multiple are responding
      if (respondingAgents.length > 1 && agentId !== respondingAgents[respondingAgents.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
    }
    
    // Return all messages
    res.status(201).json({ 
      messages: allResponses,
      activeAgents: activeHoursNow ? ['alex', 'rasoa', 'rakoto'] : [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

export default router;
