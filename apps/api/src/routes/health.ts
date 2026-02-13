/**
 * Financial Health Routes (formerly /api/health, now /api/financial-health)
 * Handles user's financial health score calculations
 */
import { Router } from 'express';
import { analyticsController } from '../controllers/index.js';
import { authenticate } from '../middleware/index.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Financial health score routes
router.get('/latest', analyticsController.getHealthScore);
router.get('/history', analyticsController.getHealthScore);
router.post('/compute', analyticsController.getHealthScore);

export default router;
