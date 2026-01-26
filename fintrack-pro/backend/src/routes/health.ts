import { Router } from 'express';
import { analyticsController } from '../controllers/index.js';
import { authenticate } from '../middleware/index.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Health score routes
router.get('/latest', analyticsController.getHealthScore);
router.get('/history', analyticsController.getHealthScore);
router.post('/compute', analyticsController.getHealthScore);

export default router;
