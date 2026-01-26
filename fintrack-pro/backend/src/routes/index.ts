import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import transactionRoutes from './transactions.js';
import categoryRoutes from './categories.js';
import budgetRoutes from './budgets.js';
import goalRoutes from './goals.js';
import billRoutes from './bills.js';
import investmentRoutes from './investments.js';
import debtRoutes from './debts.js';
import notificationRoutes from './notifications.js';
import analyticsRoutes from './analytics.js';
import healthRoutes from './health.js';
import forecastRoutes from './forecast.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'FinTrack Pro API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/categories', categoryRoutes);
router.use('/budgets', budgetRoutes);
router.use('/goals', goalRoutes);
router.use('/bills', billRoutes);
router.use('/investments', investmentRoutes);
router.use('/debts', debtRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/health', healthRoutes);
router.use('/forecast', forecastRoutes);

export default router;
