import express from 'express';
const router = express.Router();

// Send back a JSON response when receving GET request 
router.get('/classroom', (req, res) => {
    res.json(
        {
            message: "Hi classroom! Hello from the backend."
        }
    )
});

export default router;