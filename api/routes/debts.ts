import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware.js';

const router = Router();

// GET all debts
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const debts = await prisma.debt.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' }
    });
    res.json(debts);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch debts/receivables' });
  }
});

// POST create a new debt or receivable
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, type, contact, amount, dueDate, interestRate, notes, walletId } = req.body;

    if (!title || !type || !contact || amount === undefined) {
      return res.status(400).json({ error: 'Missing required debt/receivable fields' });
    }

    const parsedAmount = parseFloat(amount);

    // Prepare operations for transactional creation
    const dbOperations: any[] = [];

    // 1. Create the Debt record
    const debtPromise = prisma.debt.create({
      data: {
        title,
        type, // DEBT or RECEIVABLE
        contact,
        amount: parsedAmount,
        remainingAmount: parsedAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        interestRate: interestRate !== undefined ? parseFloat(interestRate) : 0,
        notes: notes || '',
        status: 'ACTIVE',
        walletId: walletId || null,
        userId: req.userId!
      }
    });

    dbOperations.push(debtPromise);

    // 2. If walletId is provided, auto-create transaction journal and update wallet balance
    if (walletId && parsedAmount > 0) {
      const journalLines: any[] = [];
      const description = type === 'DEBT' 
        ? `[Hutang] Pinjaman baru dari ${contact} (${title})`
        : `[Piutang] Memberikan pinjaman ke ${contact} (${title})`;

      if (type === 'DEBT') {
        // Borrowing: debit wallet (increase), credit loan liability (null category)
        journalLines.push({ walletId, amount: parsedAmount, type: 'DEBIT' });
        journalLines.push({ categoryId: null, amount: parsedAmount, type: 'CREDIT' });
      } else {
        // Lending: credit wallet (decrease), debit lending asset (null category)
        journalLines.push({ walletId, amount: parsedAmount, type: 'CREDIT' });
        journalLines.push({ categoryId: null, amount: parsedAmount, type: 'DEBIT' });
      }

      const journalPromise = prisma.journal.create({
        data: {
          description,
          date: new Date(),
          note: `Auto-generated from debt/receivable initialization: ${title}`,
          userId: req.userId!,
          lines: { create: journalLines }
        }
      });
      dbOperations.push(journalPromise);

      const walletUpdatePromise = prisma.wallet.update({
        where: { id: walletId, userId: req.userId! },
        data: { balance: { [type === 'DEBT' ? 'increment' : 'decrement']: parsedAmount } }
      });
      dbOperations.push(walletUpdatePromise);
    }

    const results = await prisma.$transaction(dbOperations);
    // Return the created debt record (which is the first element)
    res.status(201).json(results[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create debt/receivable' });
  }
});

// POST register a repayment or collection instalment
router.post('/:id/payments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { walletId, amount, note, date } = req.body;

    if (!walletId || amount === undefined) {
      return res.status(400).json({ error: 'walletId and amount are required' });
    }

    const payAmount = parseFloat(amount);
    if (payAmount <= 0) {
      return res.status(400).json({ error: 'Repayment amount must be positive' });
    }

    // Retrieve active debt
    const debt = await prisma.debt.findFirst({
      where: { id, userId: req.userId! }
    });

    if (!debt) {
      return res.status(404).json({ error: 'Debt/Receivable record not found' });
    }

    if (debt.status === 'PAID') {
      return res.status(400).json({ error: 'This record is already fully paid' });
    }

    const newRemaining = Math.max(0, debt.remainingAmount - payAmount);
    const newStatus = newRemaining === 0 ? 'PAID' : 'ACTIVE';

    const journalLines: any[] = [];
    const description = debt.type === 'DEBT'
      ? `[Bayar Hutang] Angsuran cicilan ke ${debt.contact} (${debt.title})`
      : `[Terima Piutang] Penagihan angsuran dari ${debt.contact} (${debt.title})`;

    if (debt.type === 'DEBT') {
      // Repaying our debt: decrease wallet (CREDIT), debit loan (decrease liability, null category)
      journalLines.push({ walletId, amount: payAmount, type: 'CREDIT' });
      journalLines.push({ categoryId: null, amount: payAmount, type: 'DEBIT' });
    } else {
      // Collecting receivable: increase wallet (DEBIT), credit lending (decrease asset, null category)
      journalLines.push({ walletId, amount: payAmount, type: 'DEBIT' });
      journalLines.push({ categoryId: null, amount: payAmount, type: 'CREDIT' });
    }

    const [updatedDebt] = await prisma.$transaction([
      // 1. Update remaining balance & status
      prisma.debt.update({
        where: { id },
        data: { remainingAmount: newRemaining, status: newStatus }
      }),
      // 2. Post double-entry journal record
      prisma.journal.create({
        data: {
          description,
          date: date ? new Date(date) : new Date(),
          note: note || `Instalment payment for debt: ${debt.title}`,
          userId: req.userId!,
          lines: { create: journalLines }
        }
      }),
      // 3. Update wallet balance
      prisma.wallet.update({
        where: { id: walletId, userId: req.userId! },
        data: { balance: { [debt.type === 'DEBT' ? 'decrement' : 'increment']: payAmount } }
      })
    ]);

    res.json(updatedDebt);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// PUT update debt details
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, contact, dueDate, interestRate, notes } = req.body;
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (contact !== undefined) updateData.contact = contact;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (interestRate !== undefined) updateData.interestRate = parseFloat(interestRate);
    if (notes !== undefined) updateData.notes = notes;

    const debt = await prisma.debt.update({
      where: { id: req.params.id, userId: req.userId! },
      data: updateData
    });
    res.json(debt);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update details' });
  }
});

// DELETE a debt record
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.debt.delete({
      where: { id: req.params.id, userId: req.userId! }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

export default router;
