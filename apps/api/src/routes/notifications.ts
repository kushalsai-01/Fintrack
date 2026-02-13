import { Router } from 'express';
import { notificationController } from '../controllers/index.js';
import { authenticate } from '../middleware/index.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Routes
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/:id', notificationController.getNotification);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/archive', notificationController.archive);
router.put('/archive-all', notificationController.archiveAll);
router.delete('/:id', notificationController.deleteNotification);

export default router;
