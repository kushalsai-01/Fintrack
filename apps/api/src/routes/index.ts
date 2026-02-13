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
import mongoose from 'mongoose';
import { redis } from '../config/redis.js';

const router = Router();

// Service health check endpoint (for Docker healthcheck)
router.get('/health', async (_req, res) => {
  try {
    const health = {
      success: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      mongodb: false,
      redis: false
    };

    // Check MongoDB
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        health.mongodb = true;
      }
    } catch (error) {
      console.error('MongoDB health check failed:', error);
    }

    // Check Redis
    try {
      if (redis) {
        await redis.ping();
        health.redis = true;
      }
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    // Return 200 if at least MongoDB is healthy (Redis is optional)
    const isHealthy = health.mongodb;
    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
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
// Compatibility route - redirect old health endpoint to financial-health
router.use('/health', financialHealthRoutes);
router.use('/forecast', forecastRoutes);
router.use('/insights', insightsRoutes);
router.use('/reports', reportsRoutes);

export default router;
