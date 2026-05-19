import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware.js';

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

export default router;
