import mongoose from 'mongoose';
import { Bill, IBill, Notification, RecurringTransaction } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { cacheDelPattern } from '../config/redis.js';
import { sendBillReminderEmail } from '../utils/email.js';
import { logger } from '../utils/logger.js';

interface CreateBillInput {
  userId: string;
  name: string;
  amount: number;
  dueDate: Date;
  frequency: 'one-time' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  categoryId?: string;
  autopay?: boolean;
  reminderDays?: number;
  notes?: string;
  website?: string;
}

interface UpdateBillInput {
  id: string;
  userId: string;
  name?: string;
  amount?: number;
  dueDate?: Date;
  frequency?: 'one-time' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  categoryId?: string;
  autopay?: boolean;
  reminderDays?: number;
  status?: 'upcoming' | 'overdue' | 'paid';
  notes?: string;
  website?: string;
  isActive?: boolean;
}

interface PayBillInput {
  billId: string;
  userId: string;
  paidAmount?: number;
  paidDate?: Date;
  paymentMethod?: string;
  notes?: string;
}

export class BillService {
  // Create bill
  async create(input: CreateBillInput): Promise<IBill> {
    const bill = new Bill({
      ...input,
      status: 'upcoming',
    });

    await bill.save();

    await cacheDelPattern(`bills:${input.userId}:*`);

    logger.info(`Bill created: ${bill.name}`);

    return bill;
  }

  // Get bill by ID
  async getById(billId: string, userId: string): Promise<IBill> {
    const bill = await Bill.findOne({
      _id: billId,
      userId,
    }).populate('categoryId');

    if (!bill) {
      throw new NotFoundError('Bill not found');
    }

    return bill;
  }

  // Get all bills for user
  async getAll(
    userId: string,
    status?: 'upcoming' | 'overdue' | 'paid'
  ): Promise<IBill[]> {
    const query: Record<string, unknown> = { userId, isActive: true };

    if (status) {
      query.status = status;
    }

    const bills = await Bill.find(query)
      .populate('categoryId')
      .sort({ dueDate: 1 });

    // Update statuses
    const now = new Date();
    for (const bill of bills) {
      if (bill.status === 'upcoming' && new Date(bill.dueDate) < now) {
        bill.status = 'overdue';
        await bill.save();
      }
    }

    return bills;
  }

  // Get upcoming bills
  async getUpcoming(userId: string, days = 30): Promise<IBill[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const bills = await Bill.find({
      userId,
      isActive: true,
      status: { $in: ['upcoming', 'overdue'] },
      dueDate: { $lte: futureDate },
    })
      .populate('categoryId')
      .sort({ dueDate: 1 });

    return bills;
  }

  // Update bill
  async update(input: UpdateBillInput): Promise<IBill> {
    const { id, userId, ...updateData } = input;

    const bill = await Bill.findOne({ _id: id, userId });
    if (!bill) {
      throw new NotFoundError('Bill not found');
    }

    Object.assign(bill, updateData);
    await bill.save();

    await cacheDelPattern(`bills:${userId}:*`);

    return bill.populate('categoryId');
  }

  // Pay bill
  async payBill(input: PayBillInput): Promise<IBill> {
    const { billId, userId, paidAmount, paidDate, paymentMethod, notes } = input;

    const bill = await Bill.findOne({ _id: billId, userId });
    if (!bill) {
      throw new NotFoundError('Bill not found');
    }

    // Record payment
    bill.paymentHistory.push({
      paidDate: paidDate || new Date(),
      date: new Date(),
      amount: paidAmount || bill.amount,
      note: notes,
    } as any);

    bill.status = 'paid';
    bill.lastPaidDate = paidDate || new Date();

    // Calculate next due date for recurring bills
    if (bill.frequency !== 'once') {
      bill.dueDate = this.calculateNextDueDate(bill.dueDate, bill.frequency);
      bill.status = 'upcoming';
    } else {
      bill.isActive = false;
    }

    await bill.save();

    await cacheDelPattern(`bills:${userId}:*`);

    logger.info(`Bill paid: ${bill.name}`);

    return bill;
  }

  // Delete bill
  async delete(billId: string, userId: string): Promise<void> {
    const bill = await Bill.findOne({ _id: billId, userId });

    if (!bill) {
      throw new NotFoundError('Bill not found');
    }

    await bill.deleteOne();

    await cacheDelPattern(`bills:${userId}:*`);

    logger.info(`Bill deleted: ${billId}`);
  }

  // Get bills summary
  async getSummary(userId: string): Promise<{
    totalUpcoming: number;
    totalOverdue: number;
    upcomingAmount: number;
    overdueAmount: number;
    nextBill: IBill | null;
  }> {
    const bills = await this.getUpcoming(userId, 60);

    const summary = bills.reduce(
      (acc, bill) => {
        if (bill.status === 'overdue') {
          acc.totalOverdue++;
          acc.overdueAmount += bill.amount;
        } else {
          acc.totalUpcoming++;
          acc.upcomingAmount += bill.amount;
        }
        return acc;
      },
      {
        totalUpcoming: 0,
        totalOverdue: 0,
        upcomingAmount: 0,
        overdueAmount: 0,
      }
    );

    const nextBill = bills.find((b) => b.status === 'upcoming') || null;

    return {
      ...summary,
      nextBill,
    };
  }

  // Send bill reminders (for cron job)
  async sendReminders(): Promise<void> {
    const now = new Date();

    const bills = await Bill.find({
      isActive: true,
      status: 'upcoming',
      reminderDays: { $gt: 0 },
    }).populate('userId');

    for (const bill of bills) {
      const daysUntilDue = Math.ceil(
        (new Date(bill.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDue === bill.reminderDays) {
        const user = bill.userId as any;

        // Create notification
        await Notification.create({
          userId: user._id,
          type: 'bill',
          title: 'Bill Due Soon',
          message: `${bill.name} ($${bill.amount}) is due in ${daysUntilDue} day(s)`,
          actionUrl: `/bills/${bill._id}`,
        });

        // Send email
        if (user.preferences?.emailNotifications) {
          await sendBillReminderEmail(
            user.email,
            bill.name,
            bill.amount,
            bill.dueDate
          ).catch((err) => logger.error('Failed to send bill reminder email:', err));
        }

        logger.info(`Bill reminder sent for: ${bill.name}`);
      }
    }
  }

  // Update bill statuses (for cron job)
  async updateStatuses(): Promise<void> {
    const now = new Date();

    await Bill.updateMany(
      {
        isActive: true,
        status: 'upcoming',
        dueDate: { $lt: now },
      },
      { status: 'overdue' }
    );
  }

  // Helper methods
  private calculateNextDueDate(
    currentDueDate: Date,
    frequency: string
  ): Date {
    const nextDate = new Date(currentDueDate);

    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  }
}

export const billService = new BillService();
