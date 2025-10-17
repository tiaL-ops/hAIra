import express from 'express'
const router = express.Router()

router.get('/:id/submission', (req, res) => {
    const { id }= req.params; // get parameters from request
    res.json({ message: `Hi from Submission ${id}` });
});

export default router;