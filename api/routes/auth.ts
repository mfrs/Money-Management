import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { authMiddleware, AuthRequest, JWT_SECRET } from '../middleware';

const router = Router();

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
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

export default router;
