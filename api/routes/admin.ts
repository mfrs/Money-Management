import { Router, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware';

const router = Router();

router.get('/users', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: { wallets: true, journals: true, categories: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:id/data', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  try {
    const [wallets, journals, categories] = await Promise.all([
      prisma.wallet.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.journal.findMany({ 
        where: { userId }, 
        include: { lines: true },
        orderBy: { date: 'desc' }
      }),
      prisma.category.findMany({ where: { userId } })
    ]);
    res.json({ wallets, journals, categories });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

router.delete('/users/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  if (userId === req.userId) {
    return res.status(400).json({ error: 'Cannot delete your own admin account' });
  }
  
  try {
    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
