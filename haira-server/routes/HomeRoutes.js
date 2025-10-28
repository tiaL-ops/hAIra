import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AI_AGENTS, TASK_TYPES } from '../config/aiAgents.js';

const router = express.Router();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Serve research report
router.get('/home/research-report', (req, res) => {
  try {
    const reportPath = path.join(__dirname, '..', 'research-report.md');
    const reportContent = fs.readFileSync(reportPath, 'utf8');
    
    res.json({
      success: true,
      content: reportContent,
      title: "hAIra Research Report: Human-AI Collaboration in Education"
    });
  } catch (error) {
    console.error('Error reading research report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load research report'
    });
  }
});

// Export the router so we can use it in index.js
export default router;