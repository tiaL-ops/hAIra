import express from 'express';
const router = express.Router();

// Send back a JSON response when receiving GET request to the mount root
// Mounted at '/api/classroom' -> this route should be '/'
//changed it so it easy to focus on other endpoint 
router.get('/', (req, res) => {
    res.json({
        message: 'Hi classroom! Hello from the backend.'
    });
});

export default router;