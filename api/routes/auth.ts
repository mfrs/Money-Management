import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest, JWT_SECRET } from '../middleware.js';

const router = Router();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    // Create default categories for new user
    const defaultCategories = [
      { name: 'Makan', type: 'expense', icon: 'Utensils', color: '#EF4444', budgetLimit: 3000000 },
      { name: 'Transport', type: 'expense', icon: 'Car', color: '#F59E0B', budgetLimit: 2000000 },
      { name: 'Entertainment', type: 'expense', icon: 'Clapperboard', color: '#4EDEA3', budgetLimit: 1500000 },
      { name: 'Groceries', type: 'expense', icon: 'ShoppingBag', color: '#8B5CF6', budgetLimit: 2500000 },
      { name: 'Utilities', type: 'expense', icon: 'Bolt', color: '#06B6D4', budgetLimit: 1000000 },
      { name: 'Salary', type: 'income', icon: 'Banknote', color: '#22C55E', budgetLimit: 0 },
      { name: 'Freelance', type: 'income', icon: 'Laptop', color: '#14B8A6', budgetLimit: 0 },
    ];
    await prisma.category.createMany({
      data: defaultCategories.map(c => ({ ...c, userId: user.id })),
    });

    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, currency: user.currency, theme: user.theme },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, currency: user.currency, theme: user.theme },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, name: true, email: true, isAdmin: true, currency: true, theme: true, createdAt: true }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, currency, theme } = req.body;
    const data: any = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (currency) data.currency = currency;
    if (theme) data.theme = theme;

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data,
      select: { id: true, name: true, email: true, isAdmin: true, currency: true, theme: true },
    });
    res.json(user);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message || 'Update failed' });
  }
});

router.put('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.userId! }, data: { password: hashed } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Password change failed' });
  }
});

router.get('/backup', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Fetch all user-scoped data
    const wallets = await prisma.wallet.findMany({ where: { userId } });
    const categories = await prisma.category.findMany({ where: { userId } });
    const journals = await prisma.journal.findMany({ where: { userId } });
    
    // Fetch journal lines belonging to this user's journals
    const journalLines = await prisma.journalLine.findMany({
      where: {
        journal: {
          userId
        }
      }
    });

    const incomeSources = await prisma.incomeSource.findMany({ where: { userId } });
    const fixedExpenses = await prisma.fixedExpense.findMany({ where: { userId } });
    const walletAllocations = await prisma.walletAllocation.findMany({ where: { userId } });
    const goals = await prisma.goal.findMany({ where: { userId } });
    const assets = await prisma.asset.findMany({ where: { userId } });
    const debts = await prisma.debt.findMany({ where: { userId } });

    const backupPayload = {
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        userId
      },
      data: {
        wallets,
        categories,
        journals,
        journalLines,
        incomeSources,
        fixedExpenses,
        walletAllocations,
        goals,
        assets,
        debts
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="stashly_backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(backupPayload);
  } catch (err: any) {
    console.error('Error generating user backup:', err);
    res.status(500).json({ error: 'Failed to generate user backup: ' + err.message });
  }
});

router.post('/restore', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { backupData } = req.body;

    if (!backupData || !backupData.data) {
      return res.status(400).json({ error: 'Invalid backup file content' });
    }

    const {
      wallets,
      categories,
      journals,
      journalLines,
      incomeSources,
      fixedExpenses,
      walletAllocations,
      goals,
      assets,
      debts
    } = backupData.data;

    // Map old IDs to newly generated IDs to prevent unique constraint/ID conflicts with other users or self
    const walletIdMap: { [oldId: string]: string } = {};
    const categoryIdMap: { [oldId: string]: string } = {};
    const journalIdMap: { [oldId: string]: string } = {};

    const generateId = () => {
      const timestamp = Date.now().toString(36);
      const random1 = Math.random().toString(36).substring(2, 10);
      const random2 = Math.random().toString(36).substring(2, 10);
      return `c${timestamp}${random1}${random2}`.substring(0, 25);
    };

    // Pre-populate walletIdMap
    if (wallets && Array.isArray(wallets)) {
      for (const w of wallets) {
        walletIdMap[w.id] = generateId();
      }
    }

    // Pre-populate categoryIdMap
    if (categories && Array.isArray(categories)) {
      for (const c of categories) {
        categoryIdMap[c.id] = generateId();
      }
    }

    // Pre-populate journalIdMap
    if (journals && Array.isArray(journals)) {
      for (const j of journals) {
        journalIdMap[j.id] = generateId();
      }
    }

    // Use a transaction to ensure database atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing user-scoped records
      await tx.journalLine.deleteMany({
        where: { journal: { userId } }
      });
      await tx.journal.deleteMany({ where: { userId } });
      await tx.walletAllocation.deleteMany({ where: { userId } });
      await tx.wallet.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId } });
      await tx.incomeSource.deleteMany({ where: { userId } });
      await tx.fixedExpense.deleteMany({ where: { userId } });
      await tx.goal.deleteMany({ where: { userId } });
      await tx.asset.deleteMany({ where: { userId } });
      await tx.debt.deleteMany({ where: { userId } });

      // 2. Re-create wallets
      if (wallets && Array.isArray(wallets)) {
        const walletsData = wallets.map((w) => ({
          id: walletIdMap[w.id],
          name: w.name,
          type: w.type,
          account: w.account,
          balance: w.balance,
          icon: w.icon,
          color: w.color,
          goal: w.goal,
          createdAt: w.createdAt ? new Date(w.createdAt) : undefined,
          updatedAt: w.updatedAt ? new Date(w.updatedAt) : undefined,
          userId
        }));
        await tx.wallet.createMany({ data: walletsData });
      }

      // 3. Re-create categories
      if (categories && Array.isArray(categories)) {
        const categoriesData = categories.map((c) => ({
          id: categoryIdMap[c.id],
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          budgetLimit: c.budgetLimit,
          createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
          userId
        }));
        await tx.category.createMany({ data: categoriesData });
      }

      // 4. Re-create journals
      if (journals && Array.isArray(journals)) {
        const journalsData = journals.map((j) => ({
          id: journalIdMap[j.id],
          date: new Date(j.date),
          description: j.description,
          note: j.note,
          isReversed: j.isReversed,
          createdAt: j.createdAt ? new Date(j.createdAt) : undefined,
          updatedAt: j.updatedAt ? new Date(j.updatedAt) : undefined,
          userId
        }));
        await tx.journal.createMany({ data: journalsData });
      }

      // 5. Re-create journal lines
      if (journalLines && Array.isArray(journalLines)) {
        const linesData = journalLines
          .map((l) => {
            const newJournalId = journalIdMap[l.journalId];
            const newWalletId = l.walletId ? walletIdMap[l.walletId] : null;
            const newCategoryId = l.categoryId ? categoryIdMap[l.categoryId] : null;

            if (!newJournalId) return null;

            return {
              id: generateId(),
              journalId: newJournalId,
              walletId: newWalletId,
              categoryId: newCategoryId,
              amount: l.amount,
              type: l.type,
              createdAt: l.createdAt ? new Date(l.createdAt) : undefined
            };
          })
          .filter(Boolean) as any[];

        if (linesData.length > 0) {
          await tx.journalLine.createMany({ data: linesData });
        }
      }

      // 6. Re-create other lists
      if (incomeSources && Array.isArray(incomeSources)) {
        const incomeSourcesData = incomeSources.map((i) => ({
          id: generateId(),
          name: i.name,
          amount: i.amount,
          userId
        }));
        await tx.incomeSource.createMany({ data: incomeSourcesData });
      }

      if (fixedExpenses && Array.isArray(fixedExpenses)) {
        const fixedExpensesData = fixedExpenses.map((f) => ({
          id: generateId(),
          name: f.name,
          amount: f.amount,
          term: f.term,
          icon: f.icon,
          autoPay: f.autoPay,
          dueDate: f.dueDate,
          lastPaid: f.lastPaid ? new Date(f.lastPaid) : null,
          status: f.status,
          userId
        }));
        await tx.fixedExpense.createMany({ data: fixedExpensesData });
      }

      if (walletAllocations && Array.isArray(walletAllocations)) {
        const allocationsData = walletAllocations
          .map((a) => {
            const newWalletId = walletIdMap[a.walletId];
            if (!newWalletId) return null;

            return {
              id: generateId(),
              amount: a.amount,
              walletId: newWalletId,
              userId
            };
          })
          .filter(Boolean) as any[];

        if (allocationsData.length > 0) {
          await tx.walletAllocation.createMany({ data: allocationsData });
        }
      }

      if (goals && Array.isArray(goals)) {
        const goalsData = goals.map((g) => ({
          id: generateId(),
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline ? new Date(g.deadline) : null,
          icon: g.icon,
          color: g.color,
          createdAt: g.createdAt ? new Date(g.createdAt) : undefined,
          updatedAt: g.updatedAt ? new Date(g.updatedAt) : undefined,
          userId
        }));
        await tx.goal.createMany({ data: goalsData });
      }

      if (assets && Array.isArray(assets)) {
        const assetsData = assets.map((ast) => ({
          id: generateId(),
          name: ast.name,
          type: ast.type,
          purchasePrice: ast.purchasePrice,
          currentPrice: ast.currentPrice,
          purchaseDate: new Date(ast.purchaseDate),
          estimatedRate: ast.estimatedRate,
          notes: ast.notes,
          createdAt: ast.createdAt ? new Date(ast.createdAt) : undefined,
          updatedAt: ast.updatedAt ? new Date(ast.updatedAt) : undefined,
          userId
        }));
        await tx.asset.createMany({ data: assetsData });
      }

      if (debts && Array.isArray(debts)) {
        const debtsData = debts.map((d) => {
          const newWalletId = d.walletId ? walletIdMap[d.walletId] : null;
          return {
            id: generateId(),
            title: d.title,
            type: d.type,
            contact: d.contact,
            amount: d.amount,
            remainingAmount: d.remainingAmount,
            dueDate: d.dueDate ? new Date(d.dueDate) : null,
            interestRate: d.interestRate,
            notes: d.notes,
            status: d.status,
            createdAt: d.createdAt ? new Date(d.createdAt) : undefined,
            updatedAt: d.updatedAt ? new Date(d.updatedAt) : undefined,
            userId,
            walletId: newWalletId
          };
        });
        await tx.debt.createMany({ data: debtsData });
      }
    }, {
      maxWait: 20000,
      timeout: 60000
    });

    res.json({ success: true, message: 'Restore completed successfully' });
  } catch (err: any) {
    console.error('Error during data restore:', err);
    res.status(500).json({ error: 'Failed to restore database: ' + err.message });
  }
});

export default router;
