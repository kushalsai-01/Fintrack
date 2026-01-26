import { Request, Response } from 'express';
import { analyticsService } from '../services/index.js';
import { asyncHandler } from '../middleware/index.js';

/**
 * @route GET /api/analytics/dashboard
 * @desc Get dashboard data
 */
export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getDashboardData(req.user!._id);

  res.json({
    success: true,
    data,
  });
});

/**
 * @route GET /api/analytics/monthly
 * @desc Get monthly summary
 */
export const getMonthlySummary = asyncHandler(async (req: Request, res: Response) => {
  const { months = 12 } = req.query;

  const summary = await analyticsService.getMonthlySummary(
    req.user!._id,
    Number(months)
  );

  res.json({
    success: true,
    data: { summary },
  });
});

/**
 * @route GET /api/analytics/trends
 * @desc Get spending trends
 */
export const getTrends = asyncHandler(async (req: Request, res: Response) => {
  const { period = 'month' } = req.query;

  const trends = await analyticsService.getSpendingTrends(
    req.user!._id,
    period as 'week' | 'month' | 'quarter' | 'year'
  );

  res.json({
    success: true,
    data: { trends },
  });
});

/**
 * @route GET /api/analytics/health
 * @desc Get financial health score
 */
export const getHealthScore = asyncHandler(async (req: Request, res: Response) => {
  const health = await analyticsService.getFinancialHealth(req.user!._id);

  res.json({
    success: true,
    data: { health },
  });
});
