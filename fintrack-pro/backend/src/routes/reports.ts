/**
 * Reports Routes - Financial reports and exports
 */
import { Router } from 'express';
import { asyncHandler } from '../middleware/index.js';
import { authenticate } from '../middleware/index.js';
import { Request, Response } from 'express';
import { analyticsService } from '../services/index.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /api/reports
 * @desc Get available reports
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { type, startDate, endDate } = req.query;

  // Get monthly summary as default report
  const monthlySummary = await analyticsService.getMonthlySummary(req.user!._id, 12);
  const categoryBreakdown = await analyticsService.getCategoryBreakdown(req.user!._id, 6);

  res.json({
    success: true,
    data: {
      reports: [
        {
          id: 'monthly-summary',
          name: 'Monthly Summary',
          type: 'summary',
          data: monthlySummary,
        },
        {
          id: 'category-breakdown',
          name: 'Category Breakdown',
          type: 'breakdown',
          data: categoryBreakdown,
        },
      ],
    },
  });
}));

/**
 * @route GET /api/reports/:id
 * @desc Get specific report by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  let reportData;
  
  switch (id) {
    case 'monthly-summary':
      reportData = await analyticsService.getMonthlySummary(req.user!._id, 12);
      break;
    case 'category-breakdown':
      reportData = await analyticsService.getCategoryBreakdown(req.user!._id, 6);
      break;
    default:
      throw new Error('Report not found');
  }

  res.json({
    success: true,
    data: {
      report: {
        id,
        data: reportData,
        generatedAt: new Date().toISOString(),
      },
    },
  });
}));

export default router;
