import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { createProject, getUserProjects, updateUserActiveProject } from '../services/firebaseService.js';

const router = express.Router();

// Get all projects for the authenticated user
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const projects = await getUserProjects(userId);
    
    res.json({
      success: true,
      projects: projects
    });
  } catch (error) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create a new project
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user.uid;
    const userName = req.user.name;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Project title is required' });
    }

    // Create the project
    const projectId = await createProject(userId, userName, title.trim());

    // Update user's active project
    await updateUserActiveProject(userId, projectId);

    res.status(201).json({
      success: true,
      projectId: projectId,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Set active project for user
router.post('/:projectId/activate', verifyFirebaseToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.uid;

    await updateUserActiveProject(userId, projectId);

    res.json({
      success: true,
      message: 'Active project updated'
    });
  } catch (error) {
    console.error('Error updating active project:', error);
    res.status(500).json({ error: 'Failed to update active project' });
  }
});

// Project details route
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `Project ${id} details` });
});

// Export the router so we can use it in index.js
export default router;