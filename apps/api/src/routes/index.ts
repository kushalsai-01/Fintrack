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
import financialHealthRoutes from './health.js';
import forecastRoutes from './forecast.js';
import insightsRoutes from './insights.js';
import reportsRoutes from './reports.js';
import aiRoutes from './ai.js';
import mongoose from 'mongoose';
import { redis } from '../config/redis.js';
import axios from 'axios';

const router = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8001';

// Deep health check endpoint (for Docker healthcheck + monitoring)
router.get('/health', async (_req, res) => {
  const checks: Record<string, string> = {
    api: 'ok',
    mongodb: 'unknown',
    redis: 'unknown',
    ml_service: 'unknown',
  };

  // Check MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      checks.mongodb = 'ok';
    } else {
      checks.mongodb = 'disconnected';
    }
  } catch {
    checks.mongodb = 'error';
  }

  // Check Redis
  try {
    if (redis) {
      await redis.ping();
      checks.redis = 'ok';
    } else {
      checks.redis = 'unavailable';
    }
  } catch {
    checks.redis = 'error';
  }

  // Check ML Service
  try {
    await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 2000 });
    checks.ml_service = 'ok';
  } catch {
    checks.ml_service = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
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
router.use('/financial-health', financialHealthRoutes);
router.use('/forecast', forecastRoutes);
router.use('/insights', insightsRoutes);
router.use('/reports', reportsRoutes);
router.use('/ai', aiRoutes);

export default router;
