import express from 'express';
import { addMessage, getMessages } from '../services/firebaseService.js';
const router = express.Router();

// Get all messages for a project
router.get('/project/:id/chat', async (req, res) => {
	const { id } = req.params;
	try {
		const messages = await getMessages(id);
		res.json({ messages });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Add a new message to a project
router.post('/project/:id/chat', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  try {
    const result = await addMessage(id, content);
    res.status(201).json({
      success: true,
      message: 'Message sent to Firebase',
      data: result
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});export default router;
