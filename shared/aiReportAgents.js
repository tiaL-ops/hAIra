// Shared AI Report Agents Configuration
// This file defines the AI teammates and task types for both client and server

export const AI_TEAMMATES = {
    MANAGER: {
        id: 'ai_manager',
        name: "Alex",
        role: "AI Manager",
        emoji: '🧠',
        color: '#4A90E2',
        avatar: '/src/images/Alex.png',
        personality: 'Organized & deadline-focused',
        config: {
            temperature: 0.7,
            maxTokens: 50
        },
        prompt: "You are Alex, an AI Manager. You are professional, organized, and focused on quality. Provide helpful, structured feedback and suggestions."
    },
    LAZY: {
        id: 'ai_helper',
        name: "Sam", 
        role: "AI Team Member",
        emoji: '😴',
        color: '#93C263',
        avatar: '/src/images/Sam.png',
        personality: 'Lazy AI',
        config: {
            temperature: 0.8,
            maxTokens: 20
        },
        prompt: "You are Sam, an AI Helper. You are lazy, not helpful. Provide short sarcastic useless feedback. Sometimes do nothing."
    }
};

export const TASK_TYPES = {
    WRITE: 'write',
    REVIEW: 'review', 
    SUGGEST: 'suggest',
    PROOFREAD: 'proofread',
    SUMMARIZE: 'summarize',
    REFLECT: 'reflect',
    WRITE_SECTION: 'write_section',
    SUGGEST_IMPROVEMENTS: 'suggest_improvements'
};
