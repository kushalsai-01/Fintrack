/**
 * Insights Routes - AI-powered financial insights
 */
import { Router } from 'express';
import { asyncHandler } from '../middleware/index.js';
import { authenticate } from '../middleware/index.js';
import { Request, Response } from 'express';
import { analyticsService } from '../services/index.js';
import axios from 'axios';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /api/insights
 * @desc Get AI-powered financial insights
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get user's financial data
    const dashboard = await analyticsService.getDashboardData(req.user!._id);
    const trends = await analyticsService.getSpendingTrends(req.user!._id, 'month');

    // Call ML service for insights
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8000';
    
    try {
      const mlResponse = await axios.post(`${mlServiceUrl}/insights/generate`, {
        user_id: req.user!._id.toString(),
        income: dashboard.summary.totalIncome,
        expenses: dashboard.summary.totalExpenses,
        savings_rate: dashboard.summary.savingsRate,
        health_score: dashboard.healthScore,
      }, {
        timeout: 5000,
      });

      res.json({
        success: true,
        data: {
          insights: mlResponse.data.insights || [],
          summary: dashboard.summary,
          recommendations: mlResponse.data.recommendations || [],
        },
      });
    } catch (mlError) {
      // Fallback insights if ML service fails
      const fallbackInsights = [
        {
          id: '1',
          type: 'spending',
          title: 'Spending Summary',
          message: `You spent $${dashboard.summary.totalExpenses.toFixed(2)} this month.`,
          severity: 'info',
          actionable: false,
        },
        {
          id: '2',
          type: 'savings',
          title: 'Savings Rate',
          message: `Your savings rate is ${dashboard.summary.savingsRate.toFixed(1)}%. ${dashboard.summary.savingsRate < 20 ? 'Consider increasing your savings.' : 'Great job on saving!'}`,
          severity: dashboard.summary.savingsRate < 20 ? 'warning' : 'success',
          actionable: true,
        },
      ];

      res.json({
        success: true,
        data: {
          insights: fallbackInsights,
          summary: dashboard.summary,
          recommendations: [
            'Track your expenses regularly',
            'Set up automatic savings',
            'Review your subscriptions',
          ],
        },
      });
    }
  } catch (error) {
    console.error('Insights generation error:', error);
    throw error;
  }
}));

export default router;
