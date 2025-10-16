import express from 'express';

const router = express.Router();

// Define the route for the root of this router ('/login cuz now the route is  already/login')
router.get('/', (req, res) => {
  res.json({ message: "Hello from login backend!" });
});

// Export the router so we can use it in index.js
export default router;