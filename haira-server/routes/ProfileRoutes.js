import express from 'express';

const router = express.Router();


router.get('/profile', (req, res) => {
  res.json({ message: "hello from profile backend" });
});

export default router;