# Task & Chat Context Flow for AI Agents

## Overview
This document explains how AI agents receive context from both **Firestore tasks** and **chat history** to provide intelligent, context-aware responses.

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER SENDS MESSAGE                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              ChatRoutes.js (POST /:id/chat)                     │
│                                                                  │
│  1. Get project data from Firestore                             │
│     ├─ getProjectWithTasks(projectId, userId)                   │
│     ├─ Fetches project details                                  │
│     └─ Fetches ALL tasks from tasks subcollection               │
│                                                                  │
│  2. Store in memory immediately                                 │
│     └─ storeProjectData(id, tasks, project)                     │
│                                                                  │
│  3. Store user message in conversation memory                   │
│     └─ storeMessage(id, currentDay, {...})                      │
│                                                                  │
│  4. Decide which AI agents should respond                       │
│     └─ decideResponders(content, currentDay, AI_AGENTS)         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           FOR EACH RESPONDING AI AGENT                          │
│                                                                  │
│  aiService.js: generateContextAwareResponse()                   │
│     │                                                            │
│     ├─ Calls contextService.js: getAgentContext()               │
│     │                                                            │
│     └─ Calls contextService.js: buildEnhancedPrompt()           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         contextService.js: getAgentContext()                    │
│                                                                  │
│  STEP 1: Check cache (5-minute validity)                        │
│     └─ getDailyContext(projectId, currentDay)                   │
│                                                                  │
│  STEP 2: Fetch from Firestore                                   │
│     └─ getProjectWithTasks(projectId, userId)                   │
│         ├─ Returns project data                                 │
│         └─ Returns ALL tasks with full details                  │
│                                                                  │
│  STEP 3: Store in task memory                                   │
│     └─ storeProjectData(projectId, tasks, project)              │
│                                                                  │
│  STEP 4: Get conversation history                               │
│     ├─ getConversationHistory() - Last 15 messages              │
│     ├─ getConversationSummary() - Summary of today              │
│     ├─ getMultiDayHistory() - Last 2 days                       │
│     ├─ getMultiDaySummary() - Summary across days               │
│     └─ getPreviousDaysContext() - Previous day messages         │
│                                                                  │
│  STEP 5: Generate enhanced conversation summary                 │
│     └─ generateConversationSummary(projectId, currentDay)       │
│         ├─ Extracts potential tasks mentioned                   │
│         ├─ Identifies action items                              │
│         └─ Extracts key topics                                  │
│                                                                  │
│  STEP 6: Organize tasks by assignee                             │
│     └─ organizeTasksByAssignee(tasks)                           │
│         ├─ alex: []                                             │
│         ├─ rasoa: []                                            │
│         ├─ rakoto: []                                           │
│         ├─ user: []                                             │
│         └─ unassigned: []                                       │
│                                                                  │
│  STEP 7: Build comprehensive context object                     │
│     Returns:                                                     │
│     ├─ Project info (name, description, day)                    │
│     ├─ Agent info (name, role)                                  │
│     ├─ allTasks - ALL tasks from Firestore                      │
│     ├─ myTasks - Tasks assigned to this agent                   │
│     ├─ teammateTasks - Tasks for each other agent               │
│     ├─ userTasks - Tasks assigned to user                       │
│     ├─ unassignedTasks - Tasks not yet assigned                 │
│     ├─ conversationHistory - All recent messages                │
│     ├─ conversationSummary - Summary of today                   │
│     ├─ multiDayHistory - Cross-day context                      │
│     ├─ previousDaysContext - Previous day messages              │
│     ├─ enhancedConversationSummary - AI insights                │
│     ├─ potentialTasks - Tasks mentioned in chat                 │
│     ├─ actionItems - Actions identified                         │
│     ├─ keyTopics - Main discussion topics                       │
│     ├─ formattedTasks - Pretty formatted task list              │
│     ├─ taskSummary - Task status summary                        │
│     └─ assignmentSummary - Agent's task assignments             │
│                                                                  │
│  STEP 8: Cache the context                                      │
│     └─ storeDailyContext(projectId, currentDay, context)        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│      contextService.js: buildEnhancedPrompt()                   │
│                                                                  │
│  Builds a comprehensive prompt containing:                      │
│                                                                  │
│  1. ENHANCED CONTEXT AWARENESS                                  │
│     - Real-time task information from Firestore                 │
│     - Conversation insights and potential tasks                 │
│     - Action items and key topics                               │
│                                                                  │
│  2. CURRENT CONTEXT                                             │
│     - Agent identity and role                                   │
│     - Project name and current day                              │
│     - Teammates and their availability                          │
│                                                                  │
│  3. ALL PROJECT TASKS                                           │
│     For EACH task:                                              │
│     ├─ Task title and description                               │
│     ├─ Task status (todo/in-progress/review/done)               │
│     └─ Who it's assigned to                                     │
│                                                                  │
│  4. YOUR SPECIFIC ASSIGNMENTS                                   │
│     - Tasks assigned to this specific agent                     │
│                                                                  │
│  5. CONTEXT FROM PREVIOUS DAYS                                  │
│     - Important messages from earlier days                      │
│     - Maintains conversation continuity                         │
│                                                                  │
│  6. TODAY'S CONVERSATION                                        │
│     - All messages from today                                   │
│     - Conversation summary                                      │
│                                                                  │
│  7. CONVERSATION INSIGHTS                                       │
│     - Potential tasks mentioned                                 │
│     - Action items identified                                   │
│     - Key topics discussed                                      │
│                                                                  │
│  8. CURRENT MESSAGE                                             │
│     - The user's latest message                                 │
│                                                                  │
│  9. RESPONSE GUIDELINES                                         │
│     - How to respond naturally                                  │
│     - Task reminder system                                      │
│     - Cross-day continuity tips                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              aiService.js: callOpenAI()                         │
│                                                                  │
│  Sends to OpenAI:                                               │
│  ├─ User message                                                │
│  └─ Complete enhanced prompt (with all context)                 │
│                                                                  │
│  Returns:                                                        │
│  └─ Context-aware AI response                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           ChatRoutes.js: Process AI Response                    │
│                                                                  │
│  1. Trim response to reasonable length                          │
│  2. Prefix with agent name                                      │
│  3. Store AI response in Firestore                              │
│  4. Store AI response in conversation memory                    │
│  5. Add to response array                                       │
│  6. Return to user                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. **Real-time Firestore Task Loading**
- Tasks are fetched fresh from Firestore on every chat interaction
- All task fields are preserved: `title`, `description`, `status`, `assignedTo`, etc.
- Tasks are visible to ALL AI agents (for coordination)

### 2. **Task Assignment Logic**
Tasks are automatically organized by assignee:
```javascript
if (assignee.includes('alex')) → Alex's tasks
if (assignee.includes('rasoa')) → Rasoa's tasks
if (assignee.includes('rakoto')) → Rakoto's tasks
if (assignee.includes('user') || longUserId) → User's tasks
else → Unassigned tasks
```

### 3. **Conversation Memory**
- Last 15 messages from current day
- Multi-day history (last 2 days)
- Previous days' context for continuity
- Conversation summaries

### 4. **Enhanced Context Insights**
- Potential tasks mentioned in conversation
- Action items identified from discussion
- Key topics being discussed
- Smart task reminder system

### 5. **Context Caching**
- 5-minute cache validity
- Reduces Firestore reads
- Fresh data when needed

## What AI Agents Can See

Each AI agent receives:

### ✅ **ALL Project Tasks**
```
1. [todo] Design user interface -> Rasoa (Research Planner)
2. [in-progress] Implement backend -> Rakoto (Technical Developer)
3. [todo] Review documentation -> Alex (Project Manager)
4. [done] Create project plan -> User (Human team member)
```

### ✅ **Their Specific Tasks**
```
YOUR SPECIFIC ASSIGNMENTS:
1. [todo] Design user interface
   Description: Create mockups for the main pages
   (This is YOUR task)
```

### ✅ **Full Conversation History**
```
Day 1:
  User: Let's start the project
  Rasoa: Great! I'll begin research
  
Day 2:
  User: How's the design coming?
  Rasoa: Making good progress on mockups
```

### ✅ **Current Day Discussion**
- All messages from today
- Conversation summary
- Key points

## Logging & Debugging

The system provides comprehensive logging at each step:

### ChatRoutes Logs:
- `[ChatRoutes][GET]` - Task loading on chat open
- `[ChatRoutes][POST]` - Task loading on message send
- Task details and assignments

### ContextService Logs:
- `[ContextService]` - Context building process
- Task organization by assignee
- Final context summary

### AIService Logs:
- `[AI Service]` - Context details
- Prompt preview
- Task section sample

## Example Flow

### User sends: "What tasks do I have?"

1. **ChatRoutes** fetches 5 tasks from Firestore
2. **ContextService** organizes them:
   - Rasoa: 2 tasks
   - Rakoto: 1 task
   - User: 2 tasks
3. **BuildEnhancedPrompt** creates prompt showing ALL 5 tasks
4. **AI Agent** sees complete project status and responds:
   > "You have 2 tasks: 1) Create wireframes [in-progress] and 2) Review final design [todo]. Rasoa is working on research and Rakoto is implementing the backend."

## Verification

To verify AI agents have full context, check logs for:
- ✅ `Project data loaded from Firestore`
- ✅ `Tasks: X` (should show actual task count)
- ✅ `Tasks that [agent] can see:` (should list all tasks)
- ✅ `Context built successfully`
- ✅ `Enhanced prompt built`

## Task Assignment Best Practices

For AI agents to properly track tasks:

```javascript
// ✅ CORRECT
{
  title: "Design homepage",
  description: "Create mockup",
  status: "todo",
  assignedTo: "rasoa"  // Use agent name
}

// ❌ INCORRECT
{
  title: "Design homepage",
  assignedTo: "SVX59K699GU3mNMhuF00K8FWOoY2"  // Long user ID (treated as user)
}
```

## Summary

The AI agents now have **complete awareness** of:
1. ✅ All tasks from Firestore (real-time)
2. ✅ Task assignments and status
3. ✅ Full conversation history
4. ✅ Multi-day context
5. ✅ Enhanced conversation insights
6. ✅ Project status and progress

This enables them to provide intelligent, coordinated responses based on the actual project state! 🎉

