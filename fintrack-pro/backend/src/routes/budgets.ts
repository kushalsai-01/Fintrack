import { Router } from 'express';
import { z } from 'zod';
import { budgetController } from '../controllers/index.js';
import { authenticate, validate } from '../middleware/index.js';

const router = Router();

// Validation schemas
const createBudgetSchema = z.object({
  categoryId: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
  alertThreshold: z.number().min(0).max(100).optional(),
  alertEnabled: z.boolean().optional(),
  rollover: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

const updateBudgetSchema = z.object({
  amount: z.number().positive().optional(),
  alertThreshold: z.number().min(0).max(100).optional(),
  alertEnabled: z.boolean().optional(),
  rollover: z.boolean().optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

// Apply authentication to all routes
router.use(authenticate);

// Routes
router.post('/', validate(createBudgetSchema), budgetController.createBudget);
router.get('/', budgetController.getBudgets);
router.get('/active', budgetController.getActiveBudgets);
router.get('/summary', budgetController.getSummary);
router.get('/:id', budgetController.getBudget);
router.put('/:id', validate(updateBudgetSchema), budgetController.updateBudget);
router.delete('/:id', budgetController.deleteBudget);

export default router;
