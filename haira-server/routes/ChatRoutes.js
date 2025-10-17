import express from 'express';
import { addUserChat, addChat, getChats } from '../services/firebaseService.js';
import { generateAIResponse } from '../api/geminiService.js';
const router = express.Router();

// Get all chats for a project
router.get('/:id/chat', async (req, res) => {
  const { id } = req.params;
  try {
    console.log(`[API] Fetching chats for project ${id}, param type:`, typeof id);
    const chats = await getChats(id);
    
    if (!chats || chats.length === 0) {
      console.log(`[API] No chats found for project ${id}`);
      return res.json({ chats: [] });
    }
    res.json({ 
      chats,
      debug: {
        projectId: id,
        chatCount: chats.length,
        timestamp: Date.now()
      }
    });
  } catch (err) {
    console.error(`[API] Error fetching chats for project ${id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Add a new chat to a project
router.post('/:id/chat', async (req, res) => {
  const { id } = req.params;
  const { content, userId = 'user_1', userName = 'hairateam' } = req.body;
  
  if (!content) return res.status(400).json({ error: 'Content required' });
  
  // Fixed system instruction - not exposed to frontend
  const SYSTEM_INSTRUCTION = "You are a helpful AI assistant named Haira. Keep your responses to one sentence or one short paragraph. Be concise and friendly.";
  
  try {
    // Save user message to Firebase with proper sender info
    const chat = await addUserChat(id, content, userId, userName);
    
    // Get AI response from Gemini with fixed system instruction
    const aiResponseText = await generateAIResponse(
      content, 
      SYSTEM_INSTRUCTION
    );
    
    // Save AI response to Firebase with system prompt
    const aiChat = await addChat(id, aiResponseText, 'ai_1', 'haira', SYSTEM_INSTRUCTION);
    
    res.status(201).json({
      success: true,
      userMessage: chat,
      aiResponse: aiChat,
      chats: [chat, aiChat]
    });
  } catch (err) {
    console.error('[API] Error in chat:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

export default router;
