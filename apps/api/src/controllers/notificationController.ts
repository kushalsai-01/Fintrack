import { Request, Response } from 'express';
import { notificationService } from '../services/index.js';
import { asyncHandler } from '../middleware/index.js';

/**
 * @route GET /api/notifications
 * @desc Get all notifications
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { type, isRead, isArchived, limit = 50, offset = 0 } = req.query;

  const result = await notificationService.getAll(
    {
      userId: req.user!._id,
      type: type as string | undefined,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      isArchived: isArchived !== undefined ? isArchived === 'true' : undefined,
    },
    Number(limit),
    Number(offset)
  );

  res.json({
    success: true,
    data: result,
  });
});

/**
 * @route GET /api/notifications/unread-count
 * @desc Get unread notification count
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await notificationService.getUnreadCount(req.user!._id);

  res.json({
    success: true,
    data: { count },
  });
});

/**
 * @route GET /api/notifications/:id
 * @desc Get notification by ID
 */
export const getNotification = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.getById(
    req.params.id,
    req.user!._id
  );

  res.json({
    success: true,
    data: { notification },
  });
});

/**
 * @route PUT /api/notifications/:id/read
 * @desc Mark notification as read
 */
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markAsRead(
    req.params.id,
    req.user!._id
  );

  res.json({
    success: true,
    data: { notification },
  });
});

/**
 * @route PUT /api/notifications/read-all
 * @desc Mark all notifications as read
 */
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllAsRead(req.user!._id);

  res.json({
    success: true,
    message: 'All notifications marked as read',
  });
});

/**
 * @route PUT /api/notifications/:id/archive
 * @desc Archive notification
 */
export const archive = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.archive(
    req.params.id,
    req.user!._id
  );

  res.json({
    success: true,
    data: { notification },
  });
});

/**
 * @route PUT /api/notifications/archive-all
 * @desc Archive all notifications
 */
export const archiveAll = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.archiveAll(req.user!._id);

  res.json({
    success: true,
    message: 'All notifications archived',
  });
});

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete notification
 */
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.delete(req.params.id, req.user!._id);

  res.json({
    success: true,
    message: 'Notification deleted',
  });
});
