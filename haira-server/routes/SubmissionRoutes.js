import express from 'express'
import admin from 'firebase-admin';
import { 
    updateUserProject,
    ensureProjectExists,
    updateDocument,
    getDocumentById,
    getSubdocuments
} from '../services/databaseService.js';
import { COLLECTIONS } from '../schema/database.js';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';

import { 
    generateGradeResponse,
    generateAIResponse,
    generateAIContribution
} from '../services/aiService.js';
import { AI_TEAMMATES, TASK_TYPES } from '../config/aiAgents.js';
import { AIGradingService } from '../services/aiGradingService.js';
import { getTeammates } from '../services/teammateService.js';


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

function convertMarkdownToPlainText(markdown) {
    if (!markdown) return '';
    return markdown
      .replace(/^#{1,6}\s+(.*)$/gm, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^\d+\.\s+(.*)$/gm, '• $1')
      .replace(/^[-*]\s+(.*)$/gm, '• $1')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
}
  
// Generate AI-specific completion messages
async function generateCompletionMessage(aiType, taskType) {
    // Get the correct AI teammate
    let aiTeammate;
    if (['brown', 'elza', 'kati', 'steve', 'sam', 'rasoa', 'rakoto'].includes(aiType)) {
        aiTeammate = AI_TEAMMATES[aiType];
    } else if (aiType === 'ai_manager') {
        aiTeammate = AI_TEAMMATES.rasoa; // Legacy ai_manager maps to rasoa
    } else if (aiType === 'ai_helper') {
        aiTeammate = AI_TEAMMATES.rakoto; // Legacy ai_helper maps to rakoto
    } else {
        aiTeammate = AI_TEAMMATES.rasoa; // Default fallback
    }
    
    const completionPrompts = {
        write: `Generate a short, casual completion message (1-2 sentences max) for when you finish writing a section. Be true to your personality: ${aiTeammate.personality}. Make it sound natural and in character.`,
        review: `Generate a short, casual completion message (1-2 sentences max) for when you finish reviewing content. Be true to your personality: ${aiTeammate.personality}. Make it sound natural and in character.`,
        suggest: `Generate a short, casual completion message (1-2 sentences max) for when you finish suggesting improvements. Be true to your personality: ${aiTeammate.personality}. Make it sound natural and in character.`
    };
    
    const prompt = completionPrompts[taskType] || completionPrompts.write;
    
    try {
        // Create proper config object from teammate properties
        const config = {
            max_tokens: aiTeammate.maxTokens || 500,
            temperature: aiTeammate.temperature || 0.7
        };
        
        const systemInstruction = `You are ${aiTeammate.name}, ${aiTeammate.role}. ${aiTeammate.personality}`;
        
        const aiResponse = await generateAIContribution(prompt, config, systemInstruction);
        return cleanAIResponse(aiResponse);
    } catch (error) {
        console.error('Error generating completion message:', error);
        // Fallback to default messages
        return aiType === 'ai_manager' ? '✅ Done — anything else to assign?' : '😴 I did something… kind of.';
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

        // Fetch teammates from teammates subcollection
        const teammates = await getTeammates(id);
        
        // Convert to map for easy lookup
        const teammatesMap = teammates.reduce((acc, teammate) => {
            acc[teammate.id] = teammate;
            return acc;
        }, {});

        res.json({
            message: `Submission page loaded for project ${id}`,
            project: {
                id,
                title: projectData.title,
                status: projectData.status,
                team: teammates, // Send teammates array
                draftReport: projectData.draftReport || null,
                finalReport: projectData.finalReport || null,
                comments: projectData.comments || [],
                commentsLastSaved: projectData.commentsLastSaved || null
            },
            teammates: teammatesMap // Also send as map
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

// Get comments for a project
router.get('/:id/comments', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;

    try {
        await ensureProjectExists(id, userId);
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        
        res.json({
            comments: projectData.comments || [],
            lastSaved: projectData.commentsLastSaved || null
        });
    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ error: err.message });
    }
});

// Save comments for a project
router.post('/:id/comments', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { comments } = req.body;
    const userId = req.user.uid;

    try {
        await ensureProjectExists(id, userId);
        
        await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
            comments: comments || [],
            commentsLastSaved: Date.now()
        });

        res.json({ success: true, savedAt: Date.now() });
    } catch (err) {
        console.error('Error saving comments:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update a specific comment
router.put('/:id/comments/:commentId', verifyFirebaseToken, async (req, res) => {
    const { id, commentId } = req.params;
    const { text, resolved } = req.body;
    const userId = req.user.uid;

    try {
        await ensureProjectExists(id, userId);
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        
        const comments = projectData.comments || [];
        const commentIndex = comments.findIndex(c => c.id === commentId);
        
        if (commentIndex === -1) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Update comment
        comments[commentIndex] = {
            ...comments[commentIndex],
            text: text !== undefined ? text : comments[commentIndex].text,
            resolved: resolved !== undefined ? resolved : comments[commentIndex].resolved,
            updatedAt: Date.now()
        };

        await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
            comments,
            commentsLastSaved: Date.now()
        });

        res.json({ success: true, comment: comments[commentIndex] });
    } catch (err) {
        console.error('Error updating comment:', err);
        res.status(500).json({ error: err.message });
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
        const proofreadContext = `You are a grammar expert. Provide clear, helpful corrections.`;
        
        let aiResponse;
        try {
            console.log('🚀 Making Gemini API call...');
            aiResponse = await callGemini(grammarPrompt, proofreadContext);
            console.log('✅ Gemini response received:', aiResponse?.substring(0, 200) + '...');
        } catch (aiError) {
            console.error('❌ Gemini API call failed:', aiError.message || aiError);
            console.log('🚀 Falling back to OpenAI API...');
            try {
            aiResponse = await callOpenAI(grammarPrompt, proofreadContext);
            console.log('✅ OpenAI response received:', aiResponse?.substring(0, 200) + '...');
            } catch (fallbackError) {
            console.error('❌ Both Gemini and OpenAI calls failed:', fallbackError.message || fallbackError);
            aiResponse = "⚠️ Sorry, both AI services are currently unavailable.";
            }
        }
        
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

        const summarizeContext ="You are a summarization expert. Create concise, accurate summaries.";
        
        let aiResponse;
        try {
            console.log('🚀 Making Gemini API call...');
            aiResponse = await callGemini(summaryPrompt, summarizeContext);
            console.log('✅ Gemini response received:', aiResponse?.substring(0, 200) + '...');
        } catch (aiError) {
            console.error('❌ Gemini API call failed:', aiError.message || aiError);
            console.log('🚀 Falling back to OpenAI API...');
            try {
            aiResponse = await callOpenAI(summaryPrompt, summarizeContext);
            console.log('✅ OpenAI response received:', aiResponse?.substring(0, 200) + '...');
            } catch (fallbackError) {
            console.error('❌ Both Gemini and OpenAI calls failed:', fallbackError.message || fallbackError);
            aiResponse = "⚠️ Sorry, both AI services are currently unavailable.";
            }
        }
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
            status: projectData.status || 'draft',
            reflection: projectData.reflection || null
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
    const { aiType, sectionName, currentContent, projectTitle } = req.body;
    const userId = req.user.uid;

    console.log('AI Write request received:', { id, aiType, sectionName, userId });
    console.log('🔧 AI Service: Will use server-side OpenAI (GPT-4o-mini) - NOT Chrome API');

    if (!aiType) {
        return res.status(400).json({ error: 'AI type is required' });
    }

    // Support new 5-agent team and legacy IDs for backwards compatibility
    const validAITypes = ['brown', 'elza', 'kati', 'steve', 'sam', 'ai_manager', 'ai_helper', 'rasoa', 'rakoto'];
    if (!validAITypes.includes(aiType)) {
        return res.status(400).json({ error: `AI type must be one of: ${validAITypes.join(', ')}` });
    }

    try {
        await ensureProjectExists(id, userId);
        
        // Get project data to fetch the actual project title
        const projectInfo = await getDocumentById('userProjects', id);
        const actualProjectTitle = projectInfo?.title || 'the project';
        
        // Map agent IDs to correct teammates (support legacy IDs)
        let aiTeammate;
        if (['brown', 'elza', 'kati', 'steve', 'sam', 'rasoa', 'rakoto'].includes(aiType)) {
            aiTeammate = AI_TEAMMATES[aiType];
        } else if (aiType === 'ai_manager') {
            aiTeammate = AI_TEAMMATES.rasoa; // Legacy ai_manager maps to rasoa
        } else if (aiType === 'ai_helper') {
            aiTeammate = AI_TEAMMATES.rakoto; // Legacy ai_helper maps to rakoto
        }
        
        // Use the new standardized prompt format
        const writePrompt = aiTeammate?.writePrompt || 'Write content for the report.';
        const taskPrompt = writePrompt
            .replace('{section}', sectionName || 'the project')
            .replace('{projectTitle}', actualProjectTitle);
        
        // Create a config for the AI call
        const aiConfig = {
            max_tokens: 50,
            temperature: 0.7
        };
        
        // Try Chrome Write API first, fallback to Gemini
        let aiResponse;
       
        console.log('🤖 Calling AI for writing task...');
        console.log('🔧 AI Service: OpenAI (GPT-4o-mini)');
        console.log('📝 Task prompt:', taskPrompt.substring(0, 200) + '...');
        console.log('⚙️ AI config:', aiConfig);
        
        const writingContext = `You are ${aiTeammate.name}, a ${aiTeammate.role}. ${aiTeammate.personality}`;
        console.log('👤 Writing context:', writingContext);
        
        // Use centralized AI service with automatic fallback (Gemini first, then OpenAI)
        try {
            console.log('🚀 Making AI call with centralized service...');
            aiResponse = await generateAIContribution(taskPrompt, aiConfig, writingContext);
            console.log('✅ AI response received:', aiResponse?.substring(0, 200) + '...');
        } catch (aiError) {
            console.error('❌ AI service call failed:', aiError.message || aiError);
            aiResponse = "⚠️ Sorry, AI service is currently unavailable.";
        }

        console.log('🧹 Cleaning AI response...');
        const cleanedResponse = cleanAIResponse(aiResponse);
        console.log('✅ Cleaned response:', cleanedResponse?.substring(0, 200) + '...');
        
        console.log('🔄 Converting to HTML...');
        const htmlResponse = convertMarkdownToHTML(cleanedResponse);
        console.log('✅ HTML response:', htmlResponse?.substring(0, 200) + '...');
        
        const aiName = aiTeammate.name;
        const prefixedResponse = `[${aiName}] ${htmlResponse}`;
        console.log('📤 Final prefixed response:', prefixedResponse?.substring(0, 200) + '...');

        console.log('💬 Generating completion message...');
        const completionMessage = await generateCompletionMessage(aiType, 'write');
        console.log('✅ Completion message:', completionMessage);

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



        const finalResponse = {
            success: true,
            aiType: aiType,
            response: prefixedResponse,
            responseType: 'text',
            completionMessage: completionMessage,
            timestamp: Date.now()
        };
        
        console.log('📤 Sending final response to client:', {
            success: finalResponse.success,
            aiType: finalResponse.aiType,
            responseLength: finalResponse.response?.length,
            responsePreview: finalResponse.response?.substring(0, 100) + '...',
            completionMessage: finalResponse.completionMessage
        });

        res.json(finalResponse);

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

    // Support new 5-agent team and legacy IDs for backwards compatibility
    const validAITypes = ['brown', 'elza', 'kati', 'steve', 'sam', 'ai_manager', 'ai_helper', 'rasoa', 'rakoto'];
    if (!validAITypes.includes(aiType)) {
        return res.status(400).json({ error: `AI type must be one of: ${validAITypes.join(', ')}` });
    }

    try {
        await ensureProjectExists(id, userId);
        
        // Get project data to fetch the actual project title
        const projectInfo = await getDocumentById('userProjects', id);
        const actualProjectTitle = projectInfo?.title || 'the project';
        
        // Map agent IDs to correct teammates (support legacy IDs)
        let aiTeammate;
        if (['brown', 'elza', 'kati', 'steve', 'sam', 'rasoa', 'rakoto'].includes(aiType)) {
            aiTeammate = AI_TEAMMATES[aiType];
        } else if (aiType === 'ai_manager') {
            aiTeammate = AI_TEAMMATES.rasoa;
        } else if (aiType === 'ai_helper') {
            aiTeammate = AI_TEAMMATES.rakoto;
        }
        
        // Use the new standardized prompt format
        const reviewPrompt = aiTeammate?.reviewPrompt || 'Review the content.';
        const taskPrompt = reviewPrompt
            .replace('{reportContent}', currentContent || 'No content available');
        
        const aiConfig = {
            max_tokens: 600,
            temperature: 0.7
        };
        
        // const aiResponse = await generateAIContribution(taskPrompt, aiConfig, reviewContext);
        const reviewContext = `You are ${aiTeammate.name}, a ${aiTeammate.role}. ${aiTeammate.personality}`;

        let aiResponse;
        try {
            console.log('🚀 Making AI call with centralized service...');
            aiResponse = await generateAIContribution(taskPrompt, aiConfig, reviewContext);
            console.log('✅ AI response received:', aiResponse?.substring(0, 200) + '...');
        } catch (aiError) {
            console.error('❌ AI service call failed:', aiError.message || aiError);
            aiResponse = "⚠️ Sorry, AI service is currently unavailable.";
        }

        console.log('🧹 Cleaning AI response...');
        const cleanedResponse = cleanAIResponse(aiResponse);
        console.log('✅ Cleaned response:', cleanedResponse?.substring(0, 200) + '...');
        
        console.log('🔄 Converting to HTML...');
        const plainTextResponse = convertMarkdownToPlainText(cleanedResponse);
        console.log('✅ Plain text response:', plainTextResponse?.substring(0, 200) + '...');
        
        const aiName = aiTeammate.name;
        const prefixedResponse = `[${aiName}] ${plainTextResponse}`;

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

    // Support new 5-agent team and legacy IDs for backwards compatibility
    const validAITypes = ['brown', 'elza', 'kati', 'steve', 'sam', 'ai_manager', 'ai_helper', 'rasoa', 'rakoto'];
    if (!validAITypes.includes(aiType)) {
        return res.status(400).json({ error: `AI type must be one of: ${validAITypes.join(', ')}` });
    }

    try {
        await ensureProjectExists(id, userId);
        
        // Get project data to fetch the actual project title
        const projectInfo = await getDocumentById('userProjects', id);
        const actualProjectTitle = projectInfo?.title || 'the project';
        
        // Map agent IDs to correct teammates (support legacy IDs)
        let aiTeammate;
        if (['brown', 'elza', 'kati', 'steve', 'sam', 'rasoa', 'rakoto'].includes(aiType)) {
            aiTeammate = AI_TEAMMATES[aiType];
        } else if (aiType === 'ai_manager') {
            aiTeammate = AI_TEAMMATES.rasoa;
        } else if (aiType === 'ai_helper') {
            aiTeammate = AI_TEAMMATES.rakoto;
        }
        
        // Use the new standardized prompt format
        const suggestPrompt = aiTeammate?.suggestPrompt || 'Suggest improvements.';
        const taskPrompt = suggestPrompt
            .replace('{reportContent}', currentContent || 'No content available');
        
        const aiConfig = {
            max_tokens: 500,
            temperature: 0.7
        };
        
        // const aiResponse = await generateAIContribution(taskPrompt, aiConfig, suggestionContext);
        const suggestionContext = `You are ${aiTeammate.name}, a ${aiTeammate.role}. ${aiTeammate.personality}`;
        
        let aiResponse;
        try {
            console.log('🚀 Making AI call with centralized service...');
            aiResponse = await generateAIContribution(taskPrompt, aiConfig, suggestionContext);
            console.log('✅ AI response received:', aiResponse?.substring(0, 200) + '...');
        } catch (aiError) {
            console.error('❌ AI service call failed:', aiError.message || aiError);
            aiResponse = "⚠️ Sorry, AI service is currently unavailable.";
        }
        
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
            user: { words: 0, percentage: 0 }
        };
        
        // Ensure all current AI teammates are initialized
        const currentAgents = ['brown', 'elza', 'kati', 'steve', 'sam', 'rasoa', 'rakoto'];
        currentAgents.forEach(agentId => {
            if (!wordContributions[agentId]) {
                wordContributions[agentId] = { words: 0, percentage: 0 };
            }
        });

        // Calculate current percentages
        let totalWords = wordContributions.user.words;
        currentAgents.forEach(agentId => {
            totalWords += (wordContributions[agentId]?.words || 0);
        });
        
        if (totalWords > 0) {
            wordContributions.user.percentage = Math.round((wordContributions.user.words / totalWords) * 100 * 100) / 100;
            currentAgents.forEach(agentId => {
                if (wordContributions[agentId]) {
                    wordContributions[agentId].percentage = Math.round((wordContributions[agentId].words / totalWords) * 100 * 100) / 100;
                }
            });
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
        
        // Remove AI contribution patterns
        // Pattern 1: [AI Name - AI Role]: content
        userContent = userContent.replace(/\[(Brown|Elza|Kati|Steve|Sam|Rasoa|Rakoto)\s*-\s*[^\]]*\]:[^[]*/g, '');
        
        // Pattern 2: Legacy AI contribution headers
        userContent = userContent.replace(/<div class="ai-contribution-header"[^>]*>.*?<\/div>/gs, '');
        userContent = userContent.replace(/\[Alex\][^<]*/g, '');
        userContent = userContent.replace(/\[Sam\][^<]*/g, '');
        
        // Pattern 3: Remove AI emoji markers and their content
        userContent = userContent.replace(/🧪[^✨]*✨/g, '');
        userContent = userContent.replace(/✨[^🧪]*🧪/g, '');
        
        // Remove HTML tags for word counting
        userContent = userContent.replace(/<[^>]*>/g, ' ');
        
        // Calculate word count
        const userWordCount = userContent.trim().split(/\s+/).filter(word => word.length > 0).length;

        // Get current word contributions
        let wordContributions = projectData.wordContributions || {
            user: { words: 0, percentage: 100 }
        };
        
        // Get project teammates to determine which AI agents are participating
        const projectTeammates = projectData.team || [];
        const participatingAgents = projectTeammates
            .filter(teammate => teammate.type === 'ai')
            .map(teammate => teammate.id || teammate.name?.toLowerCase())
            .filter(agentId => agentId);

        // Ensure participating AI agents are initialized
        participatingAgents.forEach(agentId => {
            if (!wordContributions[agentId]) {
                wordContributions[agentId] = { words: 0, percentage: 0 };
            }
        });

        // Update user word count
        wordContributions.user.words = userWordCount;

        // Calculate total words and percentages
        let totalWords = wordContributions.user.words;
        participatingAgents.forEach(agentId => {
            totalWords += (wordContributions[agentId]?.words || 0);
        });
        
        if (totalWords > 0) {
            wordContributions.user.percentage = Math.round((wordContributions.user.words / totalWords) * 100 * 100) / 100;
            participatingAgents.forEach(agentId => {
                if (wordContributions[agentId]) {
                    wordContributions[agentId].percentage = Math.round((wordContributions[agentId].words / totalWords) * 100 * 100) / 100;
                }
            });
        } else {
            // Default to 100% human if no content yet
            wordContributions.user.percentage = 100;
            participatingAgents.forEach(agentId => {
                if (wordContributions[agentId]) {
                    wordContributions[agentId].percentage = 0;
                }
            });
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

// Get comments for a project
router.get('/:id/comments', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;
  
    try {
      await ensureProjectExists(id, userId);
      const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
      
      res.json({
        comments: projectData.comments || [],
        lastSaved: projectData.commentsLastSaved || null
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Save comments for a project
  router.post('/:id/comments', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { comments } = req.body;
    const userId = req.user.uid;
  
    try {
      await ensureProjectExists(id, userId);
      
      await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
        comments: comments || [],
        commentsLastSaved: Date.now()
      });
  
      res.json({ success: true, savedAt: Date.now() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Update a specific comment
  router.put('/:id/comments/:commentId', verifyFirebaseToken, async (req, res) => {
    const { id, commentId } = req.params;
    const { text, resolved } = req.body;
    const userId = req.user.uid;
  
    try {
      await ensureProjectExists(id, userId);
      const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
      
      const comments = projectData.comments || [];
      const commentIndex = comments.findIndex(c => c.id === commentId);
      
      if (commentIndex === -1) {
        return res.status(404).json({ error: 'Comment not found' });
      }
  
      // Update comment
      comments[commentIndex] = {
        ...comments[commentIndex],
        text: text !== undefined ? text : comments[commentIndex].text,
        resolved: resolved !== undefined ? resolved : comments[commentIndex].resolved,
        updatedAt: Date.now()
      };
  
      await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
        comments,
        commentsLastSaved: Date.now()
      });
  
      res.json({ success: true, comment: comments[commentIndex] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


// Get data-driven contributions based on existing project data
router.get('/:id/contributions/analysis', verifyFirebaseToken, async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const userId = req.user.uid;

        console.log('📊 Analyzing contributions from existing project data');

        // Ensure project exists
        await ensureProjectExists(projectId, userId);

        // Import the grading service to use its data gathering
        const { AIGradingService } = await import('../services/aiGradingService.js');
        const gradingService = new AIGradingService();
        
        // Gather comprehensive project data (same as grading service)
        const projectData = await gradingService.gatherProjectData(projectId, userId);
        
        // For contribution analysis, we need ALL chat messages, not just user messages
        // Override the user-filtered chat messages with all project messages
        const allChatMessages = await getSubdocuments(COLLECTIONS.USER_PROJECTS, projectId, 'chatMessages');
        projectData.chatMessages = allChatMessages || [];
        
        if (!projectData.project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Analyze contributions from existing data
        const contributions = analyzeContributionsFromData(projectData);

        console.log('📊 Data-driven contributions analysis:', contributions);

        res.json({
            success: true,
            contributions: contributions.formatted,
            analysis: contributions.analysis,
            lastUpdated: Date.now()
        });

    } catch (error) {
        console.error('Error analyzing contributions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Analyze contributions from existing project data
function analyzeContributionsFromData(projectData) {
    const { project, chatMessages, tasks, projectDuration } = projectData;
    
    // Analyze tasks - using correct AI agent names
    const aiAgentNames = ['brown', 'elza', 'kati', 'steve', 'sam', 'rasoa', 'rakoto'];
    
    const userTasks = tasks.filter(task => {
        const assignedTo = task.assignedTo?.toLowerCase();
        return assignedTo && !aiAgentNames.includes(assignedTo);
    });
    
    // Filter AI tasks, but exclude mandatory AI tasks (write/review/suggest)
    const mandatoryAITaskTypes = ['write_section', 'review_content', 'suggest_improvements'];
    const aiTasks = tasks.filter(task => {
        const assignedTo = task.assignedTo?.toLowerCase();
        const taskType = task.taskType || task.type;
        return assignedTo && aiAgentNames.includes(assignedTo) && 
               !mandatoryAITaskTypes.includes(taskType);
    });
    
    const completedUserTasks = userTasks.filter(task => task.status === 'done' || task.status === 'completed');
    const completedAITasks = aiTasks.filter(task => task.status === 'done' || task.status === 'completed');
    
    // Debug logging for tasks
    console.log('📊 Task Analysis Debug:');
    console.log(`Total tasks: ${tasks.length}`);
    console.log(`User tasks: ${userTasks.length} (completed: ${completedUserTasks.length})`);
    console.log(`AI tasks (excluding mandatory): ${aiTasks.length} (completed: ${completedAITasks.length})`);
    console.log('Sample tasks:', tasks.slice(0, 3).map(task => ({
        title: task.title || task.text,
        assignedTo: task.assignedTo,
        taskType: task.taskType || task.type,
        status: task.status,
        isAI: aiAgentNames.includes(task.assignedTo?.toLowerCase()),
        isMandatoryAI: mandatoryAITaskTypes.includes(task.taskType || task.type)
    })));
    
    // Analyze chat participation
    const totalChatMessages = chatMessages.length;
    const userChatMessages = chatMessages.filter(msg => 
        msg.senderType === 'human'
    );
    
    // Debug logging for chat messages
    console.log('📊 Chat Analysis Debug:');
    console.log(`Total chat messages (all): ${totalChatMessages}`);
    console.log(`User chat messages: ${userChatMessages.length}`);
    console.log(`AI chat messages: ${totalChatMessages - userChatMessages.length}`);
    console.log('Sample chat messages:', chatMessages.slice(0, 5).map(msg => ({
        senderType: msg.senderType,
        senderId: msg.senderId,
        senderName: msg.senderName,
        text: (msg.text || msg.content || '').substring(0, 50)
    })));
    
    // Calculate contribution percentages
    const totalTasks = tasks.length;
    const totalCompletedTasks = completedUserTasks.length + completedAITasks.length;
    const userTaskCompletionRate = totalCompletedTasks > 0 ? (completedUserTasks.length / totalCompletedTasks) * 100 : 0;
    const aiTaskCompletionRate = totalCompletedTasks > 0 ? (completedAITasks.length / totalCompletedTasks) * 100 : 0;
    
    const userChatParticipation = totalChatMessages > 0 ? (userChatMessages.length / totalChatMessages) * 100 : 0;
    
    // Calculate overall contribution score
    const userContributionScore = (userTaskCompletionRate * 0.6) + (userChatParticipation * 0.4);
    const aiContributionScore = (aiTaskCompletionRate * 0.6) + ((100 - userChatParticipation) * 0.4);
    
    const totalScore = userContributionScore + aiContributionScore;
    const userPercentage = totalScore > 0 ? (userContributionScore / totalScore) * 100 : 100;
    const aiPercentage = totalScore > 0 ? (aiContributionScore / totalScore) * 100 : 0;
    
    const analysis = {
        tasks: {
            total: totalTasks,
            totalCompleted: totalCompletedTasks,
            userAssigned: userTasks.length,
            userCompleted: completedUserTasks.length,
            aiAssigned: aiTasks.length,
            aiCompleted: completedAITasks.length,
            userCompletionRate: userTaskCompletionRate,
            aiCompletionRate: aiTaskCompletionRate
        },
        chat: {
            totalMessages: totalChatMessages,
            userMessages: userChatMessages.length,
            userParticipation: userChatParticipation
        },
        scores: {
            userContributionScore: userContributionScore,
            aiContributionScore: aiContributionScore,
            userPercentage: userPercentage,
            aiPercentage: aiPercentage
        }
    };
    
    // Break down AI tasks by individual teammates
    const aiTaskBreakdown = {};
    const aiChatBreakdown = {};
    
    // Count tasks and chat messages by AI teammate
    aiTasks.forEach(task => {
        const assignedTo = task.assignedTo?.toLowerCase();
        if (assignedTo && aiAgentNames.includes(assignedTo)) {
            if (!aiTaskBreakdown[assignedTo]) {
                aiTaskBreakdown[assignedTo] = { total: 0, completed: 0 };
            }
            aiTaskBreakdown[assignedTo].total++;
            if (task.status === 'done' || task.status === 'completed') {
                aiTaskBreakdown[assignedTo].completed++;
            }
        }
    });
    
    // Count chat messages by AI teammate
    const aiChatMessages = chatMessages.filter(msg => msg.senderType === 'ai');
    aiChatMessages.forEach(msg => {
        const senderName = msg.senderName?.toLowerCase();
        if (senderName && aiAgentNames.includes(senderName)) {
            if (!aiChatBreakdown[senderName]) {
                aiChatBreakdown[senderName] = 0;
            }
            aiChatBreakdown[senderName]++;
        }
    });
    
    const formatted = [
        {
            name: "You",
            role: "Student",
            percentage: Math.round(userPercentage * 100) / 100,
            color: "#4CAF50",
            details: {
                tasksCompleted: `${completedUserTasks.length} done/${userTasks.length} assigned tasks`,
                chatParticipation: `${userChatMessages.length} chats/${totalChatMessages} messages`,
                completionRate: `${Math.round(userTaskCompletionRate)}% task participation`,
                chatRate: `${Math.round(userChatParticipation)}% chat participation`
            }
        }
    ];
    
    // Calculate individual AI percentages based on their actual activity
    // First, calculate each AI's contribution weight
    const aiWeights = {};
    let totalAiWeight = 0;
    
    aiAgentNames.forEach(agentId => {
        const agent = AI_TEAMMATES[agentId];
        if (agent) {
            const taskData = aiTaskBreakdown[agentId] || { total: 0, completed: 0 };
            const chatCount = aiChatBreakdown[agentId] || 0;
            
            // Calculate weight based on actual activity
            const taskWeight = taskData.total > 0 ? (taskData.completed / taskData.total) : 0;
            const chatWeight = totalChatMessages > 0 ? (chatCount / totalChatMessages) : 0;
            const weight = (taskWeight * 0.6) + (chatWeight * 0.4);
            
            aiWeights[agentId] = weight;
            totalAiWeight += weight;
        }
    });
    
    // If no AI has any activity, distribute the AI percentage equally among all AI teammates
    if (totalAiWeight === 0 && aiPercentage > 0) {
        const equalWeight = 1 / aiAgentNames.length;
        aiAgentNames.forEach(agentId => {
            aiWeights[agentId] = equalWeight;
        });
        totalAiWeight = 1;
    }
    
    // Add individual AI teammates with proportional percentages
    aiAgentNames.forEach(agentId => {
        const agent = AI_TEAMMATES[agentId];
        if (agent) {
            const taskData = aiTaskBreakdown[agentId] || { total: 0, completed: 0 };
            const chatCount = aiChatBreakdown[agentId] || 0;
            
            // Calculate individual AI percentage proportionally
            let individualPercentage = 0;
            if (totalAiWeight > 0 && aiPercentage > 0) {
                individualPercentage = (aiWeights[agentId] / totalAiWeight) * aiPercentage;
            } else if (aiPercentage > 0) {
                // Fallback: distribute equally if no weights calculated
                individualPercentage = aiPercentage / aiAgentNames.length;
            }
            
            // Only include AI teammates that have some activity or if they're part of the project team
            if (aiTaskBreakdown[agentId] || aiChatBreakdown[agentId] || individualPercentage > 0) {
                formatted.push({
                    name: agent.name,
                    role: agent.role,
                    percentage: Math.round(individualPercentage * 100) / 100,
                    color: agent.color,
                    details: {
                        tasksCompleted: `${taskData.completed} done/${taskData.total} assigned tasks`,
                        chatParticipation: `${chatCount} chats/${totalChatMessages} messages`,
                        completionRate: totalCompletedTasks > 0 ? `${Math.round((taskData.completed / totalCompletedTasks) * 100)}% task participation` : '0% task participation',
                        chatRate: `${Math.round((chatCount / totalChatMessages) * 100)}% chat participation`
                    }
                });
            }
        }
    });
    
    // Normalize percentages to ensure they add up to exactly 100%
    const totalPercentage = formatted.reduce((sum, contributor) => sum + contributor.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01 && totalPercentage > 0) {
        const normalizationFactor = 100 / totalPercentage;
        formatted.forEach(contributor => {
            contributor.percentage = Math.round(contributor.percentage * normalizationFactor * 100) / 100;
        });
    }
    
    // Final check: if total is still not 100%, adjust the largest contributor
    const finalTotal = formatted.reduce((sum, contributor) => sum + contributor.percentage, 0);
    if (Math.abs(finalTotal - 100) > 0.01 && formatted.length > 0) {
        const adjustment = 100 - finalTotal;
        const largestContributor = formatted.reduce((max, contributor) => 
            contributor.percentage > max.percentage ? contributor : max
        );
        largestContributor.percentage = Math.round((largestContributor.percentage + adjustment) * 100) / 100;
    }
    
    return { formatted, analysis };
}

// Get real-time contribution data for submission page
router.get('/:id/contributions/realtime', verifyFirebaseToken, async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const userId = req.user.uid;

        console.log('Getting real-time contributions for submission page');

        // Ensure project exists
        await ensureProjectExists(projectId, userId);

        // Get current project data
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, projectId);
        if (!projectData) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get current word contributions
        let wordContributions = projectData.wordContributions || {
            user: { words: 0, percentage: 100 }
        };

        // Get project teammates to determine which AI agents are participating
        const projectTeammates = projectData.team || [];
        const participatingAgents = projectTeammates
            .filter(teammate => teammate.type === 'ai')
            .map(teammate => teammate.id || teammate.name?.toLowerCase())
            .filter(agentId => agentId); // Remove any undefined values

        console.log('Project teammates:', projectTeammates);
        console.log('Participating AI agents:', participatingAgents);

        // Ensure participating AI agents are initialized
        participatingAgents.forEach(agentId => {
            if (!wordContributions[agentId]) {
                wordContributions[agentId] = { words: 0, percentage: 0 };
            }
        });

        // Calculate total words and percentages
        let totalWords = wordContributions.user.words;
        participatingAgents.forEach(agentId => {
            totalWords += (wordContributions[agentId]?.words || 0);
        });
        
        if (totalWords > 0) {
            wordContributions.user.percentage = Math.round((wordContributions.user.words / totalWords) * 100 * 100) / 100;
            participatingAgents.forEach(agentId => {
                if (wordContributions[agentId]) {
                    wordContributions[agentId].percentage = Math.round((wordContributions[agentId].words / totalWords) * 100 * 100) / 100;
                }
            });
        } else {
            // Default to 100% human if no content yet
            wordContributions.user.percentage = 100;
            participatingAgents.forEach(agentId => {
                if (wordContributions[agentId]) {
                    wordContributions[agentId].percentage = 0;
                }
            });
        }

        // Format for frontend with participating AI agents only
        const contributions = [
            {
                name: "You",
                role: "Student", 
                words: wordContributions.user.words,
                percentage: wordContributions.user.percentage,
                color: "#4CAF50"
            }
        ];

        // Import AI agents configuration for colors
        const { AI_AGENTS } = await import('../config/aiAgents.js');
        
        // Add participating AI agents that have contributed
        const aiColors = {
            'brown': AI_AGENTS.brown.color,
            'elza': AI_AGENTS.elza.color, 
            'kati': AI_AGENTS.kati.color,
            'steve': AI_AGENTS.steve.color,
            'sam': AI_AGENTS.sam.color,
            'rasoa': AI_AGENTS.rasoa.color,
            'rakoto': AI_AGENTS.rakoto.color
        };

        participatingAgents.forEach(agentId => {
            if (wordContributions[agentId] && wordContributions[agentId].words > 0) {
                // Get agent name from project teammates or capitalize agentId
                const teammate = projectTeammates.find(t => (t.id || t.name?.toLowerCase()) === agentId);
                const agentName = teammate?.name || agentId.charAt(0).toUpperCase() + agentId.slice(1);
                const agentRole = teammate?.role || "AI Assistant";
                
                contributions.push({
                    name: agentName,
                    role: agentRole,
                    words: wordContributions[agentId].words,
                    percentage: wordContributions[agentId].percentage,
                    color: aiColors[agentId] || '#607D8B'
                });
            }
        });

        console.log('Real-time contributions:', contributions);

        res.json({
            success: true,
            contributions: contributions,
            totalWords: totalWords,
            lastUpdated: projectData.wordContributionsUpdatedAt || Date.now()
        });

    } catch (error) {
        console.error('Error getting real-time contributions:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});


// Generate completion message endpoint
router.post('/:id/ai/completion-message', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { aiType, taskType } = req.body;
    const userId = req.user.uid;

    console.log('Completion message request received:', { id, aiType, taskType, userId });

    if (!aiType || !taskType) {
        return res.status(400).json({ error: 'AI type and task type are required' });
    }

    try {
        // Ensure project exists
        await ensureProjectExists(id, userId);
        
        // Generate completion message
        const completionMessage = await generateCompletionMessage(aiType, taskType);
        
        res.json({
            success: true,
            completionMessage: completionMessage,
            aiType: aiType,
            taskType: taskType,
            timestamp: Date.now()
        });

    } catch (err) {
        console.error('Completion message generation error:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// AI Grading endpoint
router.post('/:id/ai/grade', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;
    
    console.log('AI Grading request received:', { id, userId });
    
    try {
        // Ensure project exists and user has access
        await ensureProjectExists(id, userId);
        
        // Initialize AI grading service
        const gradingService = new AIGradingService();
        
        // Run AI evaluation
        const grades = await gradingService.evaluateProject(id, userId);
        
        // Update project with grades
        await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
            grade: {
                overall: grades.overall,
                workPercentage: grades.workPercentage.score,
                responsiveness: grades.responsiveness.score,
                reportQuality: grades.reportQuality.score
            },
            detailedGrades: grades,
            gradedAt: Date.now()
        });
        
        // Log activity
        const activityLog = {
            timestamp: Date.now(),
            type: 'ai_grading_completion',
            grades: grades
        };
        
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        if (projectData && projectData.activityLogs) {
            projectData.activityLogs.push(activityLog);
            await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
                activityLogs: projectData.activityLogs
            });
        }
        
        res.json({
            success: true,
            message: 'AI grading completed successfully',
            grades: grades
        });
        
    } catch (error) {
        console.error('AI Grading Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Reflection submission endpoint
router.post('/:id/reflection', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { reflection, submittedAt } = req.body;
    const userId = req.user.uid;
    
    console.log('Reflection submission received:', { id, userId, reflectionKeys: Object.keys(reflection) });
    
    if (!reflection || typeof reflection !== 'object') {
        return res.status(400).json({ 
            success: false, 
            error: 'Reflection data is required' 
        });
    }
    
    // Validate required reflection fields
    const requiredFields = ['agreeWithFeedback', 'differentApproach', 'keyLearnings', 'futureImprovements'];
    const missingFields = requiredFields.filter(field => !reflection[field] || !reflection[field].trim());
    
    if (missingFields.length > 0) {
        return res.status(400).json({ 
            success: false, 
            error: `Missing required reflection fields: ${missingFields.join(', ')}` 
        });
    }
    
    try {
        // Ensure project exists and user has access
        await ensureProjectExists(id, userId);
        
        // Prepare reflection data
        const reflectionData = {
            ...reflection,
            submittedAt: submittedAt || new Date().toISOString(),
            submittedBy: userId,
            wordCount: Object.values(reflection).reduce((total, text) => total + (text || '').split(' ').length, 0)
        };
        
        // Update project with reflection
        await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
            reflection: reflectionData,
            reflectionSubmittedAt: Date.now()
        });
        
        // Log activity
        const activityLog = {
            timestamp: Date.now(),
            type: 'reflection_submission',
            reflectionWordCount: reflectionData.wordCount
        };
        
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        if (projectData && projectData.activityLogs) {
            projectData.activityLogs.push(activityLog);
            await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
                activityLogs: projectData.activityLogs
            });
        }
        
        console.log('Reflection saved successfully for project:', id);
        
        res.json({
            success: true,
            message: 'Reflection submitted successfully',
            reflection: reflectionData
        });
        
    } catch (error) {
        console.error('Reflection submission error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get reflection endpoint (for teachers/admin to view)
router.get('/:id/reflection', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;
    
    try {
        // Ensure project exists and user has access
        await ensureProjectExists(id, userId);
        
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        
        if (!projectData) {
            return res.status(404).json({ 
                success: false, 
                error: 'Project not found' 
            });
        }
        
        res.json({
            success: true,
            reflection: projectData.reflection || null,
            hasReflection: !!projectData.reflection
        });
        
    } catch (error) {
        console.error('Get reflection error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// AI Content Reflection endpoint
router.post('/:id/ai-content-reflection', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const { aiTeammate, aiContent, modifiedContent, studentDecision, reflection, timestamp } = req.body;
    const userId = req.user.uid;
    
    console.log('AI Content Reflection received:', { id, userId, aiTeammate, studentDecision });
    
    if (!aiTeammate || !aiContent || !studentDecision) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields: aiTeammate, aiContent, studentDecision' 
        });
    }
    
    if (!['accept', 'modify', 'discard'].includes(studentDecision)) {
        return res.status(400).json({ 
            success: false, 
            error: 'studentDecision must be one of: accept, modify, discard' 
        });
    }
    
    try {
        // Ensure project exists and user has access
        await ensureProjectExists(id, userId);
        
        // Note: Contribution tracking is now handled by data-driven analysis
        // No need for complex word-level difference calculations

        // Prepare reflection data
        const reflectionData = {
            id: `reflection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            aiTeammate,
            aiContent,
            modifiedContent: modifiedContent || null,
            studentDecision,
            reflection: reflection ? reflection.trim() : '',
            timestamp: timestamp || Date.now(),
            submittedBy: userId,
            // Track contribution type for analytics
            contributionType: studentDecision === 'modify' ? 'mixed' : 
                            studentDecision === 'accept' ? 'ai' : 'none'
        };
        
        // Get current project data
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        
        // Initialize aiContentReflections array if it doesn't exist
        const aiContentReflections = projectData.aiContentReflections || [];
        aiContentReflections.push(reflectionData);
        
        // Note: AI content reflection decisions are mandatory, so no contribution points awarded
        console.log(`📝 AI Content Reflection: ${studentDecision} by user for ${aiTeammate.name} (mandatory action - no contribution points)`);
        
        // Update project with new reflection
        await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
            aiContentReflections: aiContentReflections,
            lastAIContentReflectionAt: Date.now()
        });
        
        // Log activity
        const activityLog = {
            timestamp: Date.now(),
            type: 'ai_content_reflection',
            aiTeammate: aiTeammate,
            studentDecision: studentDecision,
            contributionType: reflectionData.contributionType,
            reflectionLength: reflection ? reflection.trim().length : 0
        };
        
        if (projectData.activityLogs) {
            projectData.activityLogs.push(activityLog);
            await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
                activityLogs: projectData.activityLogs
            });
        }
        
        console.log('AI Content Reflection saved successfully for project:', id);
        
        res.json({
            success: true,
            message: 'AI content reflection saved successfully',
            reflection: reflectionData
        });
        
    } catch (error) {
        console.error('AI Content Reflection error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get AI Content Reflections endpoint (for analytics/teacher review)
router.get('/:id/ai-content-reflections', verifyFirebaseToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;
    
    try {
        // Ensure project exists and user has access
        await ensureProjectExists(id, userId);
        
        const projectData = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        
        if (!projectData) {
            return res.status(404).json({ 
                success: false, 
                error: 'Project not found' 
            });
        }
        
        res.json({
            success: true,
            aiContentReflections: projectData.aiContentReflections || [],
            totalReflections: (projectData.aiContentReflections || []).length
        });
        
    } catch (error) {
        console.error('Get AI Content Reflections error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

export default router;

