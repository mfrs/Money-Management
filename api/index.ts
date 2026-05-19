import express from 'express';
import cors from 'cors';

// Import Feature-based Modular Routers
import adminRouter from './routes/admin';
import authRouter from './routes/auth';
import walletsRouter from './routes/wallets';
import categoriesRouter from './routes/categories';
import journalsRouter from './routes/journals';
import budgetRouter from './routes/budget';
import goalsRouter from './routes/goals';
import aiRouter from './routes/ai';
import commonRouter from './routes/common';

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
app.use('/api', aiRouter); // Matches /api/scan-receipt and /api/chat-entry
app.use('/api', commonRouter); // Matches /api/reset and /api/health

// Start Listening locally if not in production/serverless environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Stashly Modular API running at http://localhost:${PORT}`);
    console.log(`🔐 Authentication & Custom Middlewares active`);
    console.log(`🤖 Gemini Intelligent NLP and Vision tools enabled`);
  });
}

export default app;
