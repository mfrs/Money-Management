import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware.js';

const router = Router();

// GET all assets for user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const assets = await prisma.asset.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' }
    });
    res.json(assets);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// POST create a new asset
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, purchasePrice, currentPrice, purchaseDate, estimatedRate, notes } = req.body;
    
    if (!name || !type || purchasePrice === undefined || currentPrice === undefined) {
      return res.status(400).json({ error: 'Missing required asset fields' });
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        type,
        purchasePrice: parseFloat(purchasePrice),
        currentPrice: parseFloat(currentPrice),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        estimatedRate: estimatedRate !== undefined ? parseFloat(estimatedRate) : 0,
        notes: notes || '',
        userId: req.userId!
      }
    });
    res.status(201).json(asset);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// PUT update an asset
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, purchasePrice, currentPrice, purchaseDate, estimatedRate, notes } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (purchasePrice !== undefined) updateData.purchasePrice = parseFloat(purchasePrice);
    if (currentPrice !== undefined) updateData.currentPrice = parseFloat(currentPrice);
    if (purchaseDate !== undefined) updateData.purchaseDate = new Date(purchaseDate);
    if (estimatedRate !== undefined) updateData.estimatedRate = parseFloat(estimatedRate);
    if (notes !== undefined) updateData.notes = notes;

    const asset = await prisma.asset.update({
      where: { id: req.params.id, userId: req.userId! },
      data: updateData
    });
    res.json(asset);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// DELETE an asset
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.asset.delete({
      where: { id: req.params.id, userId: req.userId! }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;
