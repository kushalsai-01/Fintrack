import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { budgetService, billService, goalService, notificationService, recurringTransactionService } from '../services/index.js';

export const scheduleJobs = (): void => {
  // Process recurring transactions - Daily at 1:00 AM
  cron.schedule('0 1 * * *', async () => {
    logger.info('Running recurring transactions job...');
    try {
      const count = await recurringTransactionService.processRecurring();
      logger.info(`Processed ${count} recurring transactions`);
    } catch (error) {
      logger.error('Recurring transactions job failed:', error);
    }
  });

  // Send bill reminders - Daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    logger.info('Running bill reminders job...');
    try {
      await billService.sendReminders();
      logger.info('Bill reminders sent');
    } catch (error) {
      logger.error('Bill reminders job failed:', error);
    }
  });

  // Update bill statuses - Every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await billService.updateStatuses();
    } catch (error) {
      logger.error('Bill status update job failed:', error);
    }
  });

  // Process goal auto-contributions - Daily at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    logger.info('Running goal auto-contributions job...');
    try {
      await goalService.processAutoContributions();
      logger.info('Goal auto-contributions processed');
    } catch (error) {
      logger.error('Goal auto-contributions job failed:', error);
    }
  });

  // Rollover budgets - Daily at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running budget rollover job...');
    try {
      await budgetService.rolloverBudgets();
      logger.info('Budget rollover completed');
    } catch (error) {
      logger.error('Budget rollover job failed:', error);
    }
  });

  // Cleanup expired notifications - Daily at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    logger.info('Running notification cleanup job...');
    try {
      const expiredCount = await notificationService.cleanupExpired();
      const oldCount = await notificationService.deleteOld(30);
      logger.info(`Cleaned up ${expiredCount} expired and ${oldCount} old notifications`);
    } catch (error) {
      logger.error('Notification cleanup job failed:', error);
    }
  });

  logger.info('Cron jobs scheduled');
};
