import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware.js';

const router = Router();

router.get('/users', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
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
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:id/data', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  try {
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
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

router.delete('/users/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
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

router.get('/pgmonitor', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const dbInfo: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        current_database() AS db_name,
        pg_size_pretty(pg_database_size(current_database())) AS db_size,
        pg_database_size(current_database())::text AS db_size_bytes,
        version() AS pg_version
    `);

    const connections: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        (SELECT count(*)::int FROM pg_stat_activity WHERE state = 'active') as active,
        (SELECT count(*)::int FROM pg_stat_activity) as total,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max
    `);

    const cacheHit: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE(round(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2), 100.0)::float AS cache_hit_ratio
      FROM pg_statio_user_tables
    `);

    const indexHit: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE(round(100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0), 2), 100.0)::float AS index_hit_ratio
      FROM pg_statio_user_indexes
    `);

    const tables: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        relname AS table_name,
        n_live_tup::int AS row_count,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
        pg_size_pretty(pg_relation_size(relid)) AS table_size,
        pg_size_pretty(pg_indexes_size(relid)) AS index_size,
        pg_total_relation_size(relid)::text AS total_size_bytes
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
    `);

    const activeQueries: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        pid::int, 
        usename AS username, 
        state, 
        application_name, 
        COALESCE(round(EXTRACT(epoch FROM (now() - query_start))::numeric, 2), 0.0)::float AS duration_seconds, 
        query 
      FROM pg_stat_activity 
      WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%'
      ORDER BY duration_seconds DESC
      LIMIT 10
    `);

    const uptime: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        pg_postmaster_start_time() as start_time,
        (now() - pg_postmaster_start_time())::text as duration
    `);

    res.json({
      database: dbInfo[0] || {},
      connections: connections[0] || {},
      cacheHitRatio: cacheHit[0]?.cache_hit_ratio ?? 100.0,
      indexHitRatio: indexHit[0]?.index_hit_ratio ?? 100.0,
      tables: tables || [],
      activeQueries: activeQueries || [],
      uptime: uptime[0] || {}
    });
  } catch (err: any) {
    console.error('Error fetching pgmonitor stats:', err);
    res.status(500).json({ error: 'Failed to fetch database monitoring stats: ' + err.message });
  }
});

export default router;
