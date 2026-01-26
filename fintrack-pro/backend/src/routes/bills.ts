import { Router } from 'express';
import { z } from 'zod';
import { billController } from '../controllers/index.js';
import { authenticate, validate } from '../middleware/index.js';

const router = Router();

// Validation schemas
const createBillSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  dueDate: z.string().datetime().or(z.date()),
  frequency: z.enum(['one-time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  categoryId: z.string().optional(),
  autopay: z.boolean().optional(),
  reminderDays: z.number().min(0).max(30).optional(),
  notes: z.string().max(500).optional(),
  website: z.string().url().optional(),
});

const updateBillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().datetime().or(z.date()).optional(),
  frequency: z.enum(['one-time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).optional(),
  categoryId: z.string().optional(),
  autopay: z.boolean().optional(),
  reminderDays: z.number().min(0).max(30).optional(),
  status: z.enum(['upcoming', 'overdue', 'paid']).optional(),
  notes: z.string().max(500).optional(),
  website: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

const payBillSchema = z.object({
  paidAmount: z.number().positive().optional(),
  paidDate: z.string().datetime().or(z.date()).optional(),
  paymentMethod: z.string().max(50).optional(),
  notes: z.string().max(200).optional(),
});

// Apply authentication to all routes
router.use(authenticate);

// Routes
router.post('/', validate(createBillSchema), billController.createBill);
router.get('/', billController.getBills);
router.get('/upcoming', billController.getUpcoming);
router.get('/summary', billController.getSummary);
router.get('/:id', billController.getBill);
router.put('/:id', validate(updateBillSchema), billController.updateBill);
router.post('/:id/pay', validate(payBillSchema), billController.payBill);
router.delete('/:id', billController.deleteBill);

export default router;
