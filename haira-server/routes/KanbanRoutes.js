import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { addTasks, updateTask, deleteTask, ensureProjectExists, getProjectWithTasks } from '../services/firebaseService.js';
import { generateDeliverablesResponse } from '../services/aiService.js';
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
    const { title, deliverables } = req.body;
    const userId = req.user.uid;

    console.log('[KanbanRoutes] POST /:id/kanban - Saving tasks');
    console.log('[KanbanRoutes] Project ID:', id);
    console.log('[KanbanRoutes] Title:', title);
    console.log('[KanbanRoutes] Deliverables:', JSON.stringify(deliverables, null, 2));

    try {
        console.log("From Kanban: Making sure the project exists...")
        await ensureProjectExists(id, userId);
        console.log("From Kanban: Store deliverables");
        const savedTasks = await addTasks(id, userId, title, 'todo', deliverables);
        console.log('[KanbanRoutes] Tasks saved successfully:', savedTasks.length, 'tasks');

        res.status(201).json({
            success: true,
            deliverables,
        });
    } catch (err) {
        console.error('[KanbanRoutes] Error saving tasks:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

router.post('/kanban/generate', verifyFirebaseToken, async (req, res) => {
    const { title } = req.body;
    const userId = req.user.uid;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const SYSTEM_INSTRUCTION = `You are an expert project manager.
Your task is to generate exactly 4 key deliverables for a project, given its title.

**Project Context:**
The main goal of the project is to produce a short essay. The deliverables should reflect the main steps to create this essay, such as research, brainstorming, outlining, and drafting.

**Input:**
The user will provide a project title.

**Output Constraints:**
1.  Respond ONLY with a valid JSON array.
2.  The array must contain exactly 4 objects.
3.  Each object must have a single key named "deliverable".
4.  The "deliverable" value must be a brief string describing the task output.
5.  DO NOT include any introductory text, explanations, or markdown (like \`\`\`json) before or after the JSON payload.

**Example Format:**
[
    { "deliverable": "Initial Research and Brainstorming Notes" },
    { "deliverable": "Detailed Essay Outline" },
    { "deliverable": "First Draft of the Essay" },
    { "deliverable": "Final Proofread Essay" }
]
`;

    try {
        console.log("From Kanban: looking for deliverables")
        const aiResponse = await generateDeliverablesResponse(title, SYSTEM_INSTRUCTION);

        const cleaned = aiResponse
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        let deliverables = JSON.parse(cleaned);

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

// Sync tasks from submission content to Kanban
router.post("/:id/sync-tasks", verifyFirebaseToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tasks, status = 'done' } = req.body; // Accept status parameter (defaults to 'done')
        const userId = req.user?.uid || 'system';
        
        console.log('[KanbanRoutes] Syncing tasks with status:', status);
        console.log('[KanbanRoutes] Tasks to sync:', tasks);

        if (!tasks || !Array.isArray(tasks)) {
            return res.status(400).json({ 
                success: false,
                error: 'Tasks array is required' 
            });
        }

        // Get project data with existing tasks (scoped to current user)
        const projectData = await getProjectWithTasks(id, userId);
        if (!projectData?.project) {
            return res.status(404).json({ 
                success: false,
                error: 'Project not found' 
            });
        }
        
        const existingTasks = projectData.tasks || [];
        
        console.log('[KanbanRoutes] Existing tasks:', existingTasks.length);
        console.log('[KanbanRoutes] Existing tasks details:', JSON.stringify(existingTasks.map(t => ({
            id: t.id,
            description: t.description,
            assignedTo: t.assignedTo,
            status: t.status
        })), null, 2));
        console.log('[KanbanRoutes] Incoming tasks:', JSON.stringify(tasks, null, 2));
        
        // Find which tasks need to be created and which need to be updated
        const newTasks = [];
        const updatedTasks = [];
        
        for (const task of tasks) {
            // If client provided an explicit task id, prefer matching by id (robust)
            let existingTask = null;
            if (task.id) {
                existingTask = existingTasks.find(t => t.id === task.id);
            }

            // Fallback: match by description and assignedTo
            if (!existingTask) {
                existingTask = existingTasks.find(t => 
                    (t.description || '').toLowerCase().trim() === (task.description || '').toLowerCase().trim() &&
                    t.assignedTo === task.assignedTo
                );
            }
            
            console.log('[KanbanRoutes] Processing task:', {
                incomingDesc: task.description,
                incomingAssignedTo: task.assignedTo,
                targetStatus: status,
                foundExisting: !!existingTask,
                existingId: existingTask?.id,
                existingStatus: existingTask?.status,
                existingAssignedTo: existingTask?.assignedTo,
                willUpdate: existingTask && existingTask.status !== status
            });
            
            if (existingTask) {
                // Task exists - update to provided status if different
                if (existingTask.status !== status) {
                    console.log('[KanbanRoutes] ✅ UPDATING task', existingTask.id, 'from', existingTask.status, '→', status);
                    await updateTask(
                        id, 
                        existingTask.id, 
                        existingTask.title || task.description,
                        status, // Use provided status (can be 'todo' or 'done')
                        userId,
                        task.description,
                        existingTask.priority || 1
                    );
                    updatedTasks.push(existingTask.id);
                } else {
                    console.log('[KanbanRoutes] ⏭️ Task already has status:', status);
                }
            } else {
                // Task doesn't exist - create it with provided status
                console.log('[KanbanRoutes] ➕ CREATING new task with status:', status);
                newTasks.push({
                    deliverable: task.description,
                    assignedTo: task.assignedTo,
                    priority: 1
                });
            }
        }
        
        // Create new tasks if any (with provided status)
        let createdTasks = [];
        if (newTasks.length > 0) {
            createdTasks = await addTasks(id, userId, projectData.project.title, status, newTasks);
            console.log('[KanbanRoutes] Created new tasks:', createdTasks.length, 'with status:', status);
        }

        res.status(200).json({
            success: true,
            created: createdTasks.length,
            updated: updatedTasks.length,
            message: `Synced ${createdTasks.length + updatedTasks.length} tasks to Kanban`
        });
    } catch (err) {
        console.error('[KanbanRoutes] Error syncing tasks:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

export default router;
