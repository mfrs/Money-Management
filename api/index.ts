import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'wm_s3cur3_k3y_2026_xK9pLm';

app.use(cors());
app.use(express.json());

// ===================== AUTH HELPERS =====================
interface AuthRequest extends Request {
  userId?: string;
}

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

// ===================== ADMIN ROUTES =====================
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
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
});

app.get('/api/admin/users/:id/data', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  
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
});

// ===================== AUTH ROUTES =====================
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

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

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, currency: user.currency, theme: user.theme },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { id: true, name: true, email: true, isAdmin: true, currency: true, theme: true, createdAt: true } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.put('/api/auth/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
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
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: err.message || 'Update failed' });
  }
});

app.put('/api/auth/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.userId! }, data: { password: hashed } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Password change failed' });
  }
});

// ===================== PROTECTED ROUTES (all user-scoped) =====================

// WALLETS
app.get('/api/wallets', authMiddleware, async (req: AuthRequest, res: Response) => {
  const wallets = await prisma.wallet.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: 'asc' } });
  res.json(wallets);
});

app.post('/api/wallets', authMiddleware, async (req: AuthRequest, res: Response) => {
  const wallet = await prisma.wallet.create({ data: { ...req.body, userId: req.userId! } });
  res.status(201).json(wallet);
});

app.put('/api/wallets/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const wallet = await prisma.wallet.update({ where: { id: req.params.id, userId: req.userId! }, data: req.body });
  res.json(wallet);
});

app.delete('/api/wallets/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.wallet.delete({ where: { id: req.params.id, userId: req.userId! } });
  res.json({ success: true });
});

// CATEGORIES
app.get('/api/categories', authMiddleware, async (req: AuthRequest, res: Response) => {
  const categories = await prisma.category.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: 'asc' } });
  res.json(categories);
});

app.post('/api/categories', authMiddleware, async (req: AuthRequest, res: Response) => {
  const category = await prisma.category.create({ data: { ...req.body, userId: req.userId! } });
  res.status(201).json(category);
});

app.put('/api/categories/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const category = await prisma.category.update({ where: { id: req.params.id, userId: req.userId! }, data: req.body });
  res.json(category);
});

app.delete('/api/categories/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.category.delete({ where: { id: req.params.id, userId: req.userId! } });
  res.json({ success: true });
});

// JOURNALS
app.get('/api/journals', authMiddleware, async (req: AuthRequest, res: Response) => {
  const journals = await prisma.journal.findMany({
    where: { userId: req.userId! },
    orderBy: { date: 'desc' },
    include: { lines: true },
  });
  res.json(journals);
});

app.post('/api/journals', authMiddleware, async (req: AuthRequest, res: Response) => {
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
});

app.delete('/api/journals/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const journal = await prisma.journal.findFirst({ where: { id: req.params.id, userId: req.userId! }, include: { lines: true } });
  if (!journal) return res.status(404).json({ error: 'Not found' });

  const walletUpdates = journal.lines.filter(l => l.walletId).map(l => 
    prisma.wallet.update({
      where: { id: l.walletId },
      data: { balance: { [l.type === 'DEBIT' ? 'decrement' : 'increment']: l.amount } }
    })
  );

  await prisma.$transaction([
    prisma.journal.delete({ where: { id: req.params.id } }),
    ...walletUpdates
  ]);

  res.json({ success: true });
});

// BUDGET: INCOME SOURCES
app.get('/api/budget/income-sources', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json(await prisma.incomeSource.findMany({ where: { userId: req.userId! } }));
});
app.post('/api/budget/income-sources', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.status(201).json(await prisma.incomeSource.create({ data: { ...req.body, userId: req.userId! } }));
});
app.put('/api/budget/income-sources/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json(await prisma.incomeSource.update({ where: { id: req.params.id, userId: req.userId! }, data: req.body }));
});
app.delete('/api/budget/income-sources/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.incomeSource.delete({ where: { id: req.params.id, userId: req.userId! } });
  res.json({ success: true });
});

// BUDGET: FIXED EXPENSES
app.get('/api/budget/fixed-expenses', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json(await prisma.fixedExpense.findMany({ where: { userId: req.userId! } }));
});
app.post('/api/budget/fixed-expenses', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.status(201).json(await prisma.fixedExpense.create({ data: { ...req.body, userId: req.userId! } }));
});
app.put('/api/budget/fixed-expenses/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json(await prisma.fixedExpense.update({ where: { id: req.params.id, userId: req.userId! }, data: req.body }));
});
app.delete('/api/budget/fixed-expenses/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.fixedExpense.delete({ where: { id: req.params.id, userId: req.userId! } });
  res.json({ success: true });
});

// BUDGET: WALLET ALLOCATIONS
app.get('/api/budget/wallet-allocations', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json(await prisma.walletAllocation.findMany({ where: { userId: req.userId! }, include: { wallet: true } }));
});
app.post('/api/budget/wallet-allocations', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.status(201).json(await prisma.walletAllocation.create({ data: { ...req.body, userId: req.userId! } }));
});
app.put('/api/budget/wallet-allocations/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json(await prisma.walletAllocation.update({ where: { id: req.params.id, userId: req.userId! }, data: req.body }));
});
app.delete('/api/budget/wallet-allocations/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.walletAllocation.delete({ where: { id: req.params.id, userId: req.userId! } });
  res.json({ success: true });
});

// GOALS
app.get('/api/goals', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json(await prisma.goal.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: 'desc' } }));
});
app.post('/api/goals', authMiddleware, async (req: AuthRequest, res: Response) => {
  const data = { ...req.body, userId: req.userId! };
  if (data.deadline) data.deadline = new Date(data.deadline);
  res.status(201).json(await prisma.goal.create({ data }));
});
app.put('/api/goals/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const data = { ...req.body };
  if (data.deadline) data.deadline = new Date(data.deadline);
  res.json(await prisma.goal.update({ where: { id: req.params.id, userId: req.userId! }, data }));
});
app.delete('/api/goals/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.goal.delete({ where: { id: req.params.id, userId: req.userId! } });
  res.json({ success: true });
});

// RESET DATA (user-scoped)
app.post('/api/reset', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.journal.deleteMany({ where: { userId: req.userId! } });
  await prisma.walletAllocation.deleteMany({ where: { userId: req.userId! } });
  await prisma.fixedExpense.deleteMany({ where: { userId: req.userId! } });
  await prisma.incomeSource.deleteMany({ where: { userId: req.userId! } });
  await prisma.wallet.deleteMany({ where: { userId: req.userId! } });
  await prisma.category.deleteMany({ where: { userId: req.userId! } });
  res.json({ success: true, message: 'All data cleared.' });
});

// HEALTH CHECK (public)
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 WealthManager API running at http://localhost:${PORT}`);
    console.log(`📦 Database: PostgreSQL @ 103.247.10.39`);
    console.log(`🔐 JWT Auth enabled`);
  });
}

export default app;
