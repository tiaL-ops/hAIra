import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { addTasks, updateTask, deleteTask, ensureProjectExists, getProjectWithTasks } from '../services/firebaseService.js';
import { generateDeliverablesResponse } from '../api/geminiService.js';
import Task from '../models/KanbanModels.js';

const router = express.Router();

// Get project data with tasks
router.get('/:id/kanban', verifyFirebaseToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;

        // Get project and tasks data
        const projectData = await getProjectWithTasks(id, userId);
        
        if (!projectData) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        res.json({
            success: true,
            project: projectData.project,
            tasks: projectData.tasks,
            message: `Project ${projectData.project.title} loaded successfully`
        });
    } catch (error) {
        console.error('Error fetching project data:', error);
        res.status(500).json({ error: 'Failed to fetch project data' });
    }
});

router.post('/:id/kanban', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user.uid;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const SYSTEM_INSTRUCTION = `You are a project manager.
Given a project title, suggest 3-5 deliverables. Keep it brief.
Respond ONLY in JSON with this format:
[
    { "deliverable": String },
]
Do not include anything else.
`;

    try {
        console.log("From Kanban: Making sure the project exists...")
        await ensureProjectExists(id, userId);

        console.log("From Kanban: looking for deliverables")
        const aiResponse = await generateDeliverablesResponse(title, SYSTEM_INSTRUCTION);

        const cleaned = aiResponse
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        let deliverables = JSON.parse(cleaned);
        console.log("From Kanban: generating deliverables");
        await addTasks(id, userId, title, 'todo', deliverables);
        console.log("From Kanban: tasks added to project data");

        res.status(201).json({
            success: true,
            deliverables,
        });

    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

router.get('/tasks/priority', verifyFirebaseToken, async (req, res) => {
    try {
        const priority = [];
        const data = Object.entries(Task.PRIORITY);
        data.map(([key, value]) => {
            priority.push(value);
        });
        res.status(201).json({ success: true, priority: priority });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: err.message
        });
    }
});

router.post('/:id/tasks', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { title, taskUserId, status, description} = req.body;

    if (!title || !taskUserId || !description) {
        return res.status(400).json({ error: 'missing required field' });
    }
    try {
        const datatask = await addTasks(id, taskUserId, title, status, [{deliverable : description}]);
        res.status(201).json({ success: true, ...datatask });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: err.message
        });
    }
});

router.put('/:id/tasks', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { taskId, title, status, userId, description, priority } = req.body;
    if (!taskId || !title || !status || !userId || !description || !priority) {
        return res.status(400).json({ error: 'missing required field' });
    }
    try {
        const datatask = await updateTask(id, taskId, title, status, userId, description, priority);
        res.status(201).json({ success: true, ...datatask });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: err.message
        });
    }
});

router.delete('/:id/tasks', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { taskId } = req.body;

    if (!taskId) {
        return res.status(400).json({ error: 'missing required field' });
    }
    try {
        const datatask = await deleteTask(id, taskId);
        res.status(201).json({ success: true, ...datatask });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: err.message
        });
    }
});

export default router;
