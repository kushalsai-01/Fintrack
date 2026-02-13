import { Router } from 'express';
import { z } from 'zod';
import { transactionController } from '../controllers/index.js';
import { authenticate, validate } from '../middleware/index.js';

const router = Router();

// Validation schemas
const createTransactionSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required').max(200),
  date: z.string().datetime().or(z.date()),
  merchant: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
  recurringId: z.string().optional(),
  receiptUrl: z.string().url().optional(),
});

const updateTransactionSchema = createTransactionSchema.partial();

// Apply authentication to all routes
router.use(authenticate);

// Routes
router.post('/', validate(createTransactionSchema), transactionController.createTransaction);
router.get('/', transactionController.getTransactions);
router.get('/summary', transactionController.getSummary);
router.get('/:id', transactionController.getTransaction);
router.put('/:id', validate(updateTransactionSchema), transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

export default router;
