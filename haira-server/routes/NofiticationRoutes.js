import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { getNotifications, pushNotification } from '../services/firebaseService.js';

const router = express.Router();

// Get project data with tasks
router.get('/notification', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const notifications = await getNotifications(userId);
        if (!notifications) {
            return res.status(404).json({ error: 'Notifications not found or access denied' });
        }

        res.json({
            success: true,
            notifications: notifications
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/notification', verifyFirebaseToken, async (req, res) => {
    const { type, message } = req.body;
    const userId = req.user.uid;

    try {
        const response = await pushNotification(userId, type, message);
        res.status(201).json({
            success: true,
            data: response,
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

export default router;
