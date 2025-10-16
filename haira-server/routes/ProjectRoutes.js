import express from 'express';

const router = express.Router();


// Root route
router.get('/', (req, res) => {
  res.json({ message: "Hello from project backend!" });
});

// Chat route for a specific project
router.get('/:id/chat', (req, res) => {
  const { id } = req.params;
  res.json({ message: `Hi from chat ${id}` });
});

// Export the router so we can use it in index.js
export default router;