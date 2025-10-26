import admin from 'firebase-admin';
import { AI_AGENTS } from '../config/aiAgents.js';
import { db as firebaseDb, firebaseAvailable } from './firebaseService.js';
import { querySubcollection, addSubdocument, updateDocument, getDocumentById } from './databaseService.js';

const db = firebaseDb;
const FieldValue = firebaseAvailable ? admin.firestore.FieldValue : null;

/**
 * Initialize teammates subcollection for a new project
 * Copies AI agent configs from aiAgents.js and creates human user teammate
 * 
 * @param {string} projectId - The project ID
 * @param {string} userId - The human user's ID
 * @param {string} userName - The human user's name
 * @returns {Promise<number>} Number of teammates created
 */
export async function initializeTeammates(projectId, userId, userName) {
  console.log(`🔄 Initializing teammates for project: ${projectId}`);
  
  const batch = db.batch();
  let count = 0;
  
  try {
    // Create AI agent teammates from aiAgents.js config
    for (const [agentId, agentConfig] of Object.entries(AI_AGENTS)) {
      const teammateRef = db.collection('userProjects')
        .doc(projectId)
        .collection('teammates')
        .doc(agentId);
      
      const teammateData = {
        id: agentId,
        name: agentConfig.name,
        type: 'ai',
        role: agentConfig.role,
        avatar: `/src/images/${agentConfig.name}.png`, // Assuming naming convention
        color: agentConfig.color,
        
        // AI Configuration
        config: {
          maxTokens: agentConfig.maxTokens || 50,
          temperature: agentConfig.temperature || 0.7,
          emoji: agentConfig.emoji || '🤖',
          personality: agentConfig.personality,
          prompt: agentConfig.systemPrompt,
          isActive: true,
          activeDays: agentConfig.activeDays || null,
          activeHours: agentConfig.activeHours || null,
          maxMessagesPerDay: agentConfig.maxMessagesPerDay || null,
          sleepResponses: agentConfig.sleepResponses || null
        },
        
        // Initial state
        state: {
          status: 'offline', // Will be set to 'online' when active
          currentTask: null,
          assignedTasks: [],
          lastActive: null,
          messagesLeftToday: agentConfig.maxMessagesPerDay || 999
        },
        
        // Initial stats
        stats: {
          tasksAssigned: 0,
          tasksCompleted: 0,
          messagesSent: 0,
          wordsContributed: 0
        },
        
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      batch.set(teammateRef, teammateData);
      count++;
    }
    
    // Create human user teammate
    const userTeammateRef = db.collection('userProjects')
      .doc(projectId)
      .collection('teammates')
      .doc(userId);
    
    const userTeammateData = {
      id: userId,
      name: userName,
      type: 'human',
      role: 'owner',
      avatar: null, // Can be set later from user profile
      color: '#f39c12', // Default color for human
      
      config: null, // No AI config for humans
      
      // Initial state
      state: {
        status: 'online',
        currentTask: null,
        assignedTasks: [],
        lastActive: Date.now(),
        messagesLeftToday: 999 // No limit for humans
      },
      
      // Initial stats
      stats: {
        tasksAssigned: 0,
        tasksCompleted: 0,
        messagesSent: 0,
        wordsContributed: 0
      },
      
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    batch.set(userTeammateRef, userTeammateData);
    count++;
    
    // Commit the batch
    await batch.commit();
    
    console.log(`✅ Initialized ${count} teammates (${count - 1} AI agents + 1 human)`);
    return count;
    
  } catch (error) {
    console.error(`❌ Error initializing teammates for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Migrate existing team array to teammates subcollection
 * Preserves existing team array for backward compatibility
 * 
 * @param {string} projectId - The project ID to migrate
 * @returns {Promise<Object>} Migration result with counts
 */
export async function migrateTeamToTeammates(projectId) {
  console.log(`🔄 Migrating team array to teammates subcollection for project: ${projectId}`);
  
  try {
    // 1. Fetch project document
    const projectDoc = await db.collection('userProjects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const projectData = projectDoc.data();
    
    // Check if team array exists
    if (!projectData.team || projectData.team.length === 0) {
      console.log('⚠️  No team array found, skipping migration');
      return { migrated: 0, skipped: true };
    }
    
    // Check if teammates already exist
    const existingTeammates = await db.collection('userProjects')
      .doc(projectId)
      .collection('teammates')
      .limit(1)
      .get();
    
    if (!existingTeammates.empty) {
      console.log('⚠️  Teammates subcollection already exists, skipping migration');
      return { migrated: 0, skipped: true, reason: 'already_migrated' };
    }
    
    // 2. Create teammates from team array
    const batch = db.batch();
    const migratedCount = { ai: 0, human: 0 };
    
    for (const member of projectData.team) {
      // Determine if this is an AI agent or human
      const isAI = member.config?.type === 'ai';
      const teammateId = isAI ? member.config.id : member.id;
      const type = isAI ? 'ai' : 'human';
      
      if (!teammateId) {
        console.warn('⚠️  Skipping team member with no ID:', member);
        continue;
      }
      
      // Build teammate document
      const teammateData = {
        id: teammateId,
        name: isAI ? member.config.name : member.name,
        type,
        role: isAI ? member.config.role : member.role,
        avatar: member.avatar || null,
        color: member.color || null,
        
        // Config (AI only)
        config: isAI ? {
          maxTokens: member.config.maxTokens || 50,
          temperature: member.config.temperature || 0.7,
          emoji: member.config.emoji || '🤖',
          personality: member.config.personality || '',
          prompt: member.config.prompt || '',
          isActive: member.config.isActive !== false,
          activeDays: member.config.activeDays || null,
          activeHours: member.config.activeHours || null,
          maxMessagesPerDay: member.config.maxMessagesPerDay || null,
          sleepResponses: member.config.sleepResponses || null
        } : null,
        
        // Initialize state
        state: {
          status: isAI ? (member.config?.isActive ? 'online' : 'offline') : 'online',
          currentTask: null,
          assignedTasks: [],
          lastActive: Date.now(),
          messagesLeftToday: isAI ? (member.config?.maxMessagesPerDay || 999) : 999
        },
        
        // Initialize stats (merge with existing wordContributions if available)
        stats: {
          tasksAssigned: 0,
          tasksCompleted: 0,
          messagesSent: 0,
          wordsContributed: projectData.wordContributions?.[teammateId]?.words || 0
        },
        
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Add to batch
      const teammateRef = db.collection('userProjects')
        .doc(projectId)
        .collection('teammates')
        .doc(teammateId);
      
      batch.set(teammateRef, teammateData);
      migratedCount[type]++;
    }
    
    // 3. Commit batch
    await batch.commit();
    
    const totalMigrated = migratedCount.ai + migratedCount.human;
    console.log(`✅ Migrated ${totalMigrated} teammates (${migratedCount.ai} AI agents, ${migratedCount.human} human(s))`);
    console.log(`   Team array preserved at userProjects/${projectId}/team`);
    
    return {
      migrated: totalMigrated,
      ai: migratedCount.ai,
      human: migratedCount.human,
      skipped: false
    };
    
  } catch (error) {
    console.error(`❌ Error migrating project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Get a single teammate by ID
 * 
 * @param {string} projectId - The project ID
 * @param {string} teammateId - The teammate ID
 * @returns {Promise<Object|null>} Teammate data or null if not found
 */
export async function getTeammate(projectId, teammateId) {
  try {
    const teammates = await querySubcollection('userProjects', projectId, 'teammates');
    const teammate = teammates.find(t => t.id === teammateId);
    return teammate || null;
  } catch (error) {
    console.error(`Error fetching teammate ${teammateId} from project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Get all teammates for a project
 * 
 * @param {string} projectId - The project ID
 * @returns {Promise<Array>} Array of teammate objects
 */
export async function getTeammates(projectId) {
  try {
    const teammates = await querySubcollection('userProjects', projectId, 'teammates');
    return teammates || [];
  } catch (error) {
    console.error(`Error fetching teammates for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Update teammate stats and state
 * Supports dot notation for nested updates (e.g., 'stats.messagesSent', 'state.status')
 * 
 * @param {string} projectId - The project ID
 * @param {string} teammateId - The teammate ID
 * @param {Object} updates - Object with fields to update
 * @returns {Promise<void>}
 */
export async function updateTeammateStats(projectId, teammateId, updates) {
  try {
    // Process FieldValue objects for localStorage mode
    const processedUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value && typeof value === 'object' && value._increment !== undefined) {
        // Handle increment operations
        const currentDoc = await getDocumentById('userProjects', projectId);
        const teammates = currentDoc?.teammates || {};
        const teammate = teammates[teammateId] || {};
        const currentValue = key.split('.').reduce((obj, k) => obj?.[k], teammate) || 0;
        processedUpdates[key] = currentValue + value._increment;
      } else if (value && typeof value === 'object' && value._serverTimestamp !== undefined) {
        // Handle server timestamp
        processedUpdates[key] = value._value || Date.now();
      } else {
        processedUpdates[key] = value;
      }
    }
    
    // Add updatedAt timestamp
    const updateData = {
      ...processedUpdates,
      updatedAt: Date.now()
    };
    
    // Update the teammate document
    const teammateDoc = await getDocumentById('userProjects', projectId);
    if (teammateDoc && teammateDoc.teammates && teammateDoc.teammates[teammateId]) {
      // Update the specific fields in the teammate object
      const updatedTeammate = { ...teammateDoc.teammates[teammateId] };
      for (const [key, value] of Object.entries(updateData)) {
        const keys = key.split('.');
        let current = updatedTeammate;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
      }
      
      // Save the updated teammate
      await updateDocument('userProjects', projectId, {
        [`teammates.${teammateId}`]: updatedTeammate
      });
    }
    
  } catch (error) {
    console.error(`Error updating teammate ${teammateId} in project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Sync team array from teammates subcollection
 * Optional: Keeps the team array in sync with teammates subcollection for backward compatibility
 * 
 * @param {string} projectId - The project ID
 * @returns {Promise<void>}
 */
export async function syncTeamArrayFromTeammates(projectId) {
  try {
    console.log(`🔄 Syncing team array from teammates subcollection for project: ${projectId}`);
    
    // Fetch all teammates
    const teammatesSnapshot = await db.collection('userProjects')
      .doc(projectId)
      .collection('teammates')
      .get();
    
    if (teammatesSnapshot.empty) {
      console.log('⚠️  No teammates found in subcollection');
      return;
    }
    
    // Build team array
    const team = [];
    
    for (const doc of teammatesSnapshot.docs) {
      const data = doc.data();
      
      if (data.type === 'ai') {
        // AI agent format
        team.push({
          avatar: data.avatar,
          color: data.color,
          config: {
            ...data.config,
            id: data.id,
            name: data.name,
            role: data.role,
            type: data.type
          }
        });
      } else {
        // Human user format
        team.push({
          id: data.id,
          name: data.name,
          role: data.role
        });
      }
    }
    
    // Update project's team array
    await db.collection('userProjects')
      .doc(projectId)
      .update({
        team,
        teamUpdatedAt: Date.now()
      });
    
    console.log(`✅ Synced team array with ${team.length} members`);
    
  } catch (error) {
    console.error(`Error syncing team array for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Validate that a teammate exists
 * 
 * @param {string} projectId - The project ID
 * @param {string} teammateId - The teammate ID to validate
 * @returns {Promise<boolean>} True if teammate exists
 */
export async function validateTeammate(projectId, teammateId) {
  try {
    const doc = await db.collection('userProjects')
      .doc(projectId)
      .collection('teammates')
      .doc(teammateId)
      .get();
    
    return doc.exists;
  } catch (error) {
    console.error(`Error validating teammate ${teammateId} in project ${projectId}:`, error);
    return false;
  }
}

/**
 * Sync task assignment to teammate
 * Updates assignedTasks array and increments stats
 * 
 * @param {string} projectId - The project ID
 * @param {string} teammateId - The teammate ID
 * @param {string} taskId - The task ID to assign
 * @returns {Promise<void>}
 */
export async function syncTaskAssignment(projectId, teammateId, taskId) {
  try {
    await db.collection('userProjects')
      .doc(projectId)
      .collection('teammates')
      .doc(teammateId)
      .update({
        'state.assignedTasks': FieldValue.arrayUnion(taskId),
        'state.currentTask': taskId,
        'stats.tasksAssigned': FieldValue.increment(1),
        updatedAt: Date.now()
      });
  } catch (error) {
    console.error(`Error syncing task assignment for teammate ${teammateId}:`, error);
    throw error;
  }
}

/**
 * Sync task completion to teammate
 * Removes from assignedTasks and increments completed count
 * 
 * @param {string} projectId - The project ID
 * @param {string} teammateId - The teammate ID
 * @param {string} taskId - The task ID that was completed
 * @returns {Promise<void>}
 */
export async function syncTaskCompletion(projectId, teammateId, taskId) {
  try {
    await db.collection('userProjects')
      .doc(projectId)
      .collection('teammates')
      .doc(teammateId)
      .update({
        'state.assignedTasks': FieldValue.arrayRemove(taskId),
        'stats.tasksCompleted': FieldValue.increment(1),
        'state.currentTask': null,
        updatedAt: Date.now()
      });
  } catch (error) {
    console.error(`Error syncing task completion for teammate ${teammateId}:`, error);
    throw error;
  }
}

/**
 * Sync chat message sent by teammate
 * Increments message count and updates last active timestamp
 * 
 * @param {string} projectId - The project ID
 * @param {string} teammateId - The teammate ID who sent the message
 * @returns {Promise<void>}
 */
export async function syncMessageSent(projectId, teammateId) {
  try {
    await db.collection('userProjects')
      .doc(projectId)
      .collection('teammates')
      .doc(teammateId)
      .update({
        'stats.messagesSent': FieldValue.increment(1),
        'state.lastActive': Date.now(),
        'state.status': 'online',
        updatedAt: Date.now()
      });
  } catch (error) {
    console.error(`Error syncing message sent for teammate ${teammateId}:`, error);
    throw error;
  }
}

/**
 * Reset daily message quotas for all AI agents
 * Should be called at midnight UTC
 * 
 * @param {string} projectId - The project ID
 * @returns {Promise<void>}
 */
export async function resetDailyMessageQuotas(projectId) {
  try {
    const teammates = await getTeammates(projectId);
    const batch = db.batch();
    
    for (const teammate of teammates) {
      if (teammate.type === 'ai' && teammate.config?.maxMessagesPerDay) {
        const teammateRef = db.collection('userProjects')
          .doc(projectId)
          .collection('teammates')
          .doc(teammate.id);
        
        batch.update(teammateRef, {
          'state.messagesLeftToday': teammate.config.maxMessagesPerDay,
          updatedAt: Date.now()
        });
      }
    }
    
    await batch.commit();
    console.log(`✅ Reset daily message quotas for project ${projectId}`);
    
  } catch (error) {
    console.error(`Error resetting daily quotas for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Check if a teammate is available to respond
 * Validates active days, active hours, message quota, and active status
 * 
 * @param {string} projectId - The project ID
 * @param {string} teammateId - The teammate ID to check
 * @returns {Promise<Object>} Availability info
 */
export async function isTeammateAvailable(projectId, teammateId) {
  try {
    // Fetch teammate
    const teammate = await getTeammate(projectId, teammateId);
    
    if (!teammate) {
      return {
        available: false,
        reason: 'not_found',
        message: 'Teammate not found'
      };
    }
    
    // Humans are always available
    if (teammate.type === 'human') {
      return { available: true };
    }
    
    // AI agents are always available - no hour or day restrictions
    // Only check if agent is active (not disabled)
    if (!teammate.config?.isActive) {
      return {
        available: false,
        reason: 'disabled',
        message: `${teammate.name} is currently disabled.`
      };
    }
    
    // All AI agents are available 24/7
    return {
      available: true,
      messagesLeftToday: teammate.state.messagesLeftToday || 999
    };
    
  } catch (error) {
    console.error(`Error checking availability for teammate ${teammateId}:`, error);
    return {
      available: false,
      reason: 'error',
      message: 'Error checking availability'
    };
  }
}

/**
 * Extract @mentions from message content
 * 
 * @param {string} messageContent - The message text
 * @returns {Array<string>} Array of mentioned teammate IDs
 */
export function extractMentions(messageContent) {
  if (!messageContent || typeof messageContent !== 'string') {
    return [];
  }
  
  // Match @username pattern (word characters after @)
  const mentionRegex = /@(\w+)/g;
  const matches = messageContent.matchAll(mentionRegex);
  
  // Extract unique mentions (lowercase)
  const mentions = [...matches].map(match => match[1].toLowerCase());
  return [...new Set(mentions)]; // Remove duplicates
}

/**
 * Get a sleep/offline response for an unavailable teammate
 * 
 * @param {Object} teammate - The teammate object
 * @param {Object} availabilityCheck - The availability check result
 * @returns {string} Sleep response message
 */
export function getSleepResponse(teammate, availabilityCheck) {
  // Get random sleep response if available
  let baseResponse = '';
  if (teammate.config?.sleepResponses && teammate.config.sleepResponses.length > 0) {
    const randomIndex = Math.floor(Math.random() * teammate.config.sleepResponses.length);
    baseResponse = teammate.config.sleepResponses[randomIndex];
  } else {
    baseResponse = `💤 ${teammate.name} is not available right now.`;
  }
  
  // Add availability details based on reason
  let details = '';
  
  switch (availabilityCheck.reason) {
    case 'wrong_day':
      if (availabilityCheck.activeDays) {
        details = ` I'm available on days ${availabilityCheck.activeDays.join(', ')}.`;
      }
      break;
      
    case 'outside_hours':
      if (availabilityCheck.activeHours) {
        details = ` I'm available from ${availabilityCheck.activeHours.start}:00 - ${availabilityCheck.activeHours.end}:00 UTC.`;
      }
      break;
      
    case 'quota_exhausted':
      if (availabilityCheck.maxMessagesPerDay) {
        details = ` I've reached my daily message limit (${availabilityCheck.maxMessagesPerDay} messages/day).`;
      }
      break;
      
    case 'disabled':
      details = ' I am currently disabled.';
      break;
      
    default:
      details = '';
  }
  
  return `${baseResponse}${details}`.trim();
}

export default {
  initializeTeammates,
  migrateTeamToTeammates,
  getTeammate,
  getTeammates,
  updateTeammateStats,
  syncTeamArrayFromTeammates,
  validateTeammate,
  syncTaskAssignment,
  syncTaskCompletion,
  syncMessageSent,
  resetDailyMessageQuotas,
  isTeammateAvailable,
  extractMentions,
  getSleepResponse
};
