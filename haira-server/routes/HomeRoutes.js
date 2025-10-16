import express from 'express';

const router = express.Router();

// Define the route for the root of this router ('/')
router.get('/home', (req, res) => {
  res.json({ message: "Hello from home backend!" });
});

// Export the router so we can use it in index.js
export default router;