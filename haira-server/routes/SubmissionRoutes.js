import express from 'express'
import { 
    updateUserProject,
    ensureProjectExists,
    updateDocument,
    getDocumentById
} from '../services/firebaseService.js';
import { COLLECTIONS } from '../schema/database.js';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { 
    generateGradeResponse,
    generateAIResponse,
    generateAIContribution
} from '../api/geminiService.js';
import { LALA_CONFIG, LALA_SYSTEM_PROMPT } from '../lib/ai/agents/lalaPrompt.js';
import { MINO_CONFIG, MINO_SYSTEM_PROMPT } from '../lib/ai/agents/minoPrompt.js';

const router = express.Router()


/**
 * Parses the raw string response from the AI model into a JSON object.
 * It cleans up common markdown formatting like ```json and handles parsing errors.
 * @param {string} aiResponse - The raw string response from the Gemini API.
 * @returns {object} The parsed JSON object or an error object if parsing fails.
 */
function parseAIResponseToJson(aiResponse) {
  try {
    // Remove markdown code fences (```json, ```) and trim whitespace
    const cleanedJsonString = aiResponse
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    
    return JSON.parse(cleanedJsonString);
  } catch (parseError) {
    console.error("[AI PARSE ERROR] Failed to parse AI response:", aiResponse);
    // Return a default error structure that matches the expected grade format
    return { 
        error: 'Invalid AI response format', 
        raw: aiResponse,
        overall: 0,
        workPercentage: 0,
        responsiveness: 0,
        reportQuality: 0,
        feedback: "Critical Error: Failed to get AI Response"
    };
  }
}

// Get submission page data (including draft content)
router.get('/:id/submission', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;

    try {
        // Ensure project exists
        await ensureProjectExists(id, userId);
        
        // Get project data including draft content
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        if (!projectData) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            message: `Submission page loaded for project ${id}`,
            project: {
                id,
                title: projectData.title,
                status: projectData.status,
                draftReport: projectData.draftReport || null,
                finalReport: projectData.finalReport || null
            }
        });
    } catch (err) {
        console.error('Error fetching submission data:', err);
        res.status(500).json({ error: err.message });
    }
});

// Autosave draft report
router.post('/:id/submission/draft', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { content, type = 'report' } = req.body;
    const userId = req.user.uid;

    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    try {
        // Ensure project exists
        await ensureProjectExists(id, userId);

        let updateData = {};
        
        if (type === 'reflection') {
            // Save reflection separately
            updateData = {
                finalReflection: content,
                reflectionUpdatedAt: Date.now()
            };
        } else {
            // Save draft report
            updateData = {
                draftReport: {
                    content: content,
                    lastSaved: Date.now()
                }
            };
        }

        await updateDocument(COLLECTIONS.USER_PROJECTS, id, updateData);

        res.json({
            success: true,
            message: 'Draft saved successfully',
            lastSaved: Date.now()
        });

    } catch (err) {
        console.error('Draft save error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

// AI Proofreading endpoint using Chrome's built-in API
router.post('/:id/ai/proofread', verifyFirebaseToken, async (req, res) => {
    const { content } = req.body;
    
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    try {
        // Chrome's built-in spell check and grammar suggestions
        const corrections = [];
        const words = content.split(/\s+/);
        
        // Simple spell check simulation (in real implementation, you'd use Chrome's API)
        const commonMistakes = {
            'teh': 'the',
            'adn': 'and',
            'recieve': 'receive',
            'seperate': 'separate',
            'occured': 'occurred',
            'definately': 'definitely',
            'accomodate': 'accommodate',
            'embarass': 'embarrass',
            'priviledge': 'privilege',
            'maintainance': 'maintenance'
        };

        words.forEach((word, index) => {
            const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
            if (commonMistakes[cleanWord]) {
                corrections.push({
                    word: word,
                    suggestion: commonMistakes[cleanWord],
                    position: index,
                    type: 'spelling'
                });
            }
        });

        // Grammar suggestions using Gemini
        const grammarPrompt = `
Analyze this text for grammar errors and provide corrections. Focus on:
- Subject-verb agreement
- Tense consistency
- Sentence structure
- Punctuation

Text: ${content}

Respond with JSON format:
{
    "corrections": [
        {
            "original": "incorrect text",
            "suggestion": "corrected text",
            "explanation": "why this is wrong"
        }
    ]
}
`;

        const aiResponse = await generateAIResponse(grammarPrompt, "You are a grammar expert. Provide clear, helpful corrections.");
        const aiCorrections = parseAIResponseToJson(aiResponse);

        res.json({
            success: true,
            corrections: [...corrections, ...(aiCorrections.corrections || [])],
            proofread: aiCorrections
        });

    } catch (err) {
        console.error('Proofreading error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

// AI Summarize endpoint
router.post('/:id/ai/summarize', verifyFirebaseToken, async (req, res) => {
    const { content } = req.body;
    
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    try {
        const summaryPrompt = `
Summarize this text in 2-3 sentences, highlighting the main points and key findings.

Text: ${content}

Respond with JSON format:
{
    "summary": "brief summary here",
    "keyPoints": ["point 1", "point 2", "point 3"],
    "wordCount": number
}
`;

        const aiResponse = await generateAIResponse(
            summaryPrompt, 
            "You are a summarization expert. Create concise, accurate summaries."
        );
        const summary = parseAIResponseToJson(aiResponse);

        res.json({
            success: true,
            result: summary.summary || summary,
            summary: summary
        });

    } catch (err) {
        console.error('Summarization error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});


// AI Reflection endpoint
router.post('/:id/ai/reflect', verifyFirebaseToken, async (req, res) => {
    const { content } = req.body;
    
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    try {
        const reflectionPrompt = `
Analyze this project report and generate a thoughtful reflection. Focus on:
- Lessons learned from the project
- Challenges faced and how they were overcome
- Skills developed or improved
- Areas for future improvement
- Key insights gained
- What you would do differently next time

Text: ${content}

Respond with a comprehensive reflection in paragraph format that shows deep thinking about the project experience.
`;

        const aiResponse = await generateAIResponse(reflectionPrompt, "You are an educational mentor. Generate insightful, personal reflections that help students learn from their project experience.");
        
        // For reflection, we expect plain text, not JSON
        // Clean up the response but don't try to parse as JSON
        const cleanedReflection = aiResponse.trim();

        res.json({
            success: true,
            reflection: cleanedReflection,
            result: cleanedReflection
        });

    } catch (err) {
        console.error('Reflection error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

// Get submission results
router.get('/:id/submission/results', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;

    try {
        // Ensure project exists
        await ensureProjectExists(id, userId);
        // Get submission data from Firestore
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        if (!projectData) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const submission = {
            content: projectData.finalReport?.content || '',
            submittedAt: projectData.finalReport?.submittedAt || null,
            status: projectData.status || 'draft'
        };

        // Get grade data (you might want to store this separately)
        const grade = projectData.grade || null;

        res.json({
            success: true,
            submission,
            grade
        });

    } catch (err) {
        console.error('Results fetch error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

// Get contribution data
router.get('/:id/contributions', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;

    try {
        // Ensure project exists
        await ensureProjectExists(id, userId);
        
        // Get project data including contributions
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        if (!projectData) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Initialize default contributions if none exist
        let contributions = projectData.contributions;
        if (!contributions) {
            contributions = [
                { name: "You", percent: 0, role: "Student" },
                { name: "Lala", percent: 0, role: "AI Manager" },
                { name: "Mino", percent: 0, role: "AI Helper" },
            ];
            
            // Save default contributions
            await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
                contributions: contributions,
                contributionUpdatedAt: Date.now()
            });
        }

        res.json({
            success: true,
            contributions: contributions,
            totalContribution: contributions.reduce((sum, c) => sum + c.percent, 0)
        });

    } catch (err) {
        console.error('Contributions fetch error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

// Update contribution data
router.post('/:id/contributions', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { contributions } = req.body;
    const userId = req.user.uid;

    if (!contributions || !Array.isArray(contributions)) {
        return res.status(400).json({ error: 'Contributions array is required' });
    }

    try {
        // Ensure project exists
        await ensureProjectExists(id, userId);
        
        // Update contributions
        await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
            contributions: contributions,
            contributionUpdatedAt: Date.now()
        });

        const totalContribution = contributions.reduce((sum, c) => sum + c.percent, 0);

        res.json({
            success: true,
            contributions: contributions,
            totalContribution: totalContribution
        });

    } catch (err) {
        console.error('Contributions update error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

router.post('/:id/submission', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    const  userId = req.user.uid;

    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
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
        // Make sure project exists
        console.log(`From Submission: Making sure the project exists...`)
        await ensureProjectExists(id, userId);

        // generate AI Grades and Feedback
        console.log(`From Submission: generating AI grades and feedback...`)
        const aiResponseGrade = await generateGradeResponse(content, SYSTEM_INSTRUCTION);
        // Parse AI response to JSON
        const grade = parseAIResponseToJson(aiResponseGrade)
        console.log(`From Submission: AI Grades and Feedback ready.`)

        // Submit: Persists Final Report and Feedback, clear draft
        await updateUserProject(id, content, grade, 'submitted');
        
        // Clear draft report after final submission
        await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
            draftReport: null
        });
        
        console.log(`From Submission: User Project ${id} updated by ${userId}`)

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

// Multi-agent AI response endpoint
router.post('/:id/ai/respond', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { prompt, persona } = req.body;
    
    if (!prompt || !persona) {
        return res.status(400).json({ error: 'Prompt and persona are required' });
    }

    if (!['lala', 'mino'].includes(persona)) {
        return res.status(400).json({ error: 'Persona must be either "lala" or "mino"' });
    }

    try {
        let systemPrompt, personaConfig;
        if (persona === 'lala') {
            systemPrompt = LALA_SYSTEM_PROMPT;
            personaConfig = LALA_CONFIG;
        } else if (persona === 'mino') {
            systemPrompt = MINO_SYSTEM_PROMPT;
            personaConfig = MINO_CONFIG;
        }

        const aiResponse = await generateAIContribution(prompt, personaConfig, systemPrompt);

        res.json({
            success: true,
            response: aiResponse,
            persona: persona,
            timestamp: Date.now()
        });

    } catch (err) {
        console.error('AI Response error:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

export default router;

