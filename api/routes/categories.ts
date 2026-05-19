import { Router, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware, AuthRequest } from '../middleware';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'asc' }
    });
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const category = await prisma.category.create({
      data: { ...req.body, userId: req.userId! }
    });
    res.status(201).json(category);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id, userId: req.userId! },
      data: req.body
    });
    res.json(category);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.category.delete({
      where: { id: req.params.id, userId: req.userId! }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
