import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticate } from '../middleware/index.js';
import axios from 'axios';
import config from '../config/index.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Forward forecast requests to ML service
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const { forecastType = '30day' } = req.query;
    const userId = req.user?.userId;

    // Call ML service
    const mlUrl = config.mlService.url || 'http://localhost:8000';
    const response = await axios.post(`${mlUrl}/forecast/balance`, {
      user_id: userId,
      days: forecastType === '7day' ? 7 : forecastType === '14day' ? 14 : 30,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        predictions: [],
        confidence: 0.5,
      },
    });
  }
});

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { days = 30 } = req.body;

    const mlUrl = config.mlService.url || 'http://localhost:8000';
    const response = await axios.post(`${mlUrl}/forecast/balance`, {
      user_id: userId,
      days,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        predictions: [],
        confidence: 0.5,
      },
    });
  }
});

export default router;
