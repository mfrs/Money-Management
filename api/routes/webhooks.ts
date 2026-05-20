import express from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// Use a secret from env, or a fallback for local testing
const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'fallback-secret-for-local-dev';

// POST /api/webhooks/github
router.post('/github', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;

  // 1. Verify Signature
  if (!signature) {
    return res.status(401).json({ error: 'No signature provided' });
  }

  const payload = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', GITHUB_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (err) {
    // Usually happens if lengths differ
    return res.status(401).json({ error: 'Invalid signature format' });
  }

  // 2. Process "push" event
  if (event === 'push') {
    const branch = req.body.ref;
    
    // Only process pushes to the main branch
    if (branch === 'refs/heads/main') {
      const commits = req.body.commits || [];
      
      if (commits.length > 0) {
        // Generate a draft title based on the first commit or the date
        const dateStr = new Date().toISOString().split('T')[0];
        const title = `Auto Draft: Update ${dateStr}`;
        const version = `v${dateStr.replace(/-/g, '')}.${Math.floor(Math.random() * 100)}`; // Pseudo-version

        // Generate markdown content from commit messages
        let content = '### Recent Changes\n\n';
        commits.forEach((c: any) => {
          content += `- ${c.message} (by ${c.author.name})\n`;
        });

        try {
          // Create a draft changelog in the database
          await prisma.changelog.create({
            data: {
              version,
              title,
              content,
              isPublished: false, // Default to draft
              releaseDate: null,
            },
          });
          console.log(`[Webhook] Created draft changelog for push to main.`);
        } catch (dbError) {
          console.error('[Webhook] Database error creating changelog:', dbError);
          return res.status(500).json({ error: 'Database error' });
        }
      }
    }
  }

  // Return 200 OK to acknowledge receipt
  res.status(200).json({ success: true });
});

export default router;
