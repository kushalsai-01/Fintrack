import { Notification, INotification } from '../models/index.js';
import { NotFoundError } from '../utils/errors.js';
import { cacheDelPattern } from '../config/redis.js';
import { logger } from '../utils/logger.js';

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

    if (filters.isRead !== undefined) {
      query.isRead = filters.isRead;
    }

    if (filters.isArchived !== undefined) {
      query.isArchived = filters.isArchived;
    } else {
      query.isArchived = false; // Default to non-archived
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: filters.userId, isRead: false, isArchived: false }),
    ]);

    return { notifications, total, unreadCount };
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      userId,
      isRead: false,
      isArchived: false,
    });
  }

  // Mark as read
  async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
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
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    await cacheDelPattern(`notifications:${userId}:*`);

    logger.info(`All notifications marked as read for user ${userId}`);
  }

  // Archive notification
  async archive(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isArchived: true, archivedAt: new Date() },
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
      { userId, isArchived: false },
      { isArchived: true, archivedAt: new Date() }
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
      isArchived: true,
      archivedAt: { $lt: cutoffDate },
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
}

export const notificationService = new NotificationService();
