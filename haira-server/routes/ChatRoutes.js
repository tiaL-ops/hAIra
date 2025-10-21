import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { addUserChat, addChat, getChats, ensureProjectExists } from '../services/firebaseService.js';
import { generateAIResponse } from '../api/geminiService.js';
import { AI_AGENTS, isActiveHours, getSleepResponse } from '../config/aiAgents.js';
const router = express.Router();

// Flag to control whether to use new schema with subcollections or legacy flat structure
// You can change this to true once you're ready to transition to the new schema
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
    
    // Handle both AI agents
    for (const agentId of ['rasoa', 'rakoto']) {
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
          const aiResponseText = await generateAIResponse(
            content, 
            agent.systemPrompt
          );
          
          const aiChat = await addChat(
            id, 
            aiResponseText, 
            agentId, 
            agent.name, 
            agent.systemPrompt, 
            USE_SUBCOLLECTIONS
          );
          allResponses.push(aiChat);
        } catch (aiError) {
          console.error(`Error generating ${agentId} response:`, aiError);
          // Send a fallback message if AI generation fails
          const fallbackMessage = agentId === 'rasoa' 
            ? "I'm having technical difficulties right now. Let me get back to you on this!" 
            : "Uh... my brain isn't working right now 😅";
          
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
    }
    
    // Return all messages
    res.status(201).json({ 
      messages: allResponses,
      activeAgents: activeHoursNow ? ['rasoa', 'rakoto'] : [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

export default router;
