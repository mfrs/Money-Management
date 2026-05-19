import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' }
    });
    res.json(goals);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, userId: req.userId! };
    if (data.deadline) data.deadline = new Date(data.deadline);
    const goal = await prisma.goal.create({ data });
    res.status(201).json(goal);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.deadline) data.deadline = new Date(data.deadline);
    const goal = await prisma.goal.update({
      where: { id: req.params.id, userId: req.userId! },
      data
    });
    res.json(goal);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.goal.delete({
      where: { id: req.params.id, userId: req.userId! }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

export default router;
