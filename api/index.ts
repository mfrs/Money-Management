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
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 image uploads

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

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  // Prevent admin from deleting themselves accidentally
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

// HELPER TO EXTRACT AND PARSE JSON SAFELY FROM AI RESPONSES
function cleanAndParseJSON(rawText: string): any {
  if (!rawText) return {};
  let cleaned = rawText.trim();
  
  // Strip markdown code blocks if present
  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();
  }
  
  // Extract content between first '{' and last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse JSON content:', cleaned, err);
    throw new Error('Response is not valid JSON');
  }
}

// RECEIPT SCANNER (OPENROUTER / DIRECT GEMINI DUAL ROUTER)
app.post('/api/scan-receipt', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key is not configured on the server' });
    }

    const prompt = `You are an expert accountant. Extract data from this receipt.
    Return ONLY a valid JSON object with the following keys:
    - "merchantName": string (The name of the store or merchant)
    - "date": string (Format: YYYY-MM-DD, e.g., 2024-05-18. If no year, assume current year)
    - "totalAmount": number (The grand total amount, parsed as a raw number without currency symbols)
    
    If you cannot find a value, use null.
    Important: Do not include markdown code blocks (\`\`\`json) in your response, just the raw JSON object.`;

    let rawText = '';
    const isGeminiKey = apiKey.startsWith('AIzaSy');

    if (isGeminiKey) {
      // Route directly to Google Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: imageBase64 } }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errText}`);
      }

      const result = await response.json() as any;
      rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    } else {
      const visionModel = process.env.OPENROUTER_VISION_MODEL || "google/gemini-2.5-flash";
      const isLlamaOrQwenOrFree = visionModel.includes('llama') || visionModel.includes('qwen') || visionModel.includes(':free');
      
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "WealthManager"
        },
        body: JSON.stringify({
          model: visionModel,
          ...(isLlamaOrQwenOrFree ? {} : { response_format: { type: "json_object" } }),
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
      }

      const result = await response.json() as any;
      rawText = result.choices?.[0]?.message?.content || '{}';
    }

    const parsedData = cleanAndParseJSON(rawText);
    res.json(parsedData);
  } catch (error: any) {
    console.error('Receipt Scan Error:', error);
    res.status(500).json({ error: error.message || 'Failed to scan receipt' });
  }
});

// AI CHAT ENTRY (GEMINI AI)
app.post('/api/chat-entry', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text, wallets, categories, goals, currentDate } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    // Fetch user's recent active transactions to allow deletion matching
    const recentJournals = await prisma.journal.findMany({
      where: { userId: req.userId!, isReversed: false },
      orderBy: { date: 'desc' },
      take: 25,
      include: {
        lines: {
          include: {
            wallet: true,
            category: true
          }
        }
      }
    });

    const recentJournalsText = recentJournals.map(j => {
      const mainLine = j.lines[0];
      const amount = mainLine ? mainLine.amount : 0;
      
      const walletLines = j.lines.filter(l => l.walletId && l.wallet);
      const categoryLines = j.lines.filter(l => l.categoryId && l.category);
      
      const walletName = walletLines.map(wl => wl.wallet?.name).join(' and ') || 'N/A';
      const categoryName = categoryLines.map(cl => cl.category?.name).join(', ') || 'N/A';

      let type = 'expense';
      if (walletLines.length === 2) {
        type = 'transfer';
      } else if (walletLines.length === 1 && categoryLines.length === 1) {
        const wl = walletLines[0];
        if (wl.type === 'DEBIT') {
          type = 'income';
        } else {
          type = 'expense';
        }
      }

      return {
        id: j.id,
        description: j.description,
        amount,
        type,
        date: j.date.toISOString().split('T')[0],
        walletName,
        categoryName
      };
    });

    // Calculate current month's spending for each category to support budget alerts
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const currentMonthJournals = await prisma.journal.findMany({
      where: { 
        userId: req.userId!, 
        isReversed: false,
        date: { gte: startOfMonth }
      },
      include: {
        lines: {
          include: {
            category: true
          }
        }
      }
    });

    const categorySpending: { [key: string]: number } = {};
    currentMonthJournals.forEach(j => {
      j.lines.forEach(l => {
        if (l.categoryId) {
          categorySpending[l.categoryId] = (categorySpending[l.categoryId] || 0) + l.amount;
        }
      });
    });

    const categoriesWithSpending = (categories || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      budgetLimit: c.budgetLimit || 0,
      currentSpending: categorySpending[c.id] || 0
    }));

    const goalsList = goals || [];

    const prompt = `You are a world-class personal financial planner and parser assistant.
User text: "${text}"
Current Date Context: ${currentDate}

Available Wallets (JSON):
${JSON.stringify(wallets)}

Available Categories with monthly spending and budget limits (JSON):
${JSON.stringify(categoriesWithSpending)}

Available Goals (JSON):
${JSON.stringify(goalsList)}

Recent Active Transactions (JSON):
${JSON.stringify(recentJournalsText)}

Determine the user's intent from the following options. Return ONLY a valid JSON.

1. If the user wants to ASK A QUESTION, request financial analysis, ask about balances, or request tips/insights:
   - Perform the analysis based on the provided wallets, categories (with limits & spending), and recent transactions.
   - For example: "berapa saldo BCA?", "boros di mana bulan ini?", "total pengeluaran makan?", "analisis pola belanja".
   - Return ONLY this structure:
     {
       "action": "answer",
       "message": "AI's detailed, beautiful natural language response. You can use markdown bullet points, bold text, and emojis. Answer in the user's language (Indonesian if text is in Indonesian, English if in English)."
     }

2. If the user wants to SAVE MONEY TOWARDS A SAVINGS GOAL (e.g. "tabung 500rb ke goal Macbook", "alokasikan 200rb ke goal liburan"):
   - Identify the matching Goal from the Available Goals list, and the source Wallet from the Available Wallets.
   - Return ONLY this structure:
     {
       "action": "allocate_goal",
       "goalId": "the-matched-goal-uuid",
       "goalName": "the-matched-goal-name",
       "amount": 500000, // the parsed amount
       "walletId": "the-source-wallet-uuid", // default to first wallet if not mentioned
       "walletName": "the-source-wallet-name"
     }

3. If the user wants to DELETE, REVERSE, CANCEL, or says "tidak jadi" for an existing transaction:
   - Identify which transaction from the "Recent Active Transactions" list matches the user's request.
   - Return ONLY this structure:
     {
       "action": "delete",
       "journalId": "the-matched-journal-id",
       "description": "the-matched-journal-description",
       "amount": the-matched-journal-amount,
       "walletName": "the-matched-wallet-name"
     }
   - If not found:
     {
       "action": "delete_not_found",
       "message": "Transaksi tidak ditemukan di riwayat terbaru."
     }

4. If the user wants to CREATE/ADD a transaction (either by voice/text or scanned receipt details):
   - Resolve the transaction type:
     * 'income': If money is coming in (e.g., "masuk uang", "terima", "gaji", "tambah saldo"). If only one wallet is mentioned, it is always 'income', NOT 'transfer'.
     * 'expense': If money is going out (e.g., "bayar", "beli", "keluar uang", "kurang saldo").
     * 'transfer': ONLY if money is being moved between two distinct wallets (e.g., "transfer dari BCA ke Jago").
   - Resolve the amount:
     * Parse the exact numeric amount as a positive JSON number (e.g., 10000000 instead of "10jt" or "NaN").
     * If multiple numbers are mentioned (e.g., "masuk uang 10jt ke bank jago 20jt"), carefully identify the primary transaction amount. In "masuk uang 10jt ke bank jago 20jt", the transaction amount is 10000000, and "20jt" is the final balance.
   - Resolve the wallet and category:
     * Map the mentioned wallet (e.g., "bank jago" or "jago") to its corresponding UUID in Available Wallets.
     * Map to a suitable Category UUID from Available Categories based on the type. If the user explicitly mentions a category name that does NOT exist in Available Categories (e.g. "kategori Kopi Baru"), stop and use Option 5 instead. Never leave categoryId null if the type is 'income' or 'expense'.
   - If the amount is mentioned in a foreign currency (like $10 or 12 USD or 1000 JPY), automatically convert it to the user's primary currency (IDR, assuming $1 = 16000 IDR, 1 SGD = 12000 IDR, etc.).
   - Check if this new transaction would exceed the matched category's budgetLimit, or push it above 80% of the limit.
   - If so, generate a warning message in the "budgetAlert" field. Example: "Awas! Pengeluaran ini membuat kategori Makan kamu melebihi budget Rp 3.000.000 (terpakai Rp 3.150.000)." If not, leave "budgetAlert" as null.
   - Check if a highly similar transaction has already been recorded in the "Recent Active Transactions" list to prevent double entry (deduplication). A highly similar transaction has:
     * The exact same amount (or very close, within 2%).
     * A very similar description or merchant name (e.g., "Starbucks" matches "Starbucks Coffee", "Solaria" matches "Makan solaria").
     * A date very close to the target date (within 2 days).
     * If a highly similar transaction exists, populate the "duplicateAlert" field with a warning. Example: "Peringatan: Transaksi serupa (Starbucks sebesar Rp 85.000 pada tanggal 18 Mei) sudah pernah dicatat sebelumnya di dompet BCA. Apakah Anda yakin ini bukan transaksi ganda? ⚠️". If no duplicate is detected, set "duplicateAlert" to null.
   - Return ONLY this structure:
     {
       "action": "create",
       "type": "expense", // or "income" or "transfer"
       "amount": 150000, // resolved positive JSON number
       "description": "Makan siang solaria", // a clear and descriptive description based on user input, never "Unknown"
       "walletId": "uuid-of-wallet", // resolved UUID of the target wallet (e.g., Bank Jago UUID)
       "toWalletId": "uuid-of-to-wallet", // only if type is transfer, else null
       "categoryId": "uuid-of-category", // resolved UUID of the category (must match type: income or expense), never null
       "date": "2024-05-18T12:00:00.000Z", // use ISO string
       "budgetAlert": "Warning message if budget exceeded/near limit, else null",
       "duplicateAlert": "Warning message if similar transaction found, else null"
     }

5. If the user mentions a category name that does NOT exist in the "Available Categories" list (either when explicitly trying to categorize something or when recording a transaction with a new category, e.g. "kategorikan kopi ke Kopi Baru", "catat belanja 200rb ke kategori Bulanan Baru"):
   - Return ONLY this structure:
     {
       "action": "create_category",
       "categoryName": "The New Category Name", // Capitalized beautiful name, e.g., "Kopi Baru"
       "type": "expense", // "expense" or "income" based on context (default to "expense")
       "color": "#3B82F6", // pick a beautiful modern hex color (e.g., #3B82F6, #10B981, #8B5CF6, #F59E0B, #EF4444)
       "icon": "Tag", // lucide icon name (e.g., Tag, Coffee, ShoppingBag, Utensils, HelpCircle)
       "message": "Kategori 'Kopi Baru' belum terdaftar. Apakah Anda ingin membuatnya?",
       "pendingTransaction": { // Include this ONLY if they were trying to log a transaction along with this new category! If just "kategorikan ke Kopi Baru" without transaction amount, set to null.
         "amount": 200000, // parsed number
         "type": "expense", // "expense" or "income"
         "description": "Beli kopi",
         "walletId": "uuid-of-wallet", // resolved UUID of wallet if mentioned, or default to first wallet UUID
         "date": "2024-05-18T12:00:00.000Z"
       }
     }`;

    let rawText = '';
    const isGeminiKey = apiKey.startsWith('AIzaSy');

    if (isGeminiKey) {
      // Route directly to Google Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errText}`);
      }

      const result = await response.json() as any;
      rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    } else {
      // Route to OpenRouter API
      const chatModel = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat";
      const isLlamaOrQwenOrFree = chatModel.includes('llama') || chatModel.includes('qwen') || chatModel.includes(':free');
      
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "WealthManager"
        },
        body: JSON.stringify({
          model: chatModel,
          ...(isLlamaOrQwenOrFree ? {} : { response_format: { type: "json_object" } }),
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
      }

      const result = await response.json() as any;
      rawText = result.choices?.[0]?.message?.content || '{}';
    }

    const parsedData = cleanAndParseJSON(rawText);
    res.json(parsedData);
  } catch (error: any) {
    console.error('Chat Entry Error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse chat' });
  }
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
