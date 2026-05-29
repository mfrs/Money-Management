import express from 'express';
import cors from 'cors';
import { queryStorage } from './_db.js';

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

const app = express();
const PORT = 3001;

// Global Middlewares
app.use(cors({
  exposedHeaders: ['X-Debug-Queries']
}));

// Query Logger Middleware (Laravel-style)
app.use((req, res, next) => {
  const queries: any[] = [];
  queryStorage.run(queries, () => {
    // Intercept response send to inject headers
    const originalSend = res.send;
    res.send = function (body: any) {
      if (queries.length > 0) {
        try {
          // Limit to first 50 queries and truncate each to avoid huge headers
          const safeQueries = queries.slice(0, 50).map(q => ({
            ...q,
            query: q.query.length > 1000 ? q.query.substring(0, 1000) + '...' : q.query
          }));
          res.setHeader('X-Debug-Queries', encodeURIComponent(JSON.stringify(safeQueries)));
        } catch (e) {
          console.error('Failed to inject X-Debug-Queries header', e);
        }
      }
      return originalSend.apply(this, arguments as any);
    };
    next();
  });
});

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

// Start Listening locally if not in production/serverless environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Stashly Modular API running at http://localhost:${PORT}`);
    console.log(`🔐 Authentication & Custom Middlewares active`);
    console.log(`🤖 Gemini Intelligent NLP and Vision tools enabled`);
  });
}

export default app;
