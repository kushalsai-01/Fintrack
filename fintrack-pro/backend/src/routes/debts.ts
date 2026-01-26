import { Router } from 'express';
import { z } from 'zod';
import { debtController } from '../controllers/index.js';
import { authenticate, validate } from '../middleware/index.js';

const router = Router();

// Validation schemas
const createDebtSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['credit_card', 'personal_loan', 'student_loan', 'mortgage', 'car_loan', 'medical', 'other']),
  originalBalance: z.number().positive('Original balance must be positive'),
  currentBalance: z.number().min(0, 'Current balance cannot be negative'),
  interestRate: z.number().min(0).max(100),
  minimumPayment: z.number().min(0),
  dueDate: z.string().datetime().or(z.date()),
  lender: z.string().max(100).optional(),
  accountNumber: z.string().max(50).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  notes: z.string().max(500).optional(),
});

const updateDebtSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currentBalance: z.number().min(0).optional(),
  interestRate: z.number().min(0).max(100).optional(),
  minimumPayment: z.number().min(0).optional(),
  dueDate: z.string().datetime().or(z.date()).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['active', 'paid_off', 'defaulted']).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

const paymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  date: z.string().datetime().or(z.date()).optional(),
  note: z.string().max(200).optional(),
});

// Apply authentication to all routes
router.use(authenticate);

// Routes
router.post('/', validate(createDebtSchema), debtController.createDebt);
router.get('/', debtController.getDebts);
router.get('/summary', debtController.getSummary);
router.get('/payoff-plan', debtController.getPayoffPlan);
router.get('/:id', debtController.getDebt);
router.put('/:id', validate(updateDebtSchema), debtController.updateDebt);
router.post('/:id/payment', validate(paymentSchema), debtController.makePayment);
router.delete('/:id', debtController.deleteDebt);

export default router;
