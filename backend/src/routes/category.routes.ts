import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Get all top-level categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        parentCategoryId: null,
      },
      include: {
        childCategories: true,
        _count: {
          select: { listings: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// Get all categories (including nested)
router.get('/all', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// Get category by slug
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        childCategories: true,
        listings: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

export const categoryRoutes = router;