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
 * @desc Get monthly summary. Accepts year/month for a single month, or months for a range.
 */
export const getMonthlySummary = asyncHandler(async (req: Request, res: Response) => {
  const { year, month, months = 12 } = req.query;

  // If specific year/month requested, get that month + previous for comparison
  if (year && month) {
    const summary = await analyticsService.getSingleMonthSummary(
      req.user!._id,
      Number(year),
      Number(month)
    );
    res.json({
      success: true,
      data: { summary },
    });
  } else {
    const summaryList = await analyticsService.getMonthlySummary(
      req.user!._id,
      Number(months)
    );
    res.json({
      success: true,
      data: { summary: summaryList },
    });
  }
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

/**
 * @route GET /api/analytics/categories
 * @desc Get category breakdown
 */
export const getCategoryBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const { months = 6 } = req.query;
  const breakdown = await analyticsService.getCategoryBreakdown(
    req.user!._id,
    Number(months)
  );

  res.json({
    success: true,
    data: { breakdown },
  });
});
