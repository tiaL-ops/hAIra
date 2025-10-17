import express from 'express';

const router = express.Router();


router.get('/', (req, res) => {
  res.json({ message: "hello from profile backend" });
});

export default router;