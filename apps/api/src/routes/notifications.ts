import { Router } from 'express';
import { notificationController } from '../controllers/index.js';
import { authenticate } from '../middleware/index.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Routes - static routes first, then parameterized
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/archive-all', notificationController.archiveAll);
router.get('/:id', notificationController.getNotification);
router.put('/:id/read', notificationController.markAsRead);
router.put('/:id/archive', notificationController.archive);
router.delete('/:id', notificationController.deleteNotification);

export default router;
