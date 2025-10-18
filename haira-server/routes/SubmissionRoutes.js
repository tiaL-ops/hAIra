import express from 'express'
import { updateUserProject, ensureProjectExists } from '../services/firebaseService.js';
import { generateGradeResponse } from '../api/geminiService.js';
const router = express.Router()

router.get('/:id/submission', async (req, res) => {
    const { id }= req.params; // get parameters from request
    // make sure backend is connected to firestore
    try{
        res.json({
            message: `Hi Submission ${id}! Hello from the backend.`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/submission', async (req, res) => {
    const { id } = req.params;
    const { content, userId } = req.body;

    if (!content || !userId) {
        return res.status(400).json({ error: 'Content and userId are required' });
    }

    const SYSTEM_INSTRUCTION = `
You are a grader. Grade this submission 0-100.
Respond ONLY in JSON with this format:
{
    "overall": Number,
    "workPercentage": Number,
    "responsiveness": Number,
    "reportQuality": Number,
    "feedback": String
}
Do not include anything else.
`;

    try {
        console.log("From Submission: Making sure the project exists...")
        await ensureProjectExists(id, userId);

        console.log("From Submission: generating AI grades and feedback")
        const aiResponseGrade = await generateGradeResponse(content, SYSTEM_INSTRUCTION);

        let grade;
        try {
            // Remove ```json, ``` and extra whitespace
            const cleaned = aiResponseGrade
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

            grade = JSON.parse(cleaned);
        } catch {
            grade = { error: 'Invalid AI response', raw: aiResponseGrade };
        }
        console.log("From Submission: generating AI grades and feedback")
        await updateUserProject(id, content, grade, 'submitted');
        console.log("From Submission: User project updated")

        res.status(201).json({
            success: true,
            grade,
        });

    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

export default router;

