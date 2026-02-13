import { Router } from 'express';
import { z } from 'zod';
import { categoryController } from '../controllers/index.js';
import { authenticate, validate } from '../middleware/index.js';

const router = Router();

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  type: z.enum(['income', 'expense']),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  budgetLimit: z.number().positive().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  budgetLimit: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

// Apply authentication to all routes
router.use(authenticate);

// Routes
router.post('/', validate(createCategorySchema), categoryController.createCategory);
router.get('/', categoryController.getCategories);
router.get('/breakdown', categoryController.getBreakdown);
router.get('/:id', categoryController.getCategory);
router.put('/:id', validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
