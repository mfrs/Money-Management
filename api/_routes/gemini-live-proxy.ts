import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { prisma } from '../_db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// System instruction to prime the Gemini Live assistant
const SYSTEM_INSTRUCTION = {
  parts: [{
    text: `You are Stashly's AI Voice Assistant, an intelligent financial advisor. 
You communicate concisely, naturally, and warmly in the user's spoken language. 
You have access to the user's financial data via tools. 
When asked to perform a transaction or get information, use your tools. 
Keep your verbal responses relatively short and conversational. 
Do not read out long lists of data or IDs. Be extremely brief but helpful.`
  }]
};

// Initial setup message required by Gemini Live API
const getSetupMessage = () => ({
  setup: {
    model: 'models/gemini-2.0-flash-exp',
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Aoede", // Options: Aoede, Charon, Fenrir, Kore, Puck
          }
        }
      }
    },
    tools: [
      {
        functionDeclarations: [
          {
            name: "addTransaction",
            description: "Adds a new income or expense transaction to the user's wallet.",
            parameters: {
              type: "OBJECT",
              properties: {
                type: { type: "STRING", enum: ["income", "expense"], description: "Whether this is an income or an expense." },
                amount: { type: "NUMBER", description: "The transaction amount in IDR/currency" },
                description: { type: "STRING", description: "Short description of what the transaction was for" },
                category: { type: "STRING", description: "Category of the transaction, e.g. Food, Transport, Salary" }
              },
              required: ["type", "amount", "description", "category"]
            }
          },
          {
            name: "getSummary",
            description: "Gets the user's total balance and brief summary of their finances.",
            parameters: {
              type: "OBJECT",
              properties: {}
            }
          }
        ]
      }
    ]
  }
});

export function setupGeminiLiveProxy(wss: WebSocketServer) {
  wss.on('connection', async (clientWs, req) => {
    // 1. Authenticate the connection via URL parameter (e.g. ?token=...)
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    let userId: string;
    try {
      if (!token) throw new Error('No token provided');
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (err) {
      console.error('WebSocket Authentication failed');
      clientWs.close(1008, 'Unauthorized');
      return;
    }

    if (!GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY');
      clientWs.close(1011, 'Server misconfiguration');
      return;
    }

    // 2. Connect to Gemini Live API
    const geminiWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;
    const geminiWs = new WebSocket(geminiWsUrl);

    let isGeminiConnected = false;

    geminiWs.on('open', () => {
      console.log(`[Proxy] Connected to Gemini Live for User ${userId}`);
      isGeminiConnected = true;
      // Send the initial setup config
      geminiWs.send(JSON.stringify(getSetupMessage()));
    });

    geminiWs.on('message', async (data, isBinary) => {
      // Data from Gemini (could be text/JSON or binary)
      // The Live API responds with JSON strings containing base64 audio and text
      try {
        const responseJson = data.toString();
        const responseObj = JSON.parse(responseJson);

        // Handle tool calls from Gemini
        if (responseObj.toolCall) {
          console.log('[Proxy] Gemini requested a tool call:', responseObj.toolCall);
          const functionCalls = responseObj.toolCall.functionCalls;
          const toolResponses = [];

          for (const call of functionCalls) {
            let result = {};
            if (call.name === 'addTransaction') {
              // TODO: Implement actual database write
              result = { success: true, message: `Added ${call.args.type} of ${call.args.amount} for ${call.args.description}` };
            } else if (call.name === 'getSummary') {
              // Fetch real total balance from DB
              const wallets = await prisma.wallet.findMany({ where: { userId } });
              const total = wallets.reduce((sum, w) => sum + w.balance, 0);
              result = { success: true, totalBalance: total, walletsCount: wallets.length };
            }
            toolResponses.push({
              id: call.id,
              name: call.name,
              response: result
            });
          }

          // Send tool response back to Gemini
          geminiWs.send(JSON.stringify({
            toolResponse: { functionResponses: toolResponses }
          }));
        }

        // Forward exactly as it is back to the React frontend
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(responseJson);
        }
      } catch (e) {
        // If it's not JSON, forward as binary?
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data, { binary: isBinary });
        }
      }
    });

    geminiWs.on('close', () => {
      console.log(`[Proxy] Gemini Live connection closed for User ${userId}`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
    });

    geminiWs.on('error', (err) => {
      console.error(`[Proxy] Gemini WS Error:`, err);
    });

    // 3. Handle messages from the client (microphone PCM base64 data)
    clientWs.on('message', (data) => {
      if (!isGeminiConnected) return; // Drop until Gemini is ready
      // Client sends JSON containing clientContent (realtimeInput)
      geminiWs.send(data.toString());
    });

    clientWs.on('close', () => {
      console.log(`[Proxy] Client disconnected (User ${userId})`);
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.close();
      }
    });
  });
}
