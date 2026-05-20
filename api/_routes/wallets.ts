import { Router, Response } from 'express';
import { prisma } from '../_db.js';
import { authMiddleware, AuthRequest } from '../_middleware.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'asc' }
    });
    res.json(wallets);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const wallet = await prisma.wallet.create({
      data: { ...req.body, userId: req.userId! }
    });
    res.status(201).json(wallet);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const wallet = await prisma.wallet.update({
      where: { id: req.params.id, userId: req.userId! },
      data: req.body
    });
    res.json(wallet);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update wallet' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.wallet.delete({
      where: { id: req.params.id, userId: req.userId! }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete wallet' });
  }
});

export default router;
