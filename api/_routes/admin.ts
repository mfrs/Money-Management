import { Router, Response } from 'express';
import { prisma } from '../_db.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../_middleware.js';

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
          select: { wallets: true, journals: true, categories: true, goals: true, assets: true, debts: true }
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
    const [wallets, journals, categories, goals] = await Promise.all([
      prisma.wallet.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.journal.findMany({ 
        where: { userId }, 
        include: { 
          lines: {
            include: {
              wallet: true,
              category: true
            }
          }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.category.findMany({ where: { userId } }),
      prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    ]);
    res.json({ wallets, journals, categories, goals });
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

router.get('/backup/json', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 1. Get all public user tables
    const tables: any[] = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT LIKE '_prisma%'
    `);

    const backupData: Record<string, any[]> = {};

    // 2. Fetch rows for each table
    for (const t of tables) {
      const tableName = t.table_name;
      const rows = (await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`)) as any[];
      backupData[tableName] = rows;
    }

    const payload = {
      metadata: {
        database: 'neondb',
        timestamp: new Date().toISOString(),
        backup_version: '1.0.0',
        total_tables: tables.length,
      },
      tables: backupData
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="wealthmanager_backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(payload);
  } catch (err: any) {
    console.error('Error generating JSON backup:', err);
    res.status(500).json({ error: 'Failed to generate backup: ' + err.message });
  }
});

router.get('/backup/csv', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tableName = req.query.table as string;
    if (!tableName) {
      return res.status(400).json({ error: 'Table name is required' });
    }

    // Fetch valid user tables list to prevent SQL injection
    const tables: any[] = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const validTableNames = tables.map((t: any) => t.table_name);
    
    if (!validTableNames.includes(tableName)) {
      return res.status(404).json({ error: 'Table not found or invalid' });
    }

    const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`);

    let csvContent = '';
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      csvContent = [
        headers.join(','),
        ...rows.map(row => 
          headers.map(header => {
            let val = row[header];
            if (val === null || val === undefined) return '';
            if (val instanceof Date) return val.toISOString();
            let valStr = String(val).replace(/"/g, '""');
            if (valStr.includes(',') || valStr.includes('\n') || valStr.includes('"')) {
              valStr = `"${valStr}"`;
            }
            return valStr;
          }).join(',')
        )
      ].join('\n');
    } else {
      csvContent = 'No data available';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="wealthmanager_${tableName}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    console.error('Error generating CSV export:', err);
    res.status(500).json({ error: 'Failed to export table: ' + err.message });
  }
});

export default router;
