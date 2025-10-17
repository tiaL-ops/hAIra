import express from 'express';

const router = express.Router();


// Root route
router.get('/', (req, res) => {
  res.json({ message: "Hello from project backend!" });
});

// Project details route
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `Project ${id} details` });
});

// Export the router so we can use it in index.js
export default router;