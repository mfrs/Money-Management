import { Router, Response } from 'express';
import { prisma } from '../_db.js';
import { authMiddleware, AuthRequest } from '../_middleware.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const journals = await prisma.journal.findMany({
      where: { userId: req.userId! },
      orderBy: { date: 'desc' },
      include: { lines: true },
    });
    res.json(journals);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch journals' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { description, amount, type, categoryId, walletId, toWalletId, date, note } = req.body;
    
    const lines: any[] = [];
    
    if (type === 'transfer') {
      if (!toWalletId) return res.status(400).json({ error: 'toWalletId is required for transfers' });
      lines.push({ walletId, amount, type: 'CREDIT' });
      lines.push({ walletId: toWalletId, amount, type: 'DEBIT' });
    } else if (type === 'expense') {
      lines.push({ walletId, amount, type: 'CREDIT' });
      lines.push({ categoryId, amount, type: 'DEBIT' });
    } else if (type === 'income') {
      lines.push({ walletId, amount, type: 'DEBIT' });
      lines.push({ categoryId, amount, type: 'CREDIT' });
    }

    const [journal] = await prisma.$transaction([
      prisma.journal.create({
        data: {
          description, date: new Date(date), note: note || '', userId: req.userId!,
          lines: { create: lines }
        },
        include: { lines: true }
      }),
      ...lines.filter(l => l.walletId).map(l => 
        prisma.wallet.update({
          where: { id: l.walletId, userId: req.userId! },
          data: { balance: { [l.type === 'DEBIT' ? 'increment' : 'decrement']: amount } }
        })
      )
    ]);
    
    res.status(201).json(journal);
  } catch (err: any) {
    console.error('Failed to post journal entry:', err);
    res.status(500).json({ error: err.message || 'Failed to post transaction' });
  }
});

router.post('/bulk', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const transactions = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Valid array of transactions required' });
    }

    const prismaOperations: any[] = [];

    for (const tx of transactions) {
      const { description, amount, type, categoryId, walletId, toWalletId, date, note } = tx;
      const lines: any[] = [];
      if (type === 'transfer') {
        lines.push({ walletId, amount, type: 'CREDIT' });
        lines.push({ walletId: toWalletId, amount, type: 'DEBIT' });
      } else if (type === 'expense') {
        lines.push({ walletId, amount, type: 'CREDIT' });
        lines.push({ categoryId, amount, type: 'DEBIT' });
      } else if (type === 'income') {
        lines.push({ walletId, amount, type: 'DEBIT' });
        lines.push({ categoryId, amount, type: 'CREDIT' });
      }

      prismaOperations.push(
        prisma.journal.create({
          data: {
            description, date: new Date(date), note: note || '', userId: req.userId!,
            lines: { create: lines }
          },
          include: { lines: true }
        })
      );
      
      const walletUpdates = lines.filter((l: any) => l.walletId).map((l: any) => 
        prisma.wallet.update({
          where: { id: l.walletId, userId: req.userId! },
          data: { balance: { [l.type === 'DEBIT' ? 'increment' : 'decrement']: amount } }
        })
      );
      prismaOperations.push(...walletUpdates);
    }

    await prisma.$transaction(prismaOperations);
    res.status(201).json({ success: true, count: transactions.length });
  } catch (err: any) {
    console.error('Failed to bulk post journal entries:', err);
    res.status(500).json({ error: err.message || 'Failed to post bulk transactions' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const journal = await prisma.journal.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { lines: true }
    });
    if (!journal) return res.status(404).json({ error: 'Not found' });
    if (journal.isReversed) return res.status(400).json({ error: 'Journal is already reversed' });

    // Update original journal to mark as reversed
    const markReversed = prisma.journal.update({
      where: { id: req.params.id },
      data: { isReversed: true }
    });

    // Create reversing journal
    const reversingLines = journal.lines.map(l => ({
      amount: l.amount,
      type: l.type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      walletId: l.walletId,
      categoryId: l.categoryId
    }));

    const reversingJournal = prisma.journal.create({
      data: {
        userId: req.userId!,
        date: new Date(),
        description: `[REVERSAL] ${journal.description}`,
        note: `Reversing entry for JRN-${journal.id.substring(journal.id.length - 6).toUpperCase()}`,
        lines: { create: reversingLines }
      }
    });

    // Reverse wallet balances
    const walletUpdates = journal.lines.filter(l => l.walletId).map(l => 
      prisma.wallet.update({
        where: { id: l.walletId! },
        data: { balance: { [l.type === 'DEBIT' ? 'decrement' : 'increment']: l.amount } }
      })
    );

    await prisma.$transaction([markReversed, reversingJournal, ...walletUpdates]);

    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to reverse journal:', err);
    res.status(500).json({ error: err.message || 'Failed to reverse transaction' });
  }
});

export default router;
