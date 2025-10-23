# Multi-Agent Collaboration System

This document describes the multi-agent collaboration features implemented for the hAIra submission page.

## Overview

The system enables collaborative writing with two AI teammates:
- **ManagerAI** 🧠 - Structured, thorough, and professional
- **LazyAI** 😴 - Casual, minimal, and humorous

## Features

### 1. Team Setup
- Automatically assigns default AI teammates if none exist
- Fetches team data from Firestore on page load
- Updates team configuration in backend

### 2. Task Assignment UI
- **TeamPanel** component displays available AI teammates
- Click on an AI to assign tasks:
  - ✍️ **Write Section** - AI writes content directly into editor
  - 👀 **Review** - AI provides feedback as comments
  - 💡 **Suggest Improvements** - AI suggests enhancements

### 3. Editor Integration
- **Write Section**: AI text inserted with color coding (blue for Manager, gray for Lazy)
- **Review/Suggest**: AI feedback added as styled comments in editor
- All changes integrate with existing autosave system

### 4. Task Completion Feedback
- **TaskCompletionFeedback** component shows completion messages
- ManagerAI: "✅ Done — anything else to assign?"
- LazyAI: "😴 I did something… kind of."
- Auto-dismisses after 5 seconds

## Technical Implementation

### Backend Routes
- `POST /api/project/:id/ai/performTask` - Main AI task execution
- `POST /api/project/:id/team` - Team management
- `GET /api/project/:id/submission` - Includes team data

### Frontend Components
- `TeamPanel.jsx` - Task assignment interface
- `TaskCompletionFeedback.jsx` - Completion message display
- `useAITeam.js` - Hook for AI task management

### AI Personalities
- **ManagerAI**: Detailed, structured responses (200 tokens, blue color)
- **LazyAI**: Short, casual responses (100 tokens, gray color)

## Usage

1. **Load Submission Page**: AI teammates are automatically added if missing
2. **Assign Tasks**: Click on AI teammate → Select task type → Optional section name
3. **View Results**: 
   - Text tasks: Colored text inserted into editor
   - Comment tasks: Styled comments added to editor
   - Completion feedback: Notification appears in top-right

## File Structure

```
haira-server/
├── config/aiAgents.js          # AI personality configurations
├── routes/
│   ├── ProjectRoutes.js        # Team management routes
│   └── SubmissionRoutes.js     # AI task execution routes

haira-client/
├── components/
│   ├── TeamPanel.jsx           # Task assignment UI
│   └── TaskCompletionFeedback.jsx # Completion messages
├── hooks/
│   └── useAITeam.js            # AI task management hook
├── pages/
│   └── Submission.jsx          # Main integration
└── styles/
    ├── TeamPanel.css           # Team panel styling
    ├── TaskCompletionFeedback.css # Feedback styling
    └── editor.css              # AI comment styles
```

## Configuration

AI personalities can be customized in `config/aiAgents.js`:
- Prompts and response styles
- Token limits and temperature
- Colors and emojis
- Task type definitions

## Integration Notes

- Works with existing tiptap editor and autosave system
- No new database schema required
- Backward compatible with existing projects
- Activity logging for task completion tracking
