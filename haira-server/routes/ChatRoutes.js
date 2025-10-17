import express from 'express';
const router = express.Router();

// Route: /api/project/:id/chat
router.get('/:id/chat', (req, res) => {
	const { id } = req.params;
	res.json({ message: `Hi from chat ${id}` });
});

export default router;
