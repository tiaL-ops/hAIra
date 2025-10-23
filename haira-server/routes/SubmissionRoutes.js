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
    generateAIContribution as callGeminiContribution,
} from '../api/geminiService.js';
import { generateAIContribution as callOpenAIContribution } from '../api/openaiService.js';
import { AI_TEAMMATES, TASK_TYPES } from '../config/aiReportAgents.js';

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

// This is to clean AI output from gemini
function cleanAIResponse(text) {
    if (!text) return '';
    return text
      .replace(/```[\s\S]*?```/g, (match) => {
        // If it's a fenced code block, strip the fences but keep inner text
        return match.replace(/```[a-zA-Z]*\n?/, '').replace(/```$/, '');
      })
      .replace(/^```[a-zA-Z]*\s*/gm, '') // remove starting ```html or ```json
      .replace(/```$/gm, '') // remove ending ```
      .trim();
}

function convertMarkdownToHTML(markdown) {
    if (!markdown) return '';
    
    return markdown
        // Convert headers first
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Convert bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Convert italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Convert numbered lists
        .replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>')
        // Convert bullet points
        .replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>')
        // Wrap consecutive list items in ul/ol tags
        .replace(/(<li>.*<\/li>)/gs, (match) => {
            const lines = match.split('\n');
            const listItems = lines.filter(line => line.trim().startsWith('<li>'));
            if (listItems.length > 0) {
                const isNumbered = lines.some(line => /^\d+\./.test(line.trim()));
                const tag = isNumbered ? 'ol' : 'ul';
                return `<${tag}>${listItems.join('')}</${tag}>`;
            }
            return match;
        })
        // Convert double line breaks to paragraph breaks
        .replace(/\n\n/g, '</p><p>')
        // Wrap text blocks in paragraphs (but not headers or lists)
        .replace(/^(?!<[h1-6]|<[uo]l|<li)(.*)$/gm, (match, content) => {
            if (content.trim() === '') return '';
            return `<p>${content}</p>`;
        })
        // Clean up empty paragraphs and fix paragraph wrapping around headers
        .replace(/<p><\/p>/g, '')
        .replace(/<p>\s*<\/p>/g, '')
        .replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/g, '$1')
        .replace(/<p><\/p>/g, '');
}

// Clean HTML content for AI review - extract readable text
function cleanContentForReview(htmlContent) {
    if (!htmlContent) return '';
    
    return htmlContent
        // Remove HTML tags but keep the text content
        .replace(/<[^>]*>/g, ' ')
        // Remove multiple spaces and normalize whitespace
        .replace(/\s+/g, ' ')
        // Remove AI prefixes like [Alex] or [Sam]
        .replace(/\[(Alex|Sam|Lala|Mino)\]\s*/g, '')
        // Clean up any remaining artifacts
        .trim();
}

// Generate AI-specific completion messages
async function generateCompletionMessage(aiType, taskType) {
    const aiTeammate = aiType === 'ai_manager' ? AI_TEAMMATES.MANAGER : AI_TEAMMATES.LAZY;
    
    const completionPrompts = {
        write: `Generate a short, casual completion message (1-2 sentences max) for when you finish writing a section. Be true to your personality: ${aiTeammate.personality}. Make it sound natural and in character.`,
        review: `Generate a short, casual completion message (1-2 sentences max) for when you finish reviewing content. Be true to your personality: ${aiTeammate.personality}. Make it sound natural and in character.`,
        suggest: `Generate a short, casual completion message (1-2 sentences max) for when you finish suggesting improvements. Be true to your personality: ${aiTeammate.personality}. Make it sound natural and in character.`
    };
    
    const prompt = completionPrompts[taskType] || completionPrompts.write;
    
    try {
        // const response = await generateAIContribution(prompt, aiTeammate.config, aiTeammate.prompt);
        const aiResponse = await callOpenAIContribution(prompt, aiTeammate.config, aiTeammate.prompt)
        return cleanAIResponse(aiResponse);
    } catch (error) {
        console.error('Error generating completion message:', error);
        // Fallback to default messages
        return aiType === 'ai_manager' ? '✅ Done — anything else to assign?' : '😴 I did something… kind of.';
    }
}

// Update AI contribution percentage automatically
async function updateAIContribution(projectId, aiType, taskType) {
    try {
        // Get current project data
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, projectId);
        if (!projectData) return;

        let contributions = projectData.contributions || [];
        
        // Initialize contributions if they don't exist
        if (contributions.length === 0) {
            contributions = [
                { name: "You", percent: 70, role: "Student" },
                { name: "Alex", percent: 20, role: "AI Manager" },
                { name: "Sam", percent: 10, role: "AI Helper" },
            ];
        }

        // Find the AI teammate
        const aiName = aiType === 'ai_manager' ? 'Alex' : 'Sam';
        const aiIndex = contributions.findIndex(c => c.name === aiName);
        
        if (aiIndex === -1) return;

        // Calculate contribution points based on task type
        let contributionPoints = 0;
        switch (taskType) {
            case 'write':
                contributionPoints = 5; // Writing is high value
                break;
            case 'review':
                contributionPoints = 3; // Review is medium value
                break;
            case 'suggest':
                contributionPoints = 2; // Suggestions are lower value
                break;
            default:
                contributionPoints = 1;
        }

        // Update the AI's contribution
        contributions[aiIndex].percent = Math.min(100, contributions[aiIndex].percent + contributionPoints);
        
        // Balance contributions to reach 100% total
        const totalContribution = contributions.reduce((sum, c) => sum + c.percent, 0);
        
        if (totalContribution > 100) {
            // If over 100%, reduce user contribution to balance
            const userIndex = contributions.findIndex(c => c.name === "You");
            if (userIndex !== -1) {
                const excess = totalContribution - 100;
                contributions[userIndex].percent = Math.max(0, contributions[userIndex].percent - excess);
            }
        } else if (totalContribution < 100) {
            // If under 100%, distribute the remaining percentage
            const remaining = 100 - totalContribution;
            
            // Give 60% of remaining to user, 40% to other AI
            const userIndex = contributions.findIndex(c => c.name === "You");
            const otherAiIndex = contributions.findIndex(c => c.name !== aiName && c.name !== "You");
            
            if (userIndex !== -1) {
                contributions[userIndex].percent += Math.round(remaining * 0.6);
            }
            
            if (otherAiIndex !== -1) {
                contributions[otherAiIndex].percent += Math.round(remaining * 0.4);
            }
            
            // Ensure we don't exceed 100%
            const finalTotal = contributions.reduce((sum, c) => sum + c.percent, 0);
            if (finalTotal > 100) {
                const excess = finalTotal - 100;
                if (userIndex !== -1) {
                    contributions[userIndex].percent = Math.max(0, contributions[userIndex].percent - excess);
                }
            }
        }

        // Save updated contributions
        await updateDocument(COLLECTIONS.USER_PROJECTS, projectId, {
            contributions: contributions,
            contributionUpdatedAt: Date.now()
        });

        console.log(`Updated ${aiName} contribution by +${contributionPoints}% for ${taskType} task`);
    } catch (error) {
        console.error('Error updating AI contribution:', error);
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
                team: projectData.team || [],
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
                { name: "You", percent: 70, role: "Student" },
                { name: "Alex", percent: 20, role: "AI Manager" },
                { name: "Sam", percent: 10, role: "AI Helper" },
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



// AI Write Section endpoint
router.post('/:id/ai/write', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { aiType, sectionName, currentContent } = req.body;
    const userId = req.user.uid;

    console.log('AI Write request received:', { id, aiType, sectionName, userId });

    if (!aiType) {
        return res.status(400).json({ error: 'AI type is required' });
    }

    if (!['ai_manager', 'ai_helper'].includes(aiType)) {
        return res.status(400).json({ error: 'AI type must be either "ai_manager" or "ai_helper"' });
    }

    try {
        await ensureProjectExists(id, userId);
        const aiTeammate = aiType === 'ai_manager' ? AI_TEAMMATES.MANAGER : AI_TEAMMATES.LAZY;
        
        // Use Chrome Write API for writing tasks
        const taskPrompt = `Based on you persona, write a section for "${sectionName || 'the project'}" based on the current content. 
        Current content: ${currentContent || 'No content yet.'}
        
        Provide a well-structured section that fits with the existing content.`;
        
        // Try Chrome Write API first, fallback to Gemini
        let aiResponse;
       
        console.log('Calling AI for writing task...');
        // aiResponse = await generateAIContribution(taskPrompt, aiTeammate.config, aiTeammate.prompt);
        aiResponse = await callOpenAIContribution(taskPrompt, aiTeammate.config, aiTeammate.prompt);

        const cleanedResponse = cleanAIResponse(aiResponse);
        const htmlResponse = convertMarkdownToHTML(cleanedResponse);
        const aiName = aiTeammate.name;
        const prefixedResponse = `[${aiName}] ${htmlResponse}`;

        const completionMessage = await generateCompletionMessage(aiType, 'write');

        // Log activity
        const activityLog = {
            timestamp: Date.now(),
            type: 'ai_write_completion',
            aiType: aiType,
            sectionName: sectionName || 'general',
            completionMessage: completionMessage
        };

        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        const currentActivity = projectData.activity || [];
        await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
            activity: [...currentActivity, activityLog]
        });

        // Update AI contribution automatically
        await updateAIContribution(id, aiType, 'write');

        res.json({
            success: true,
            aiType: aiType,
            response: prefixedResponse,
            responseType: 'text',
            completionMessage: completionMessage,
            timestamp: Date.now()
        });

    } catch (err) {
        console.error('AI Write error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// AI Review endpoint
router.post('/:id/ai/review', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { aiType, currentContent } = req.body;
    const userId = req.user.uid;

    console.log('AI Review request received:', { id, aiType, userId });

    if (!aiType) {
        return res.status(400).json({ error: 'AI type is required' });
    }

    if (!['ai_manager', 'ai_helper'].includes(aiType)) {
        return res.status(400).json({ error: 'AI type must be either "ai_manager" or "ai_helper"' });
    }

    try {
        await ensureProjectExists(id, userId);
        const aiTeammate = aiType === 'ai_manager' ? AI_TEAMMATES.MANAGER : AI_TEAMMATES.LAZY;
        
        // Clean the content to remove HTML markup for better AI review
        const cleanedContent = cleanContentForReview(currentContent);
        
        const taskPrompt = `Based on your persona, review the following content and provide exactly 4 bullet points of helpful feedback. Each bullet point should start with a dash (-) and focus on:
        - Content quality and clarity
        - Logical flow and organization  
        - Completeness of ideas
        - Writing style and tone
        
        Content to review:
        ${cleanedContent || 'No content to review.'}
        
        IMPORTANT: Format your response as exactly 4 bullet points, each starting with a dash (-). Do not use any HTML tags, markdown formatting, or special characters. Just write clear, helpful feedback in simple bullet point format.`;
        
        // const aiResponse = await generateAIContribution(taskPrompt, aiTeammate.config, aiTeammate.prompt);
        const aiResponse = await callOpenAIContribution(taskPrompt, aiTeammate.config, aiTeammate.prompt);
        const cleanedResponse = cleanAIResponse(aiResponse);
        const aiName = aiTeammate.name;
        const prefixedResponse = `[${aiName}] ${cleanedResponse}`;

        const completionMessage = await generateCompletionMessage(aiType, 'review');

        // Log activity
        const activityLog = {
            timestamp: Date.now(),
            type: 'ai_review_completion',
            aiType: aiType,
            completionMessage: completionMessage
        };

        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        const currentActivity = projectData.activity || [];
        await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
            activity: [...currentActivity, activityLog]
        });

        // Update AI contribution automatically
        await updateAIContribution(id, aiType, 'review');

        res.json({
            success: true,
            aiType: aiType,
            response: prefixedResponse,
            responseType: 'review',
            completionMessage: completionMessage,
            timestamp: Date.now()
        });

    } catch (err) {
        console.error('AI Review error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// AI Suggest Improvements endpoint
router.post('/:id/ai/suggest', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { aiType, currentContent } = req.body;
    const userId = req.user.uid;

    console.log('AI Suggest request received:', { id, aiType, userId });

    if (!aiType) {
        return res.status(400).json({ error: 'AI type is required' });
    }

    if (!['ai_manager', 'ai_helper'].includes(aiType)) {
        return res.status(400).json({ error: 'AI type must be either "ai_manager" or "ai_helper"' });
    }

    try {
        await ensureProjectExists(id, userId);
        const aiTeammate = aiType === 'ai_manager' ? AI_TEAMMATES.MANAGER : AI_TEAMMATES.LAZY;
        
        // Clean the content to remove HTML markup for better AI suggestions
        const cleanedContent = cleanContentForReview(currentContent);
        
        const taskPrompt = `Based on your persona, suggest exactly 3 key bullet points for improvements for this content. Each bullet point should start with a dash (-) and be specific and actionable:
        ${cleanedContent || 'No content to improve.'}
        
        IMPORTANT: Format your response as exactly 3 bullet points, each starting with a dash (-). Do not use any HTML tags, markdown formatting, or special characters. Just write clear, actionable suggestions in simple bullet point format.`;
        
        // const aiResponse = await generateAIContribution(taskPrompt, aiTeammate.config, aiTeammate.prompt);
        const aiResponse = await callOpenAIContribution(taskPrompt, aiTeammate.config, aiTeammate.prompt);
        const cleanedResponse = cleanAIResponse(aiResponse);
        const aiName = aiTeammate.name;
        const prefixedResponse = `[${aiName}] ${cleanedResponse}`;

        const completionMessage = await generateCompletionMessage(aiType, 'suggest');

        // Log activity
        const activityLog = {
            timestamp: Date.now(),
            type: 'ai_suggest_completion',
            aiType: aiType,
            completionMessage: completionMessage
        };

        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        const currentActivity = projectData.activity || [];
        await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
            activity: [...currentActivity, activityLog]
        });

        // Update AI contribution automatically
        await updateAIContribution(id, aiType, 'suggest');

        res.json({
            success: true,
            aiType: aiType,
            response: prefixedResponse,
            responseType: 'suggest',
            completionMessage: completionMessage,
            timestamp: Date.now()
        });

    } catch (err) {
        console.error('AI Suggest error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Track word count contribution
router.post('/:id/word-contributions/track', verifyFirebaseToken, async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const { contributorId, contributorName, contributorRole, wordCount, taskType } = req.body;
        const userId = req.user.uid;

        console.log('Tracking word contribution:', { projectId, contributorId, contributorName, wordCount });

        // Ensure project exists
        await ensureProjectExists(projectId, userId);

        // Get current project data
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, projectId);
        if (!projectData) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Initialize wordContributions if it doesn't exist
        let wordContributions = projectData.wordContributions || {
            user: { words: 0, percentage: 0 },
            alex: { words: 0, percentage: 0 },
            sam: { words: 0, percentage: 0 }
        };

        // Update the contributor's word count
        if (contributorId === 'ai_manager' || contributorName === 'Alex') {
            wordContributions.alex.words += wordCount;
        } else if (contributorId === 'ai_helper' || contributorName === 'Sam') {
            wordContributions.sam.words += wordCount;
        }

        // Calculate total words and percentages
        const totalWords = wordContributions.user.words + wordContributions.alex.words + wordContributions.sam.words;
        
        if (totalWords > 0) {
            wordContributions.user.percentage = Math.round((wordContributions.user.words / totalWords) * 100 * 100) / 100;
            wordContributions.alex.percentage = Math.round((wordContributions.alex.words / totalWords) * 100 * 100) / 100;
            wordContributions.sam.percentage = Math.round((wordContributions.sam.words / totalWords) * 100 * 100) / 100;
        }

        // Save updated word contributions
        await updateDocument(COLLECTIONS.USER_PROJECTS, projectId, {
            wordContributions: wordContributions,
            wordContributionsUpdatedAt: Date.now()
        });

        console.log(`Updated word contributions:`, wordContributions);

        res.json({ 
            success: true, 
            message: 'Word contribution tracked successfully',
            wordContributions: wordContributions
        });

    } catch (error) {
        console.error('Error tracking word contribution:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get word contributions
router.get('/:id/word-contributions', verifyFirebaseToken, async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const userId = req.user.uid;

        // Ensure project exists
        await ensureProjectExists(projectId, userId);

        // Get project data
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, projectId);
        if (!projectData) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Initialize wordContributions if it doesn't exist
        let wordContributions = projectData.wordContributions || {
            user: { words: 0, percentage: 0 },
            alex: { words: 0, percentage: 0 },
            sam: { words: 0, percentage: 0 }
        };

        // Calculate current percentages
        const totalWords = wordContributions.user.words + wordContributions.alex.words + wordContributions.sam.words;
        
        if (totalWords > 0) {
            wordContributions.user.percentage = Math.round((wordContributions.user.words / totalWords) * 100 * 100) / 100;
            wordContributions.alex.percentage = Math.round((wordContributions.alex.words / totalWords) * 100 * 100) / 100;
            wordContributions.sam.percentage = Math.round((wordContributions.sam.words / totalWords) * 100 * 100) / 100;
        }

        res.json({
            success: true,
            wordContributions: wordContributions,
            totalWords: totalWords
        });

    } catch (error) {
        console.error('Error getting word contributions:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Calculate user word count from final report content
router.post('/:id/word-contributions/calculate-user', verifyFirebaseToken, async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const { content } = req.body;
        const userId = req.user.uid;

        console.log('Calculating user word count from content');

        // Ensure project exists
        await ensureProjectExists(projectId, userId);

        // Get current project data
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, projectId);
        if (!projectData) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Calculate user word count by removing AI contributions
        let userContent = content || '';
        
        // Remove AI contribution headers and content
        // This regex removes content between AI contribution headers
        userContent = userContent.replace(/<div class="ai-contribution-header"[^>]*>.*?<\/div>/gs, '');
        userContent = userContent.replace(/\[Alex\][^<]*/g, '');
        userContent = userContent.replace(/\[Sam\][^<]*/g, '');
        
        // Remove HTML tags for word counting
        userContent = userContent.replace(/<[^>]*>/g, ' ');
        
        // Calculate word count
        const userWordCount = userContent.trim().split(/\s+/).filter(word => word.length > 0).length;

        // Get current word contributions
        let wordContributions = projectData.wordContributions || {
            user: { words: 0, percentage: 0 },
            alex: { words: 0, percentage: 0 },
            sam: { words: 0, percentage: 0 }
        };

        // Update user word count
        wordContributions.user.words = userWordCount;

        // Recalculate percentages
        const totalWords = wordContributions.user.words + wordContributions.alex.words + wordContributions.sam.words;
        
        if (totalWords > 0) {
            wordContributions.user.percentage = Math.round((wordContributions.user.words / totalWords) * 100 * 100) / 100;
            wordContributions.alex.percentage = Math.round((wordContributions.alex.words / totalWords) * 100 * 100) / 100;
            wordContributions.sam.percentage = Math.round((wordContributions.sam.words / totalWords) * 100 * 100) / 100;
        }

        // Save updated word contributions
        await updateDocument(COLLECTIONS.USER_PROJECTS, projectId, {
            wordContributions: wordContributions,
            wordContributionsUpdatedAt: Date.now()
        });

        console.log(`Updated user word count: ${userWordCount} words`);

        res.json({ 
            success: true, 
            message: 'User word count calculated successfully',
            userWordCount: userWordCount,
            wordContributions: wordContributions,
            totalWords: totalWords
        });

    } catch (error) {
        console.error('Error calculating user word count:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

export default router;

