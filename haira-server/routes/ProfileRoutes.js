import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { getDocumentById, setDocument, updateDocument } from '../services/databaseService.js';
import { COLLECTIONS } from '../schema/database.js';
import User from '../models/UserModels.js';

const router = express.Router();

// Get user profile
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const userDoc = await getDocumentById(COLLECTIONS.USERS, userId);
    
    if (!userDoc) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc;
    
    // Get active project details if it exists
    let activeProject = null;
    if (userData.activeProjectId) {
      const projectDoc = await getDocumentById(COLLECTIONS.USER_PROJECTS, userData.activeProjectId);
      
      if (projectDoc) {
        activeProject = {
          id: userData.activeProjectId,
          title: projectDoc.title,
          status: projectDoc.status
        };
      }
    }
    
    res.json({
      success: true,
      user: {
        name: userData.name,
        email: userData.email,
        avatarUrl: userData.avatarUrl || null,
        summary: userData.summary || {
          xp: 0,
          level: 1,
          totalProjectsCompleted: 0,
          averageGrade: 0,
          achievements: []
        },
        preferences: userData.preferences || {
          language: 'en'
        },
        activeProject: activeProject
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user preferences
router.patch('/preferences', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { language } = req.body;
    
    if (language !== 'en' && language !== 'fr') {
      return res.status(400).json({ error: 'Invalid language preference' });
    }
    
    await updateDocument(COLLECTIONS.USERS, userId, {
      'preferences.language': language
    });
    
    res.json({
      success: true,
      preferences: { language }
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

// Update user avatar
router.patch('/avatar', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { avatarData } = req.body;
    
    if (!avatarData) {
      return res.status(400).json({ error: 'No avatar data provided' });
    }

    // Validate that it's a base64 image
    if (!avatarData.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    // Check size (2MB limit)
    const sizeInBytes = (avatarData.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    if (sizeInMB > 2) {
      return res.status(400).json({ error: 'Image size exceeds 2MB limit' });
    }
    
    await updateDocument(COLLECTIONS.USERS, userId, {
      avatarUrl: avatarData,
      updatedAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      avatarUrl: avatarData
    });
  } catch (error) {
    console.error('Error updating user avatar:', error);
    res.status(500).json({ error: 'Failed to update user avatar' });
  }
});

// Migrate existing users to new schema
router.post('/migrate-schema', verifyFirebaseToken, async (req, res) => {
  // Only allow admins to run this (you'd need to add admin verification)
  try {
    const usersRef = db.collection(COLLECTIONS.USERS);
    const snapshot = await usersRef.get();
    
    const updates = [];
    
    snapshot.forEach(doc => {
      const userData = doc.data();
      const userRef = usersRef.doc(doc.id);
      
      // Check if user has the new schema fields
      if (!userData.summary || !userData.preferences) {
        const updateData = {};
        
        if (!userData.summary) {
          updateData.summary = {
            xp: 0,
            level: 1,
            totalProjectsCompleted: 0,
            averageGrade: 0,
            achievements: []
          };
        }
        
        if (!userData.preferences) {
          updateData.preferences = {
            language: 'en'
          };
        }
        
        updates.push(userRef.update(updateData));
      }
    });
    
    await Promise.all(updates);
    
    res.json({
      success: true,
      migratedCount: updates.length
    });
  } catch (error) {
    console.error('Error migrating user schema:', error);
    res.status(500).json({ error: 'Failed to migrate user schema' });
  }
});

export default router;