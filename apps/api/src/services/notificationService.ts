import { Notification, INotification } from '../models/index.js';
import { NotFoundError } from '../utils/errors.js';
import { cacheDelPattern } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { emitNotification, emitToUser } from '../utils/socket.js';

interface CreateNotificationInput {
  userId: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'bill' | 'goal' | 'achievement' | 'insight' | 'anomaly';
  title: string;
  message: string;
  actionUrl?: string;
  expiresAt?: Date;
}

interface NotificationFilters {
  userId: string;
  type?: string;
  isRead?: boolean;
  isArchived?: boolean;
}

export class NotificationService {
  // Create notification
  async create(input: CreateNotificationInput): Promise<INotification> {
    const notification = new Notification(input);
    await notification.save();

    // Real-time delivery to the user.
    emitNotification(input.userId, typeof (notification as any).toJSON === 'function' ? (notification as any).toJSON() : notification);

    // Additional domain-specific events for the UI.
    if (input.type === 'warning' && input.actionUrl?.startsWith('/budgets/')) {
      const budgetId = input.actionUrl.split('/')[2];
      emitToUser(input.userId, 'budget:alert', { notification: notification.toJSON(), budgetId });
    }
    if (input.type === 'goal' && input.actionUrl?.startsWith('/goals/')) {
      const goalId = input.actionUrl.split('/')[2];
      emitToUser(input.userId, 'goal:milestone', { notification: notification.toJSON(), goalId });
    }

    await cacheDelPattern(`notifications:${input.userId}:*`);

    logger.debug(`Notification created for user ${input.userId}: ${input.title}`);

    return notification;
  }

  // Create multiple notifications
  async createMany(inputs: CreateNotificationInput[]): Promise<any[]> {
    const notifications = await Notification.insertMany(inputs);

    // Clear cache for all affected users
    const userIds = [...new Set(inputs.map((i) => i.userId))];
    for (const userId of userIds) {
      await cacheDelPattern(`notifications:${userId}:*`);
    }

    return notifications;
  }

  // Get notification by ID
  async getById(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return notification;
  }

  // Get all notifications for user
  async getAll(
    filters: NotificationFilters,
    limit = 50,
    offset = 0
  ): Promise<{ notifications: INotification[]; total: number; unreadCount: number }> {
    const query: Record<string, unknown> = { userId: filters.userId };

    if (filters.type) {
      query.type = filters.type;
    }

    // Backend model uses `read` and `archived` (not `isRead` / `isArchived`)
    if (filters.isRead !== undefined) query.read = filters.isRead;
    if (filters.isArchived !== undefined) query.archived = filters.isArchived;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: filters.userId, read: false, archived: false }),
    ]);

    return { notifications, total, unreadCount };
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      userId,
      read: false,
      archived: false,
    });
  }

  // Mark as read
  async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    await cacheDelPattern(`notifications:${userId}:*`);

    return notification;
  }

  // Mark all as read
  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );

    await cacheDelPattern(`notifications:${userId}:*`);

    logger.info(`All notifications marked as read for user ${userId}`);
  }

  // Archive notification
  async archive(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { archived: true },
      { new: true }
    );

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    await cacheDelPattern(`notifications:${userId}:*`);

    return notification;
  }

  // Archive all
  async archiveAll(userId: string): Promise<void> {
    await Notification.updateMany(
      { userId, archived: false },
      { archived: true }
    );

    await cacheDelPattern(`notifications:${userId}:*`);
  }

  // Delete notification
  async delete(notificationId: string, userId: string): Promise<void> {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    await cacheDelPattern(`notifications:${userId}:*`);
  }

  // Delete old notifications (for cron job)
  async deleteOld(daysOld = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Notification.deleteMany({
      archived: true,
      // Schema does not define archivedAt, so we approximate using createdAt.
      createdAt: { $lt: cutoffDate },
    });

    logger.info(`Deleted ${result.deletedCount} old notifications`);

    return result.deletedCount;
  }

  // Cleanup expired notifications (for cron job)
  async cleanupExpired(): Promise<number> {
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    if (result.deletedCount > 0) {
      logger.info(`Deleted ${result.deletedCount} expired notifications`);
    }

    return result.deletedCount;
  }

  // Clear all notifications for user
  async clearAll(userId: string): Promise<number> {
    const result = await Notification.deleteMany({ userId });
    await cacheDelPattern(`notifications:${userId}:*`);
    return result.deletedCount || 0;
  }
}

export const notificationService = new NotificationService();
