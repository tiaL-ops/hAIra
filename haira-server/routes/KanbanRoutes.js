import express from 'express';
const router = express.Router();

router.get('/:id/kanban', (req, res) => {
    const { id } = req.params;
    res.json({ message: `Hi from kanban ${id}` });
});

export default router;
