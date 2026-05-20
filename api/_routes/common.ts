import { Router, Response } from 'express';
import { prisma } from '../_db.js';
import { authMiddleware, AuthRequest } from '../_middleware.js';

const router = Router();

// RESET DATA
router.post('/reset', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.journal.deleteMany({ where: { userId: req.userId! } });
    await prisma.walletAllocation.deleteMany({ where: { userId: req.userId! } });
    await prisma.fixedExpense.deleteMany({ where: { userId: req.userId! } });
    await prisma.incomeSource.deleteMany({ where: { userId: req.userId! } });
    await prisma.wallet.deleteMany({ where: { userId: req.userId! } });
    await prisma.category.deleteMany({ where: { userId: req.userId! } });
    res.json({ success: true, message: 'All data cleared.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset data' });
  }
});

// HEALTH CHECK
router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

export default router;
