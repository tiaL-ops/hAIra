import express from 'express';
import { addChat, getChats } from '../services/firebaseService.js';
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

<<<<<<< HEAD
=======
    // Detailed logging of all chats
    console.log('[API] All chats found:', JSON.stringify(chats, null, 2));
    console.log(`[API] Found ${chats.length} chats for project ${id}`);
>>>>>>> 612e979d76d57beda6ea9bc076bb4d52d898408c
    
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
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  try {
    const chat = await addChat(id, content);
<<<<<<< HEAD
    
=======
    console.log(`[DEBUG] POST /api/project/${id}/chat ->`, chat);
>>>>>>> 612e979d76d57beda6ea9bc076bb4d52d898408c
    res.status(201).json({
      chats: [chat]
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

export default router;
