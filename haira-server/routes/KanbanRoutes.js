import express from 'express';
import { addTasks, ensureProjectExists } from '../services/firebaseService.js';
import { generateDeliverablesResponse } from '../api/geminiService.js';

const router = express.Router();

router.get('/:id/kanban', (req, res) => {
    const { id } = req.params;
    res.json({ message: `Hi from kanban ${id}` });
});


router.post('/:id/kanban', async (req, res) => {
    const { id } = req.params;
    const { title, userId } = req.body;

    if (!title || !userId) {
        return res.status(400).json({ error: 'Title and userId are required' });
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

        console.log("From Kanban: generating deliverables")
        await addTasks(id, userId, title, deliverables);
        console.log("From Kanban: tasks added to project data")

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


export default router;
