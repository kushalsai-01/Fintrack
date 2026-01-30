import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticate } from '../middleware/index.js';
import { getForecast, isMLServiceHealthy } from '../utils/mlService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Forward forecast requests to ML service
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const { forecastType = '30day' } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    // Check if ML service is healthy
    if (!isMLServiceHealthy()) {
      return res.status(503).json({
        success: false,
        error: { 
          code: 'ML_SERVICE_UNAVAILABLE', 
          message: 'ML service is temporarily unavailable',
        },
        data: null,
      });
    }

    const days = forecastType === '7day' ? 7 : forecastType === '14day' ? 14 : 30;
    const result = await getForecast(userId, days);

    if (!result.success) {
      return res.status(503).json({
        success: false,
        error: result.error,
        data: null,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Forecast /latest error:', error);
    res.status(500).json({
      success: false,
      error: { 
        code: 'FORECAST_ERROR', 
        message: 'Failed to generate forecast',
      },
      data: null,
    });
  }
});

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { days = 30 } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    // Validate days parameter
    if (typeof days !== 'number' || days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DAYS', message: 'Days must be between 1 and 365' },
      });
    }

    const result = await getForecast(userId, days);

    if (!result.success) {
      return res.status(503).json({
        success: false,
        error: result.error,
        data: null,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Forecast /generate error:', error);
    res.status(500).json({
      success: false,
      error: { 
        code: 'FORECAST_ERROR', 
        message: 'Failed to generate forecast',
      },
      data: null,
    });
  }
});

export default router;
