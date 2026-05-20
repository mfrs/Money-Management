import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware } from '../middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET published changelogs (Public/User)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const changelogs = await prisma.changelog.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(changelogs);
  } catch (error) {
    console.error('Error fetching changelogs:', error);
    res.status(500).json({ error: 'Failed to fetch changelogs' });
  }
});

// GET all changelogs (Admin only)
router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const changelogs = await prisma.changelog.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(changelogs);
  } catch (error) {
    console.error('Error fetching all changelogs:', error);
    res.status(500).json({ error: 'Failed to fetch all changelogs' });
  }
});

// POST a new changelog (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { version, title, content, isPublished, releaseDate } = req.body;
    
    if (!version || !title || !content) {
      return res.status(400).json({ error: 'Version, title, and content are required' });
    }

    const newLog = await prisma.changelog.create({
      data: {
        version,
        title,
        content,
        isPublished: isPublished || false,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
      },
    });

    res.status(201).json(newLog);
  } catch (error) {
    console.error('Error creating changelog:', error);
    res.status(500).json({ error: 'Failed to create changelog' });
  }
});

// PUT (update) a changelog (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { version, title, content, isPublished, releaseDate } = req.body;

    const updatedLog = await prisma.changelog.update({
      where: { id },
      data: {
        version,
        title,
        content,
        isPublished,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
      },
    });

    res.json(updatedLog);
  } catch (error) {
    console.error('Error updating changelog:', error);
    res.status(500).json({ error: 'Failed to update changelog' });
  }
});

// DELETE a changelog (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.changelog.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting changelog:', error);
    res.status(500).json({ error: 'Failed to delete changelog' });
  }
});

export default router;
