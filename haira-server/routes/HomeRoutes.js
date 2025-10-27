import express from 'express';
import { AI_AGENTS, TASK_TYPES } from '../config/aiAgents.js';

const router = express.Router();

// Define the route for the root of this router ('/')
router.get('/home', (req, res) => {
  res.json({ message: "Hello from home backend!" });
});

// Serve AI agents configuration to client
router.get('/ai-agents', (req, res) => {
  res.json({
    AI_AGENTS,
    AI_TEAMMATES: AI_AGENTS, // Legacy compatibility
    TASK_TYPES
  });
});

// Export the router so we can use it in index.js
export default router;