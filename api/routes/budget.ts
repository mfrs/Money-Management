import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware.js';

const router = Router();

// INCOME SOURCES
router.get('/income-sources', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sources = await prisma.incomeSource.findMany({ where: { userId: req.userId! } });
    res.json(sources);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch income sources' });
  }
});

router.post('/income-sources', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const source = await prisma.incomeSource.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(source);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create income source' });
  }
});

router.put('/income-sources/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const source = await prisma.incomeSource.update({ where: { id: req.params.id, userId: req.userId! }, data: req.body });
    res.json(source);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update income source' });
  }
});

router.delete('/income-sources/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.incomeSource.delete({ where: { id: req.params.id, userId: req.userId! } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete income source' });
  }
});

// FIXED EXPENSES
router.get('/fixed-expenses', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const expenses = await prisma.fixedExpense.findMany({ where: { userId: req.userId! } });
    res.json(expenses);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch fixed expenses' });
  }
});

router.post('/fixed-expenses', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const expense = await prisma.fixedExpense.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(expense);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create fixed expense' });
  }
});

router.put('/fixed-expenses/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const expense = await prisma.fixedExpense.update({ where: { id: req.params.id, userId: req.userId! }, data: req.body });
    res.json(expense);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update fixed expense' });
  }
});

router.delete('/fixed-expenses/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.fixedExpense.delete({ where: { id: req.params.id, userId: req.userId! } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete fixed expense' });
  }
});

// WALLET ALLOCATIONS
router.get('/wallet-allocations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const allocations = await prisma.walletAllocation.findMany({ where: { userId: req.userId! }, include: { wallet: true } });
    res.json(allocations);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch wallet allocations' });
  }
});

router.post('/wallet-allocations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const allocation = await prisma.walletAllocation.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(allocation);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create wallet allocation' });
  }
});

router.put('/wallet-allocations/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const allocation = await prisma.walletAllocation.update({ where: { id: req.params.id, userId: req.userId! }, data: req.body });
    res.json(allocation);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update wallet allocation' });
  }
});

router.delete('/wallet-allocations/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.walletAllocation.delete({ where: { id: req.params.id, userId: req.userId! } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete wallet allocation' });
  }
});

export default router;
