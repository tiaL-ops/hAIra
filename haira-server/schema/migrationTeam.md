# 🎯 Team Data Migration to Teammates Subcollection

## 📋 Overview
Migrate team member data from a `team` array to a `teammates` subcollection to enable real-time sync across Chat, Kanban, and Submission routes, and support `/classroom` command coordination.

---

## 🔍 Current State

### Data Structure
```
userProjects/{projectId}
  ├── team: [
  │     {id, name, role, avatar, color, config: {...}},
  │     ...
  │   ]
  ├── wordContributions: {alex: {words: 260}, ...}
  └── (other fields)
```

### Problems
- ❌ Team data duplicated across routes
- ❌ No automatic sync between Chat/Kanban/Submission
- ❌ Hard to query individual teammate stats
- ❌ Inefficient updates (must rewrite entire team array)
- ❌ No task assignment tracking per teammate
- ❌ No message count tracking per teammate

---

## 🎯 Target State

### Data Structure
```
userProjects/{projectId}
  ├── team: [...] (keep for backward compatibility)
  ├── wordContributions: {...} (keep for report stats)
  │
  └── teammates/ (NEW subcollection)
      ├── ai_manager/
      │   ├── id: "ai_manager"
      │   ├── name: "Alex (Project Manager)"
      │   ├── type: "ai"
      │   ├── role: "Project Manager"
      │   ├── avatar: "/src/images/Alex.png"
      │   ├── color: "#9b59b6"
      │   ├── config: {maxTokens, temperature, prompt, ...}
      │   ├── state: {status, currentTask, assignedTasks, lastActive}
      │   └── stats: {tasksAssigned, tasksCompleted, messagesSent, wordsContributed}
      │
      ├── ai_helper/
      └── {userId}/
```

### Benefits
- ✅ Single source of truth for teammate data
- ✅ Automatic sync across all routes
- ✅ Efficient queries (e.g., "Get all Alex's tasks")
- ✅ Individual teammate updates (no rewriting entire array)
- ✅ Real-time stats tracking
- ✅ Supports `/classroom` command coordination

---

## 📦 Migration Roadmap

### Phase 1: Schema Definition
**Goal**: Define the structure for teammates subcollection

- [ ] Define `TEAMMATE_SCHEMA` in `/haira-server/schema/database.js`
- [ ] Document schema fields and their purposes
- [ ] Review schema compatibility with existing `team` array structure

**Key Fields**:
- Identity: `id`, `name`, `type`, `role`
- UI: `avatar`, `color`
- Config: `maxTokens`, `temperature`, `prompt`, `personality`, `isActive`
- State: `status`, `currentTask`, `assignedTasks`, `lastActive`
- Stats: `tasksAssigned`, `tasksCompleted`, `messagesSent`, `wordsContributed`

---

### Phase 2: Service Layer
**Goal**: Create utility functions for teammate operations

- [ ] Create `/haira-server/services/teammateService.js`
- [ ] Implement `initializeTeammates(projectId, userId, userName)` - create teammates on new project
- [ ] Implement `migrateTeamToTeammates(projectId)` - migrate existing projects
- [ ] Implement `getTeammate(projectId, teammateId)` - fetch single teammate
- [ ] Implement `getTeammates(projectId)` - fetch all teammates
- [ ] Implement `updateTeammateStats(projectId, teammateId, updates)` - update stats
- [ ] Implement `syncTeamArrayFromTeammates(projectId)` - keep team array in sync (optional)

**Functions Needed**:
```
initializeTeammates()     → Copy AI_AGENTS config to Firestore
migrateTeamToTeammates()  → Convert team[] to teammates subcollection
getTeammate()             → Fetch single teammate data
getTeammates()            → Fetch all teammates for a project
updateTeammateStats()     → Increment stats, update state
syncTeamArrayFromTeammates() → Optional: keep team[] in sync
```

---

### Phase 3: Route Updates - Chat
**Goal**: Sync chat messages with teammates

**GET /api/project/:id/chat**:
- [ ] Fetch teammates along with messages
- [ ] Enrich messages with teammate data (avatar, status, role)
- [ ] Return teammates object to frontend

**POST /api/project/:id/chat**:
- [ ] Validate senderId exists in teammates
- [ ] Update teammate stats when message sent:
  - Increment `stats.messagesSent`
  - Update `state.lastActive`
  - Update `state.status` to "online"
- [ ] Handle @mentions to trigger agent responses based on teammate config

**Data Flow**:
```
User sends message
  → Save to chatMessages
  → Update teammates/{userId}.stats.messagesSent++
  → Update teammates/{userId}.state.lastActive
  → If @alex mentioned → Check teammates/alex.config.isActive → Trigger response
```

---

### Phase 4: Route Updates - Kanban
**Goal**: Sync task assignments with teammates

**POST /api/project/:id/kanban/task**:
- [ ] Validate `assignedTo` exists in teammates collection
- [ ] Update teammate when task created:
  - Add taskId to `state.assignedTasks[]`
  - Increment `stats.tasksAssigned`
  - Set `state.currentTask`

**PATCH /api/project/:id/kanban/task/:taskId**:
- [ ] When assignedTo changes:
  - Remove taskId from old teammate's `assignedTasks`
  - Add taskId to new teammate's `assignedTasks`
  - Increment new teammate's `tasksAssigned`
- [ ] When status → "done":
  - Remove taskId from teammate's `assignedTasks`
  - Increment teammate's `tasksCompleted`
  - Clear teammate's `currentTask`

**GET /api/project/:id/kanban**:
- [ ] Fetch teammates along with tasks
- [ ] Enrich tasks with assignee data (name, avatar, current workload)

**Data Flow**:
```
Task assigned to Alex
  → Update tasks/{taskId}.assignedTo = "ai_manager"
  → Update teammates/ai_manager.state.assignedTasks.push(taskId)
  → Update teammates/ai_manager.stats.tasksAssigned++
  → Update teammates/ai_manager.state.currentTask = taskId

Task marked done
  → Update tasks/{taskId}.status = "done"
  → Update teammates/ai_manager.state.assignedTasks.remove(taskId)
  → Update teammates/ai_manager.stats.tasksCompleted++
  → Update teammates/ai_manager.state.currentTask = null
```

---

### Phase 5: Route Updates - Submission
**Goal**: Display contributor stats from teammates

**GET /api/project/:id/submission**:
- [ ] Fetch all teammates instead of using team array
- [ ] Show contributor stats:
  - `stats.tasksCompleted` per teammate
  - `stats.wordsContributed` from wordContributions
  - `stats.messagesSent` per teammate
- [ ] Remove dependency on `team` array

**PATCH /api/project/:id/submission** (if word count updates):
- [ ] Update `stats.wordsContributed` in teammates when word count changes
- [ ] Keep `wordContributions` object in sync with teammate stats

**Data Flow**:
```
Fetch submission data
  → Read teammates/{teammateId}.stats.wordsContributed
  → Read teammates/{teammateId}.stats.tasksCompleted
  → Read teammates/{teammateId}.stats.messagesSent
  → Display contributor breakdown

Word count updated
  → Update wordContributions.alex.words = 260
  → Update teammates/ai_manager.stats.wordsContributed = 260
```

---

### Phase 6: Project Creation
**Goal**: Initialize teammates on new project creation

**POST /api/project**:
- [ ] After creating project document, call `initializeTeammates()`
- [ ] Copy AI agent configs from `/config/aiAgents.js`:
  - For each agent in AI_AGENTS (alex, rasoa, rakoto)
  - Create teammate document with config, state, stats
- [ ] Create human user teammate:
  - Type: "human"
  - Role: "owner"
  - Status: "online"

**Data Flow**:
```
User creates project
  → Create project document in userProjects/
  → Call initializeTeammates(projectId, userId, userName)
  → For each AI_AGENTS entry:
      Create teammates/ai_manager with config from aiAgents.js
      Create teammates/ai_helper with config from aiAgents.js
  → Create teammates/{userId} for human user
```

---

### Phase 7: Migration Script
**Goal**: Migrate existing projects to use teammates subcollection

- [ ] Create migration script `scripts/migrateTeammates.js`
- [ ] Test migration on sample project first
- [ ] Backup existing data before production migration
- [ ] Run migration on all existing projects
- [ ] Verify data integrity after migration

**Migration Steps**:
```
1. Get all projects from userProjects collection
2. For each project:
   a. Read team[] array
   b. For each team member:
      - Extract id, name, role, config
      - Create teammates/{id} document
      - Copy wordContributions to stats.wordsContributed
      - Initialize state (assignedTasks: [], currentTask: null)
      - Initialize stats (tasksAssigned: 0, tasksCompleted: 0, etc.)
   c. Verify teammates subcollection created
   d. Keep team[] array for backward compatibility
3. Log migration results
4. Verify no data loss
```

**Safety Measures**:
- Dry-run mode to preview changes
- Backup before migration
- Rollback capability
- Validation checks after migration

---

### Phase 8: Frontend Updates
**Goal**: Update UI to use teammates data

**Chat Component** (`haira-client/src/pages/Chat.jsx`):
- [ ] Fetch teammates along with messages
- [ ] Display teammate avatar, status, role
- [ ] Show "online/offline" indicators
- [ ] Add real-time listener for teammates updates

**Kanban Component** (`haira-client/src/components/KanbanBoard.jsx`):
- [ ] Fetch teammates along with tasks
- [ ] Display assignee avatar on task cards
- [ ] Show assignee workload (number of assigned tasks)
- [ ] Add real-time listener for teammates updates

**Submission Component** (if exists):
- [ ] Fetch teammates for contributor stats
- [ ] Display tasks completed, words contributed, messages sent per teammate
- [ ] Remove dependency on team array

**Real-time Sync**:
- [ ] Add Firestore listeners for teammates subcollection
- [ ] Handle optimistic UI updates
- [ ] Implement rollback on error

---

### Phase 9: Testing & Validation
**Goal**: Ensure data consistency and sync behavior

**Unit Tests**:
- [ ] `teammateService.initializeTeammates()` creates correct documents
- [ ] `teammateService.updateTeammateStats()` increments fields correctly
- [ ] `teammateService.migrateTeamToTeammates()` preserves all data

**Integration Tests**:
- [ ] Chat: Send message → teammate `messagesSent` increments
- [ ] Kanban: Assign task → teammate `assignedTasks` updates
- [ ] Kanban: Complete task → teammate `tasksCompleted` increments
- [ ] Submission: Word count → teammate `wordsContributed` updates
- [ ] All routes fetch same teammate data (no stale data)

**Data Consistency Checks**:
- [ ] All tasks reference valid teammates (no orphaned assignedTo)
- [ ] All chat messages reference valid teammates (no orphaned senderId)
- [ ] All teammates have accurate stats
- [ ] `wordContributions` matches `stats.wordsContributed`

**`/classroom` Command Tests**:
- [ ] Can coordinate 3 AI agents using teammate data
- [ ] Can validate teammate availability (activeDays, activeHours)
- [ ] Can track daily message quotas (e.g., Alex's 2 messages/day limit)
- [ ] Can check teammate status before triggering response

---

### Phase 10: Cleanup & Documentation
**Goal**: Document changes and clean up code

- [ ] Update API documentation with teammate endpoints
- [ ] Document `TEAMMATE_SCHEMA` structure
- [ ] Add code comments explaining sync points
- [ ] Update developer onboarding docs
- [ ] (Optional) Deprecate `team` array after confirming teammates works
- [ ] Remove unused code referencing old team array structure

**Documentation Needed**:
- Schema reference for `TEAMMATE_SCHEMA`
- Sync behavior between routes
- How to add new teammate fields
- Migration rollback procedure
- Troubleshooting guide for sync issues

---

## 🎯 Success Criteria

### Data Sync
- ✅ When task assigned → teammate's `assignedTasks` array updates
- ✅ When task completed → teammate's `tasksCompleted` increments
- ✅ When message sent → teammate's `messagesSent` increments
- ✅ When word count changes → teammate's `wordsContributed` updates
- ✅ All routes see same teammate data in real-time

### Query Performance
- ✅ Can fetch all teammates for a project in single query
- ✅ Can fetch single teammate stats without loading entire team array
- ✅ Can query "all tasks assigned to Alex" efficiently
- ✅ No N+1 query problems

### Data Integrity
- ✅ All tasks reference valid teammates
- ✅ All chat messages reference valid teammates
- ✅ All teammates have accurate stats
- ✅ No orphaned data (tasks with invalid assignedTo)
- ✅ `team` array and `teammates` subcollection stay in sync (if keeping both)

### `/classroom` Command Support
- ✅ Can coordinate 3 AI agents using teammate data
- ✅ Can validate teammate availability before triggering responses
- ✅ Can track daily message quotas (e.g., Alex's 2 messages/day limit)
- ✅ Can enforce active hours/days based on teammate config
- ✅ Can check teammate current task before assigning new work

---

## 🚨 Risks & Mitigation

### Risk: Data Loss During Migration
**Impact**: High  
**Mitigation**: 
- Backup all projects before migration
- Test on sample data first
- Implement dry-run mode
- Add rollback capability

### Risk: Breaking Existing Features
**Impact**: High  
**Mitigation**: 
- Keep `team` array intact during transition
- Incremental rollout (migrate one route at a time)
- Feature flags for new vs old behavior

### Risk: Performance Degradation
**Impact**: Medium  
**Mitigation**: 
- Use Firestore batch writes for bulk updates
- Add indexes for common queries (assignedTo, senderId)
- Monitor query performance before/after

### Risk: Inconsistent State
**Impact**: Medium  
**Mitigation**: 
- Use Firestore transactions for critical updates
- Implement retry logic with exponential backoff
- Add data validation checks in API endpoints

### Risk: Frontend Breaking Changes
**Impact**: Medium  
**Mitigation**: 
- Update frontend in same PR as backend
- Test all UI components after migration
- Add error boundaries for graceful failure

---

## 📊 Estimated Timeline

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | Schema Definition | 0.5 days |
| Phase 2 | Service Layer | 1 day |
| Phase 3 | Chat Route Updates | 0.5 days |
| Phase 4 | Kanban Route Updates | 1 day |
| Phase 5 | Submission Route Updates | 0.5 days |
| Phase 6 | Project Creation | 0.5 days |
| Phase 7 | Migration Script | 1 day |
| Phase 8 | Frontend Updates | 1 day |
| Phase 9 | Testing & Validation | 1 day |
| Phase 10 | Cleanup & Documentation | 0.5 days |

**Total Estimated Time**: ~7 days

---

## 🔗 Dependencies

**Blocks**:
- `/classroom` command implementation (needs teammates subcollection)
- Real-time teammate status indicators in UI
- Task assignment validation
- AI agent response coordination

**Depends On**:
- Existing `team` array structure in Firestore
- AI_AGENTS config in `/config/aiAgents.js`
- Chat/Kanban/Submission route implementations

---

## ✅ Definition of Done

- [ ] All existing projects migrated to teammates subcollection
- [ ] Chat route reading from & writing to teammates
- [ ] Kanban route reading from & writing to teammates
- [ ] Submission route reading from teammates
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Data consistency verified across all routes
- [ ] No orphaned references (invalid assignedTo, senderId)
- [ ] Documentation updated
- [ ] `/classroom` command can coordinate teammates successfully
- [ ] Frontend displays teammate data correctly
- [ ] Real-time sync working across all routes

---

## 📝 Notes

**Backward Compatibility**:
- Keep `team` array in project documents during transition
- Optionally sync `team` array with teammates subcollection
- After confirming teammates works, can deprecate team array

**Data Model Decision**:
- Use subcollection instead of array for better querying
- Store both config (static) and state (dynamic) in same document
- Link to wordContributions for report-specific stats

**AI Agent Config**:
- Keep full prompts in `/config/aiAgents.js` (static)
- Copy essential config to teammates subcollection (for runtime)
- Don't duplicate large prompts in Firestore

---

## 🚀 Getting Started

1. Review this document with team
2. Confirm schema design (Phase 1)
3. Create service layer (Phase 2)
4. Pick one route to update first (recommend Chat - Phase 3)
5. Test thoroughly before migrating other routes
6. Run migration script on test project
7. Verify data integrity
8. Roll out to production

---

## 📞 Questions or Issues?

If you encounter problems during migration:
1. Check data consistency with validation queries
2. Review Firestore transaction logs
3. Test sync behavior with sample data
4. Document any edge cases discovered
5. Update this document with learnings