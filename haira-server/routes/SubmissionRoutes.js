import express from 'express'
import { 
    updateUserProject,
    ensureProjectExists,
    updateDocument,
    getDocumentById,
    getSubdocuments
} from '../services/firebaseService.js';
import { COLLECTIONS } from '../schema/database.js';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';

import { 
    generateGradeResponse,
    generateAIContribution,
    generateCompletionMessage
} from '../services/aiService.js';
import { AI_TEAMMATES } from '../config/aiAgents.js';
import { AIGradingService } from '../services/aiGradingService.js';
import { getTeammates } from '../services/teammateService.js';
import { 
    convertMarkdownToHTML,
    convertMarkdownToPlainText ,
    cleanAIResponse,
    parseAIResponseToJson
} from '../utils/editorTextUtils.js';


const router = express.Router()


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


// AI Grade Submission endpoint
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
        const projectDoc = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        const projectInfo = projectDoc.data();
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
        const projectDoc = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        const projectInfo = projectDoc.data();
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
            max_tokens: 60,
            temperature: 0.7
        };
        
        // const aiResponse = await generateAIContribution(taskPrompt, aiConfig, reviewContext);
        const reviewContext = `You are ${aiTeammate.name}, a ${aiTeammate.role}. ${aiTeammate.personality}`;

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
        const projectDoc = await getDocumentById(COLLECTIONS.USER_PROJECTS, id);
        const projectInfo = projectDoc.data();
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
            max_tokens: 50,
            temperature: 0.7
        };
        
        // const aiResponse = await generateAIContribution(taskPrompt, aiConfig, suggestionContext);
        const suggestionContext = `You are ${aiTeammate.name}, a ${aiTeammate.role}. ${aiTeammate.personality}`;
        
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
    const userTaskCompletionRate = totalTasks > 0 ? (completedUserTasks.length / totalTasks) * 100 : 0;
    const aiTaskCompletionRate = totalTasks > 0 ? (completedAITasks.length / totalTasks) * 100 : 0;
    
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
                tasksCompleted: `${completedUserTasks.length} done/${userTasks.length} assigned`,
                chatParticipation: `${userChatMessages.length} chats/${totalChatMessages} messages`,
                completionRate: `${Math.round(userPercentage)}% of total completed tasks`,
                chatRate: `${Math.round(userChatParticipation)}% of total chat participation`
            }
        }
    ];
    
    // Calculate individual AI percentages based on their actual activity
    // First, calculate each AI's contribution weight
    const aiWeights = {};
    let totalAiWeight = 0;
    
    aiAgentNames.forEach(agentId => {
        const agent = AI_TEAMMATES[agentId];
        if (agent && (aiTaskBreakdown[agentId] || aiChatBreakdown[agentId])) {
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
    
    // Add individual AI teammates with proportional percentages
    aiAgentNames.forEach(agentId => {
        const agent = AI_TEAMMATES[agentId];
        if (agent && (aiTaskBreakdown[agentId] || aiChatBreakdown[agentId])) {
            const taskData = aiTaskBreakdown[agentId] || { total: 0, completed: 0 };
            const chatCount = aiChatBreakdown[agentId] || 0;
            
            // Calculate individual AI percentage proportionally
            let individualPercentage = 0;
            if (totalAiWeight > 0 && aiPercentage > 0) {
                individualPercentage = (aiWeights[agentId] / totalAiWeight) * aiPercentage;
            }
            
            formatted.push({
                name: agent.name,
                role: agent.role,
                percentage: Math.round(individualPercentage * 100) / 100,
                color: agent.color,
                details: {
                    tasksCompleted: `${taskData.completed} done/${taskData.total} assigned`,
                    chatParticipation: `${chatCount} chats/${totalChatMessages} messages`,
                    completionRate: `${Math.round(individualPercentage)}% of total completed tasks`,
                    chatRate: `${Math.round((chatCount / totalChatMessages) * 100)}% chat participation`
                }
            });
        }
    });
    
    // Normalize percentages to ensure they add up to exactly 100%
    const totalPercentage = formatted.reduce((sum, contributor) => sum + contributor.percentage, 0);
    if (totalPercentage !== 100 && totalPercentage > 0) {
        const normalizationFactor = 100 / totalPercentage;
        formatted.forEach(contributor => {
            contributor.percentage = Math.round(contributor.percentage * normalizationFactor * 100) / 100;
        });
    }
    
    return { formatted, analysis };
}



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


export default router;

