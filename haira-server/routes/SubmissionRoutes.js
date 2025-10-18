import express from 'express'
import { getDocumentById } from '../services/firebaseService.js';
import { COLLECTIONS } from '../schema/database.js';
const router = express.Router()

router.get('/:id/submission', async (req, res) => {
    const { id }= req.params; // get parameters from request
    // make sure backend is connected to firestore
    try{
        // Get the current project
        const project = await getDocumentById(COLLECTIONS.USER_PROJECTS, id)
        if (!project) {
            return res.status(400).json({ error: `Project ${id} not found.` });
        }

        res.json({
            project
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// router.post(':/id/submission', async (req, res) => {
//     const { id }= req.params; // get parameters from request
//     const { content } = req.body ; // request body -> text content

//     // make sure content is not empty
//     if (!content) {
//         return res.status(400).json({ error: `Content is requires` });
//     }

//     // Define the prompt for grading
//     const SYSTEM_INSTRUCTION = "You are a grader. Grade this submission 0-100. Format: 'overall: Number, workPercentage: Number, responsiveness: Number, reportQuality: Number"

//     try {
//         // ensure the project exists
//         await ensureProjectExists(id, userId);
//     }
// });

export default router;

