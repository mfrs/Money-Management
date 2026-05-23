import { Router, Response } from 'express';
import { prisma } from '../_db.js';
import { authMiddleware, AuthRequest } from '../_middleware.js';

const router = Router();

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

// RECEIPT SCANNER
router.post('/scan-receipt', authMiddleware, async (req: AuthRequest, res: Response) => {
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
    - "totalAmount": number (The grand total amount, parsed as a raw integer number. IMPORTANT: Indonesian receipts use dot '.' as thousands separator and comma ',' as decimal separator, e.g., 'Rp47.000' or '47.000' means 47000. Do NOT parse it as 47. You MUST return 47000.)
    
    If you cannot find a value, use null.
    Important: Do not include markdown code blocks (\`\`\`json) in your response, just the raw JSON object.`;

    let rawText = '';
    const isGeminiKey = apiKey.startsWith('AIzaSy');

    if (isGeminiKey) {
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

// AI CHAT ENTRY
router.post('/chat-entry', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text, wallets, categories, goals, currentDate, assets: clientAssets, debts: clientDebts, fixedExpenses, incomeSources } = req.body;
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

    // Fetch assets & debts from DB for richer context
    const [dbAssets, dbDebts] = await Promise.all([
      prisma.asset.findMany({ where: { userId: req.userId! } }),
      prisma.debt.findMany({ where: { userId: req.userId!, status: 'ACTIVE' } })
    ]);

    const assetsList = dbAssets.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      purchasePrice: a.purchasePrice,
      currentPrice: a.currentPrice,
      capitalGain: a.currentPrice - a.purchasePrice,
      capitalGainPercent: a.purchasePrice > 0 ? (((a.currentPrice - a.purchasePrice) / a.purchasePrice) * 100).toFixed(1) + '%' : '0%',
      purchaseDate: a.purchaseDate.toISOString().split('T')[0]
    }));

    const debtsList = dbDebts.map(d => ({
      id: d.id,
      title: d.title,
      type: d.type,
      contact: d.contact,
      totalAmount: d.amount,
      remainingAmount: d.remainingAmount,
      paidAmount: d.amount - d.remainingAmount,
      interestRate: d.interestRate,
      dueDate: d.dueDate ? d.dueDate.toISOString().split('T')[0] : null,
      walletId: d.walletId
    }));

    const fixedExpensesList = (fixedExpenses || []).map((fe: any) => ({
      name: fe.name,
      amount: fe.amount,
      dueDate: fe.dueDate,
      status: fe.status,
      lastPaid: fe.lastPaid
    }));

    const incomeSourcesList = (incomeSources || []).map((is: any) => ({
      name: is.name,
      amount: is.amount
    }));

    // Calculate Net Worth
    const totalWalletBalance = (wallets || []).reduce((sum: number, w: any) => sum + (w.balance || 0), 0);
    const totalGoalSavings = goalsList.reduce((sum: number, g: any) => sum + (g.currentAmount || 0), 0);
    const totalAssetValue = dbAssets.reduce((sum, a) => sum + a.currentPrice, 0);
    const totalAssetPurchaseValue = dbAssets.reduce((sum, a) => sum + a.purchasePrice, 0);
    const totalDebtRemaining = dbDebts.filter(d => d.type === 'DEBT').reduce((sum, d) => sum + d.remainingAmount, 0);
    const totalReceivableRemaining = dbDebts.filter(d => d.type === 'RECEIVABLE').reduce((sum, d) => sum + d.remainingAmount, 0);
    const netWorth = totalWalletBalance + totalGoalSavings + totalAssetValue + totalReceivableRemaining - totalDebtRemaining;
    const totalMonthlyIncome = incomeSourcesList.reduce((sum: number, is: any) => sum + (is.amount || 0), 0);
    const totalMonthlyFixedExpenses = fixedExpensesList.reduce((sum: number, fe: any) => sum + (fe.amount || 0), 0);

    const prompt = `You are a world-class personal financial planner and parser assistant. You have FULL access to the user's financial data.
User text: "${text}"
Current Date Context: ${currentDate}

=== FINANCIAL SNAPSHOT ===
Net Worth: ${netWorth}
Total Wallet Balance: ${totalWalletBalance}
Total Goal Savings: ${totalGoalSavings}
Total Asset Value (Current): ${totalAssetValue}
Total Asset Purchase Value: ${totalAssetPurchaseValue}
Total Capital Gain/Loss: ${totalAssetValue - totalAssetPurchaseValue}
Total Debts Remaining: ${totalDebtRemaining}
Total Receivables (Piutang): ${totalReceivableRemaining}
Monthly Income (Projected): ${totalMonthlyIncome}
Monthly Fixed Expenses: ${totalMonthlyFixedExpenses}
Monthly Disposable (Income - Fixed): ${totalMonthlyIncome - totalMonthlyFixedExpenses}

=== WALLETS ===
${JSON.stringify(wallets)}

=== CATEGORIES (with monthly spending & budget limits) ===
${JSON.stringify(categoriesWithSpending)}

=== GOALS ===
${JSON.stringify(goalsList)}

=== ASSETS (Investments, Property, Gold, Vehicles, etc.) ===
${JSON.stringify(assetsList)}

=== ACTIVE DEBTS & RECEIVABLES ===
${JSON.stringify(debtsList)}

=== FIXED EXPENSES (Monthly Bills) ===
${JSON.stringify(fixedExpensesList)}

=== INCOME SOURCES ===
${JSON.stringify(incomeSourcesList)}

=== RECENT ACTIVE TRANSACTIONS ===
${JSON.stringify(recentJournalsText)}

Determine the user's intent from the following options. Return ONLY a valid JSON.

1. If the user wants to ASK A QUESTION, request financial analysis, ask about balances, net worth, assets, debts, fixed expenses, income, or request tips/insights:
   - Perform the analysis based on ALL provided data: wallets, categories, goals, assets, debts, fixed expenses, income sources, recent transactions, and the Financial Snapshot.
   - You can answer questions like: "berapa net worth saya?", "capital gain aset saya?", "utang saya yang paling dekat jatuh tempo?", "total tagihan bulan ini?", "saldo BCA?", "boros di mana bulan ini?", "total pengeluaran makan?", "analisis pola belanja", "kapan utang saya lunas?", "berapa disposable income saya?", "aset mana yang paling untung?", "siapa yang masih utang ke saya?"
   - For net worth questions, break it down: Wallets + Goal Savings + Assets + Receivables - Debts.
   - For asset questions, include capital gain/loss percentages.
   - For debt questions, include due dates and remaining amounts.
   - For budget questions, compare income vs fixed expenses vs actual spending.
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

4. If the user wants to CREATE/ADD one or multiple transactions (either by voice/text or scanned receipt details):
   - Detect if the user mentioned multiple independent transactions (e.g. "makan 10k pakai BCA, bayar tambal ban 15k cash").
   - For EACH transaction, resolve the transaction type:
     * 'income': If money is coming in.
     * 'expense': If money is going out.
     * 'transfer': ONLY if money is being moved between two distinct wallets.
   - For EACH transaction, resolve amount, description, walletId, categoryId, toWalletId, date.
   - Map to suitable Category UUID from Available Categories based on type. Never leave categoryId null if type is 'income' or 'expense'. If they mention an entirely new category, use Option 5 instead.
   - Generate "budgetAlert" and "duplicateAlert" per transaction exactly as before.
   - Return ONLY this structure:
     {
       "action": "create_transactions",
       "transactions": [
         {
           "type": "expense",
           "amount": 150000,
           "description": "Makan siang solaria",
           "walletId": "uuid-of-wallet",
           "toWalletId": null,
           "categoryId": "uuid-of-category",
           "date": "2024-05-18T12:00:00.000Z",
           "budgetAlert": null,
           "duplicateAlert": null
         }
       ]
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
     }

6. If the user wants to CREATE A NEW DEBT or RECEIVABLE (e.g., "pinjam uang 500rb ke Andi", "Budi utang 1jt ke saya", "catat utang 2jt dari Bank", "saya pinjamkan 300rb ke Siti"):
   - Determine type: "DEBT" if the user borrows money, "RECEIVABLE" if the user lends money to someone.
   - Return ONLY this structure:
     {
       "action": "create_debt",
       "title": "Descriptive title, e.g. Pinjaman dari Andi",
       "type": "DEBT", // or "RECEIVABLE"
       "contact": "Andi", // the other party's name
       "amount": 500000, // the total debt amount as positive number
       "dueDate": "2024-06-18T00:00:00.000Z", // ISO string if mentioned, else null
       "interestRate": 0, // annual interest rate if mentioned, else 0
       "notes": "Via AI Chat",
       "walletId": "uuid-of-wallet" // resolved wallet UUID if user mentions where the money comes from/goes to, else null
     }

7. If the user wants to PAY/CICIL an existing debt or receive payment on a receivable (e.g., "bayar utang Andi 200rb dari BCA", "Budi bayar piutang 500rb", "cicil utang bank 1jt"):
   - Match the debt from the "Active Debts & Receivables" list.
   - Return ONLY this structure:
     {
       "action": "pay_debt",
       "debtId": "the-matched-debt-uuid",
       "debtTitle": "the-matched-debt-title",
       "contact": "the contact name",
       "amount": 200000, // the payment amount
       "walletId": "uuid-of-wallet", // resolved wallet UUID for payment source/destination
       "walletName": "wallet name"
     }
   - If debt not found:
     {
       "action": "debt_not_found",
       "message": "Hutang/piutang tidak ditemukan di daftar aktif."
     }

8. If the user wants to CREATE ONE OR MULTIPLE NEW WALLETS / ACCOUNTS (e.g. "bikin dompet baru namanya OVO, Gopay, dan BCA dengan saldo masing-masing 1jt"):
   - Return ONLY this structure:
     {
       "action": "create_wallets",
       "wallets": [
         {
           "name": "OVO",
           "balance": 1000000
         }
       ]
     }

9. If the user wants to CREATE A NEW SAVINGS GOAL (e.g. "bikin target tabungan liburan 10 juta", "saya mau nabung buat beli mobil 200jt"):
   - Return ONLY this structure:
     {
       "action": "create_goal",
       "name": "Liburan",
       "targetAmount": 10000000,
       "currentAmount": 0, // starting amount if mentioned, else 0
       "deadline": null // ISO string date if mentioned (e.g. "tahun depan", "akhir tahun"), else null
     }

10. If the user wants to CREATE/BUY A NEW ASSET (e.g. "beli saham BBCA 10 lot harga 1 juta", "catat beli emas 5 gram harga 1.2jt"):
    - Identify if they are paying using a specific wallet.
    - Return ONLY this structure:
      {
        "action": "create_asset",
        "name": "Saham BBCA", // descriptive name
        "type": "STOCK", // choose best fit from: STOCK, CRYPTO, PROPERTY, VEHICLE, GOLD, OTHER
        "purchasePrice": 1000000, // total numeric value of purchase
        "walletId": "uuid-of-wallet" // resolved wallet UUID if user mentions payment source, else null
      }

11. If the user wants to SET/UPDATE THEIR MONTHLY INCOME SOURCE (e.g. "gajiku sekarang 10 juta per bulan", "tambah pemasukan dari freelance 2 juta"):
    - Return ONLY this structure:
      {
        "action": "create_income_source",
        "name": "Gaji", // descriptive name based on input
        "amount": 10000000
      }

12. If the user wants to SET/UPDATE THEIR MONTHLY FIXED EXPENSE (e.g. "tiap bulan saya bayar kos 2 juta", "tambah langganan netflix 150rb tiap tanggal 10"):
    - Return ONLY this structure:
      {
        "action": "create_fixed_expense",
        "name": "Bayar Kos",
        "amount": 2000000,
        "dueDate": 1 // Day of month (1-31) if mentioned, else 1
      }`;

    let rawText = '';
    const isGeminiKey = apiKey.startsWith('AIzaSy');

    if (isGeminiKey) {
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

// Authenticated endpoint to fetch the Gemini API key for Live WebSockets directly on the frontend
// (Required because Vercel Serverless Functions do not support WebSocket Proxies)
router.get('/gemini-key', authMiddleware, (req: AuthRequest, res: Response) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
  }
  res.json({ key });
});

export default router;
