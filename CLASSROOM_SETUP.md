# 🏫 Classroom Feature Setup Guide

## Overview
The Classroom feature initializes AI teammates (Rasoa and Rakoto) for collaborative project work.

---

## 🎯 How It Works

### 1. **Navigate to Classroom**
Go to: `http://localhost:5173/project/{projectId}/classroom`

Example: `http://localhost:5173/project/6I0t7Hj4UDPjiX1a45Il/classroom`

### 2. **Click "Activate Classroom"**
This button will:
- Initialize the `teammates` subcollection in Firestore
- Create 3 teammates:
  - **You** (Human - Project Owner) 👤
  - **Rasoa** (AI - Documentation Specialist) 📝
  - **Rakoto** (AI - Testing Expert) 🧪

### 3. **Redirects to Chat**
After activation (2 seconds), you'll be redirected to the Chat page where you can:
- See your AI teammates in the sidebar
- Mention them with `@rasoa` or `@rakoto`
- They will respond based on their availability

---

## 🔧 Technical Details

### Backend Endpoint
```
POST /api/project/:id/init-teammates
```

**What it does:**
1. Verifies user has access to the project
2. Checks if teammates already exist (prevents duplicates)
3. Creates teammates with full config:
   - Human user teammate
   - Rasoa (AI agent)
   - Rakoto (AI agent)

**Response:**
```json
{
  "success": true,
  "message": "Teammates initialized successfully",
  "count": 3
}
```

### Frontend Components

#### Classroom.jsx
- `/project/:id/classroom` route
- Checks if classroom is already activated
- Shows "Activate Classroom" button
- Displays teammate cards after activation
- Redirects to Chat page

#### Chat.jsx (Phase 3)
- GET `/api/project/:id/chat` - Fetches messages with teammates data
- POST `/api/project/:id/chat` - Sends messages and handles @mentions
- Checks teammate availability before allowing chat

---

## 📊 Firestore Structure

```
userProjects/{projectId}/teammates/{teammateId}
```

### Teammate Document Schema:
```javascript
{
  id: "rasoa",
  name: "Rasoa",
  type: "ai",
  role: "Documentation Specialist",
  avatar: "📝",
  color: "#FF6B6B",
  config: {
    activeDays: [1, 3, 6],  // Monday, Wednesday, Saturday
    activeHours: { start: 9, end: 17 },
    messageQuota: { daily: 2, perResponse: 1 }
  },
  state: {
    isAvailable: true,
    lastActiveDay: 0,
    sleepUntilDay: null
  },
  stats: {
    messagesUsed: 0,
    tasksAssigned: 0,
    tasksCompleted: 0,
    lastResetDate: "2025-10-24"
  },
  joinedAt: Timestamp
}
```

---

## 🧪 Testing Steps

1. **Create a new project** from Project Selection page
2. **Navigate to Classroom**: 
   - URL: `/project/{projectId}/classroom`
   - Or click "Classroom" in navigation
3. **Click "Activate Classroom"**
4. **Verify teammates created** in Firestore Console
5. **Go to Chat page** (auto-redirected)
6. **Send a message** - should work now (no 403 error!)
7. **Mention AI teammates**: `@rasoa can you help?`

---

## ✅ Success Criteria

- ✅ No more 403 errors when sending chat messages
- ✅ Teammates appear in sidebar/panel
- ✅ Can @mention Rasoa and Rakoto
- ✅ AI agents respect their availability schedules
- ✅ Message quotas are tracked and enforced

---

## 🔍 Troubleshooting

### "You are not a member of this project" (403)
- **Cause**: Teammates not initialized
- **Fix**: Go to Classroom page and click "Activate Classroom"

### "Teammates already initialized"
- **Cause**: Already activated for this project
- **Fix**: This is expected! Just go to Chat page

### Can't access Classroom page
- **Cause**: Not using the correct URL with project ID
- **Fix**: Use `/project/{projectId}/classroom` not just `/classroom`

---

## 🚀 Next Steps

1. **Phase 4**: Add more AI agents (Alex, etc.)
2. **Phase 5**: Implement `/classroom` command in Chat
3. **Phase 6**: Add teammate management UI
4. **Phase 7**: Analytics dashboard for teammate activity

---

## 📝 Files Modified

### Backend
- `/haira-server/routes/ChatRoutesPhase3.js` - Added init-teammates endpoint
- `/haira-server/services/teammateService.js` - Already existed with all functions

### Frontend  
- `/haira-client/src/pages/Classroom.jsx` - Complete redesign with activation
- `/haira-client/src/App.jsx` - Added `/project/:id/classroom` route

---

**Last Updated**: October 24, 2025  
**Status**: ✅ Ready for Testing
