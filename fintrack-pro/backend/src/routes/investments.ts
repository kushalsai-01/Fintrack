import { Router } from 'express';
import { z } from 'zod';
import { investmentController } from '../controllers/index.js';
import { authenticate, validate } from '../middleware/index.js';

const router = Router();

// Validation schemas
const createInvestmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['stock', 'etf', 'mutual_fund', 'crypto', 'bond', 'real_estate', 'other']),
  symbol: z.string().max(20).optional(),
  shares: z.number().positive('Shares must be positive'),
  purchasePrice: z.number().positive('Purchase price must be positive'),
  currentPrice: z.number().positive('Current price must be positive'),
  purchaseDate: z.string().datetime().or(z.date()),
  notes: z.string().max(500).optional(),
});

const updateInvestmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  shares: z.number().positive().optional(),
  currentPrice: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

const buySharesSchema = z.object({
  shares: z.number().positive('Shares must be positive'),
  pricePerShare: z.number().positive('Price must be positive'),
  date: z.string().datetime().or(z.date()).optional(),
});

const sellSharesSchema = z.object({
  shares: z.number().positive('Shares must be positive'),
  salePrice: z.number().positive('Sale price must be positive'),
});

// Apply authentication to all routes
router.use(authenticate);

// Routes
router.post('/', validate(createInvestmentSchema), investmentController.createInvestment);
router.get('/', investmentController.getInvestments);
router.get('/portfolio', investmentController.getPortfolio);
router.get('/:id', investmentController.getInvestment);
router.get('/:id/history', investmentController.getPriceHistory);
router.put('/:id', validate(updateInvestmentSchema), investmentController.updateInvestment);
router.post('/:id/buy', validate(buySharesSchema), investmentController.buyShares);
router.post('/:id/sell', validate(sellSharesSchema), investmentController.sellShares);
router.delete('/:id', investmentController.deleteInvestment);

export default router;
