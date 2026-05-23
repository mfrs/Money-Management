import express from 'express';
import cors from 'cors';

// Import Feature-based Modular Routers
import adminRouter from './_routes/admin.js';
import authRouter from './_routes/auth.js';
import walletsRouter from './_routes/wallets.js';
import categoriesRouter from './_routes/categories.js';
import journalsRouter from './_routes/journals.js';
import budgetRouter from './_routes/budget.js';
import goalsRouter from './_routes/goals.js';
import assetsRouter from './_routes/assets.js';
import assetTypesRouter from './_routes/asset-types.js';
import debtsRouter from './_routes/debts.js';
import changelogRouter from './_routes/changelog.js';
import webhooksRouter from './_routes/webhooks.js';
import aiRouter from './_routes/ai.js';
import commonRouter from './_routes/common.js';

import http from 'http';
import { WebSocketServer } from 'ws';
import { setupGeminiLiveProxy } from './_routes/gemini-live-proxy.js';

const app = express();
const PORT = 3001;

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 image receipt scanning uploads

// Mount Feature Routes
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/wallets', walletsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/journals', journalsRouter);
app.use('/api/budget', budgetRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/asset-types', assetTypesRouter);
app.use('/api/debts', debtsRouter);
app.use('/api/changelog', changelogRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api', aiRouter); // Matches /api/scan-receipt and /api/chat-entry
app.use('/api', commonRouter); // Matches /api/reset and /api/health

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket Server for Gemini Live API Proxy
const wss = new WebSocketServer({ server, path: '/api/gemini-live' });
setupGeminiLiveProxy(wss);

// Start Listening locally if not in production/serverless environment
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`🚀 Stashly Modular API running at http://localhost:${PORT}`);
    console.log(`🔐 Authentication & Custom Middlewares active`);
    console.log(`🤖 Gemini Intelligent NLP and Vision tools enabled`);
    console.log(`🎙️  Gemini Multimodal Live WebSockets enabled on /api/gemini-live`);
  });
}

export default server;
