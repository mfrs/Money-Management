import { Router, Response } from 'express';
import { prisma } from '../_db.js';
import { authMiddleware, AuthRequest } from '../_middleware.js';

const router = Router();

// GET all asset types for user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let assetTypes = await prisma.assetType.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'asc' }
    });

    // Auto-seed mandatory types if missing (e.g. for users who registered before this feature)
    const hasMandatory = assetTypes.some(t => t.isMandatory);
    if (!hasMandatory) {
      const defaultAssetTypes = [
        { id: 'investment', name: 'Investasi / Saham', isMandatory: true, color: '#6366F1' },
        { id: 'property', name: 'Properti / Rumah', isMandatory: true, color: '#3B82F6' },
        { id: 'vehicle', name: 'Kendaraan', isMandatory: true, color: '#F59E0B' },
        { id: 'gold', name: 'Emas / Logam Mulia', isMandatory: true, color: '#FBBF24' },
        { id: 'other', name: 'Aset Lainnya', isMandatory: true, color: '#EC4899' },
      ];
      await prisma.assetType.createMany({
        data: defaultAssetTypes.map(t => ({ ...t, userId: req.userId! })),
        skipDuplicates: true
      });
      // Re-fetch after seeding
      assetTypes = await prisma.assetType.findMany({
        where: { userId: req.userId! },
        orderBy: { createdAt: 'asc' }
      });
    }

    res.json(assetTypes);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch asset types' });
  }
});

// POST create a new asset type
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, isMandatory, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Missing required asset type fields' });
    }

    const assetType = await prisma.assetType.create({
      data: {
        name,
        isMandatory: isMandatory || false,
        color: color || '#3B82F6',
        userId: req.userId!
      }
    });
    res.status(201).json(assetType);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create asset type' });
  }
});

// POST bulk create asset types (used for migration)
router.post('/bulk', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { types } = req.body;
    if (!Array.isArray(types)) {
      return res.status(400).json({ error: 'Types must be an array' });
    }

    const createdTypes = [];
    for (const t of types) {
      // Create if not exists by name to avoid duplicates
      const existing = await prisma.assetType.findFirst({
        where: { userId: req.userId!, name: t.name }
      });
      if (!existing) {
        const created = await prisma.assetType.create({
          data: {
            id: t.id || undefined, // Allow passing custom ID
            name: t.name,
            isMandatory: t.isMandatory || false,
            color: t.color || '#3B82F6',
            userId: req.userId!
          }
        });
        createdTypes.push(created);
      }
    }
    res.status(201).json(createdTypes);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to bulk create asset types' });
  }
});

// PUT update an asset type
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, color } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;

    const assetType = await prisma.assetType.update({
      where: { id: req.params.id, userId: req.userId! },
      data: updateData
    });
    res.json(assetType);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update asset type' });
  }
});

// DELETE an asset type
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.assetType.delete({
      where: { id: req.params.id, userId: req.userId! }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete asset type' });
  }
});

export default router;
