import { Router } from 'express';
import { z } from 'zod';
import { goalController } from '../controllers/index.js';
import { authenticate, validate } from '../middleware/index.js';

const router = Router();

// Validation schemas
const createGoalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  targetAmount: z.number().positive('Target amount must be positive'),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string().datetime().or(z.date()),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  autoContribute: z.boolean().optional(),
  autoContributeAmount: z.number().positive().optional(),
  autoContributeFrequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
});

const updateGoalSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().datetime().or(z.date()).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
  autoContribute: z.boolean().optional(),
  autoContributeAmount: z.number().positive().optional(),
  autoContributeFrequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
});

const contributionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  note: z.string().max(200).optional(),
});

// Apply authentication to all routes
router.use(authenticate);

// Routes
router.post('/', validate(createGoalSchema), goalController.createGoal);
router.get('/', goalController.getGoals);
router.get('/summary', goalController.getSummary);
router.get('/:id', goalController.getGoal);
router.put('/:id', validate(updateGoalSchema), goalController.updateGoal);
router.post('/:id/contribute', validate(contributionSchema), goalController.addContribution);
router.post('/:id/withdraw', validate(contributionSchema), goalController.withdraw);
router.delete('/:id', goalController.deleteGoal);

export default router;
