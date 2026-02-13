import { Router } from 'express';
import { analyticsController } from '../controllers/index.js';
import { authenticate } from '../middleware/index.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Routes
router.get('/dashboard', analyticsController.getDashboard);
router.get('/monthly', analyticsController.getMonthlySummary);
router.get('/trends', analyticsController.getTrends);
router.get('/health', analyticsController.getHealthScore);
router.get('/categories', analyticsController.getCategoryBreakdown);

export default router;
