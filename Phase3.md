# Phase 3: Chat Route Updates - Sync with Teammates

### Goal
Sync chat messages with teammates subcollection while respecting AI agent availability rules (active days, active hours, daily message quotas).

---

### POST /api/project/:id/chat - Send Message

### Flow: When User Sends Message
```
1. Validate user exists in teammates collection
   ↓
2. Save message to chatMessages collection
   {
     messageId: string,
     projectId: string,
     senderId: userId,        // teammate ID
     senderName: string,
     senderType: "human",
     content: string,
     timestamp: number,
     type: "message"
   }
   ↓
3. Update teammates/{userId}:
   stats.messagesSent++
   state.lastActive = now
   state.status = "online"
   ↓
4. Parse message for @mentions (e.g., "@alex", "@rasoa")
   ↓
5. For each mentioned agent:
   
   a. Fetch teammate document from teammates/{agentId}
   
   b. Check availability (ALL must be true):
      ✓ Is config.isActive === true?
      ✓ Is project.currentDay in config.activeDays? (e.g., [1,3,6])
      ✓ Is currentHour (UTC) in config.activeHours? (e.g., 9-18)
      ✓ Is state.messagesLeftToday > 0?
   
   c. If AVAILABLE:
      → Trigger AI response (call AI API with agent's prompt)
      → Save AI response to chatMessages
      → Update teammates/{agentId}:
         state.messagesLeftToday--
         stats.messagesSent++
         state.lastActive = now
         state.status = "online"
   
   d. If UNAVAILABLE:
      → Get random sleep response from config.sleepResponses[]
      → Append availability info:
         "Available on days [1,3,6] from 9 AM-6 PM UTC (0/2 messages left)"
      → Save sleep response to chatMessages
      → Optional: Update teammates/{agentId}:
         stats.missedMentions++
```

### Response
```javascript
{
  success: true,
  message: { /* saved message object */ },
  mentionsHandled: 2  // number of agents mentioned
}
```

---

## 📥 GET /api/project/:id/chat - Fetch Chat History

### Flow: When Fetching Messages
```
1. Fetch all messages from chatMessages collection
   (orderBy timestamp, limit last 100)
   ↓
2. Fetch all teammates for this project
   const teammates = await getTeammates(projectId)
   ↓
3. Fetch project data to get currentDay
   const project = await db.collection('userProjects').doc(projectId).get()
   const currentDay = project.data().currentDay
   ↓
4. Enrich each message with sender data:
   enrichedMessages = messages.map(msg => ({
     ...msg,
     senderName: teammates[msg.senderId]?.name,
     senderAvatar: teammates[msg.senderId]?.avatar,
     senderStatus: teammates[msg.senderId]?.state.status,
     senderRole: teammates[msg.senderId]?.role,
     senderColor: teammates[msg.senderId]?.color
   }))
   ↓
5. Calculate real-time availability for each AI agent:
   availability = {}
   for each teammate where type === 'ai':
     availability[teammate.id] = {
       isAvailableNow: boolean,
       reason: "wrong_day" | "outside_hours" | "quota_exhausted" | "disabled" | null,
       messagesLeftToday: number,
       activeDays: [1,3,6],
       activeHours: {start: 9, end: 18},
       nextAvailableTime: timestamp (calculated if offline)
     }
   ↓
6. Return combined data
```

### Response
```javascript
{
  messages: [
    {
      messageId: "msg-123",
      senderId: "alex",
      senderName: "Alex",           // ← from teammates
      senderAvatar: "/images/Alex.png", // ← from teammates
      senderStatus: "online",       // ← from teammates.state.status
      senderRole: "Project Manager", // ← from teammates.role
      senderColor: "#9b59b6",       // ← from teammates.color
      content: "Let's review the tasks",
      timestamp: 1729785600000,
      type: "message"
    },
    // ... more messages
  ],
  teammates: {
    "alex": { id: "alex", name: "Alex", type: "ai", ... },
    "rasoa": { id: "rasoa", name: "Rasoa", type: "ai", ... },
    "rakoto": { id: "rakoto", name: "Rakoto", type: "ai", ... },
    "user123": { id: "user123", name: "Landy", type: "human", ... }
  },
  availability: {
    "alex": {
      isAvailableNow: false,
      reason: "wrong_day",
      messagesLeftToday: 2,
      activeDays: [1, 3, 6],
      activeHours: { start: 9, end: 18 },
      nextAvailableTime: 1729900800000  // Day 3 at 9 AM
    },
    "rasoa": {
      isAvailableNow: true,
      reason: null,
      messagesLeftToday: 999,
      activeDays: [2, 4, 5],
      activeHours: { start: 8, end: 17 }
    },
    // ... other AI agents
  },
  currentDay: 2
}
```

---

## 🛠️ Helper Functions Needed

### 1. `isTeammateAvailable(projectId, teammateId)`
**Location**: `/haira-server/services/teammateService.js`

Checks if an AI agent can respond right now.

**Returns**:
```javascript
{
  available: boolean,
  reason: "disabled" | "wrong_day" | "outside_hours" | "quota_exhausted" | null,
  message: "Human-readable explanation",
  messagesLeftToday: number,
  activeDays: [1, 3, 6],
  activeHours: { start: 9, end: 18 },
  nextAvailableTime: timestamp
}
```

**Logic**:
```javascript
1. If teammate.type === "human" → return { available: true }
2. If !teammate.config.isActive → return { available: false, reason: "disabled" }
3. Get project.currentDay
4. If currentDay NOT in config.activeDays → return { available: false, reason: "wrong_day" }
5. Get currentHour (UTC)
6. If currentHour < activeHours.start OR >= activeHours.end → return { available: false, reason: "outside_hours" }
7. If state.messagesLeftToday <= 0 → return { available: false, reason: "quota_exhausted" }
8. Else → return { available: true }
```

---

### 2. `extractMentions(messageContent)`
**Location**: `/haira-server/services/teammateService.js`

Parses message for @mentions.

**Input**: `"Hey @alex and @rasoa, can you help?"`  
**Output**: `["alex", "rasoa"]`

**Logic**:
```javascript
const mentionRegex = /@(\w+)/g;
const matches = messageContent.matchAll(mentionRegex);
const mentions = [...matches].map(match => match[1].toLowerCase());
return [...new Set(mentions)]; // Remove duplicates
```

---

### 3. `getSleepResponse(teammate, availabilityCheck)`
**Location**: `/haira-server/services/teammateService.js`

Generates a friendly sleep response when agent is unavailable.

**Input**:
```javascript
teammate = { name: "Alex", config: { sleepResponses: [...] } }
availabilityCheck = { reason: "wrong_day", activeDays: [1,3,6], ... }
```

**Output**:
```javascript
"💤 Alex is offline right now. I'm available on days 1, 3, and 6 from 9 AM - 6 PM UTC. (2/2 messages left today)"
```

**Logic**:
```javascript
const baseResponse = teammate.config.sleepResponses[
  Math.floor(Math.random() * teammate.config.sleepResponses.length)
];

let details = "";
if (availabilityCheck.reason === "wrong_day") {
  details = `I'm available on days ${availabilityCheck.activeDays.join(', ')}.`;
} else if (availabilityCheck.reason === "outside_hours") {
  details = `I'm available from ${availabilityCheck.activeHours.start}:00 - ${availabilityCheck.activeHours.end}:00 UTC.`;
} else if (availabilityCheck.reason === "quota_exhausted") {
  details = `I've reached my daily message limit.`;
}

return `${baseResponse} ${details}`.trim();
```

---

### 4. `triggerAgentResponse(projectId, agentId, triggerMessage)`
**Location**: `/haira-server/services/aiService.js`

Triggers AI agent to generate and send a response.

**Steps**:
```javascript
1. Fetch agent teammate data
2. Fetch last 20 messages from chatMessages (for context)
3. Fetch project data (title, currentDay, etc.)
4. Build AI prompt:
   - System prompt from teammate.config.prompt
   - Project context
   - Conversation history
   - Current message that mentioned agent
5. Call AI API (OpenAI/Claude/etc.)
6. Save AI response to chatMessages:
   {
     messageId: generateId(),
     projectId: projectId,
     senderId: agentId,
     senderName: teammate.name,
     senderType: "ai",
     content: aiGeneratedResponse,
     timestamp: Date.now(),
     type: "message",
     inReplyTo: triggerMessage.messageId
   }
```

---

## ✅ Implementation Checklist

### Helper Functions (teammateService.js)
- [ ] Add `isTeammateAvailable(projectId, teammateId)`
- [ ] Add `extractMentions(messageContent)`
- [ ] Add `getSleepResponse(teammate, availabilityCheck)`

### AI Response (aiService.js)
- [ ] Add `triggerAgentResponse(projectId, agentId, triggerMessage)`

### Chat Routes (ChatRoutes.js)
- [ ] Update `GET /api/project/:id/chat`:
  - Fetch teammates
  - Fetch project.currentDay
  - Enrich messages with teammate data
  - Calculate availability for each AI agent
  - Return messages + teammates + availability
  
- [ ] Update `POST /api/project/:id/chat`:
  - Validate user is teammate
  - Save message to chatMessages
  - Update user teammate stats
  - Extract @mentions
  - For each mention:
    - Check availability
    - If available → trigger AI response
    - If unavailable → send sleep response
  - Return success response

### Daily Reset Job (Optional - Phase 4)
- [ ] Create cron job to reset `messagesLeftToday` at midnight UTC
- [ ] Call `resetDailyMessageQuotas(projectId)` for all active projects

---

## 🧪 Testing Scenarios

### Scenario 1: User mentions available agent
```
Given: Alex is active on Day 3, 2 PM UTC (within 9-18), 2 messages left
When: User sends "@alex can you review this?"
Then: 
  ✓ Alex responds with AI-generated message
  ✓ teammates/alex.state.messagesLeftToday = 1
  ✓ teammates/alex.stats.messagesSent++
```

### Scenario 2: User mentions unavailable agent (wrong day)
```
Given: Alex is active on Day [1,3,6], but today is Day 2
When: User sends "@alex hello"
Then:
  ✓ Alex sends sleep response: "💤 I'm available on days 1, 3, and 6..."
  ✓ teammates/alex.stats.missedMentions++
  ✓ No AI API call made
```

### Scenario 3: User mentions agent with exhausted quota
```
Given: Alex has messagesLeftToday = 0 (sent 2/2 messages)
When: User sends "@alex help"
Then:
  ✓ Alex sends sleep response: "I've reached my daily message limit."
  ✓ No AI API call made
```

### Scenario 4: Fetch chat history
```
When: GET /api/project/123/chat
Then:
  ✓ Messages enriched with senderName, senderAvatar, senderStatus
  ✓ Availability calculated for alex, rasoa, rakoto
  ✓ Frontend can display "Alex is online" or "Alex is offline (available Day 3)"
```

---

## 📊 Success Criteria

- ✅ Chat messages sync with teammates subcollection
- ✅ AI agents only respond when available (correct day/hour/quota)
- ✅ Sleep responses sent when agents unavailable
- ✅ Teammate stats update correctly (messagesSent, lastActive)
- ✅ Frontend receives availability info for all agents
- ✅ Daily quota tracking works (messagesLeftToday decrements)
- ✅ @mentions parsed and handled correctly



