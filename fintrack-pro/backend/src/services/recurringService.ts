import mongoose from 'mongoose';
import { RecurringTransaction, IRecurringTransaction, Transaction } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { cacheDelPattern } from '../config/redis.js';
import { logger } from '../utils/logger.js';

interface CreateRecurringInput {
  userId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  merchant?: string;
  notes?: string;
  tags?: string[];
}

interface UpdateRecurringInput {
  id: string;
  userId: string;
  amount?: number;
  description?: string;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  endDate?: Date;
  merchant?: string;
  notes?: string;
  tags?: string[];
  isActive?: boolean;
}

export class RecurringTransactionService {
  // Create recurring transaction
  async create(input: CreateRecurringInput): Promise<IRecurringTransaction> {
    const nextOccurrence = this.calculateNextOccurrence(input.startDate, input.frequency);

    const recurring = new RecurringTransaction({
      ...input,
      nextOccurrence,
      isActive: true,
    });

    await recurring.save();

    await cacheDelPattern(`recurring:${input.userId}:*`);

    logger.info(`Recurring transaction created: ${recurring.description}`);

    return recurring;
  }

  // Get recurring transaction by ID
  async getById(recurringId: string, userId: string): Promise<IRecurringTransaction> {
    const recurring = await RecurringTransaction.findOne({
      _id: recurringId,
      userId,
    }).populate('categoryId');

    if (!recurring) {
      throw new NotFoundError('Recurring transaction not found');
    }

    return recurring;
  }

  // Get all recurring transactions for user
  async getAll(userId: string, includeInactive = false): Promise<IRecurringTransaction[]> {
    const query: Record<string, unknown> = { userId };

    if (!includeInactive) {
      query.isActive = true;
    }

    const recurring = await RecurringTransaction.find(query)
      .populate('categoryId')
      .sort({ nextOccurrence: 1 });

    return recurring;
  }

  // Update recurring transaction
  async update(input: UpdateRecurringInput): Promise<IRecurringTransaction> {
    const { id, userId, ...updateData } = input;

    const recurring = await RecurringTransaction.findOne({ _id: id, userId });
    if (!recurring) {
      throw new NotFoundError('Recurring transaction not found');
    }

    // Recalculate next occurrence if frequency changed
    if (updateData.frequency && updateData.frequency !== recurring.frequency) {
      recurring.nextOccurrence = this.calculateNextOccurrence(
        new Date(),
        updateData.frequency
      );
    }

    Object.assign(recurring, updateData);
    await recurring.save();

    await cacheDelPattern(`recurring:${userId}:*`);

    return recurring.populate('categoryId');
  }

  // Delete recurring transaction
  async delete(recurringId: string, userId: string): Promise<void> {
    const recurring = await RecurringTransaction.findOne({
      _id: recurringId,
      userId,
    });

    if (!recurring) {
      throw new NotFoundError('Recurring transaction not found');
    }

    await recurring.deleteOne();

    await cacheDelPattern(`recurring:${userId}:*`);

    logger.info(`Recurring transaction deleted: ${recurringId}`);
  }

  // Pause recurring transaction
  async pause(recurringId: string, userId: string): Promise<IRecurringTransaction> {
    const recurring = await RecurringTransaction.findOne({
      _id: recurringId,
      userId,
    });

    if (!recurring) {
      throw new NotFoundError('Recurring transaction not found');
    }

    recurring.isActive = false;
    await recurring.save();

    await cacheDelPattern(`recurring:${userId}:*`);

    return recurring;
  }

  // Resume recurring transaction
  async resume(recurringId: string, userId: string): Promise<IRecurringTransaction> {
    const recurring = await RecurringTransaction.findOne({
      _id: recurringId,
      userId,
    });

    if (!recurring) {
      throw new NotFoundError('Recurring transaction not found');
    }

    recurring.isActive = true;
    recurring.nextOccurrence = this.calculateNextOccurrence(new Date(), recurring.frequency);
    await recurring.save();

    await cacheDelPattern(`recurring:${userId}:*`);

    return recurring;
  }

  // Process recurring transactions (for cron job)
  async processRecurring(): Promise<number> {
    const now = new Date();
    let count = 0;

    const recurringTransactions = await RecurringTransaction.find({
      isActive: true,
      autoCreate: true,
      nextOccurrence: { $lte: now },
      $or: [{ endDate: null }, { endDate: { $gte: now } }],
    });

    for (const recurring of recurringTransactions) {
      try {
        // Create the transaction
        const transaction = new Transaction({
          userId: recurring.userId,
          categoryId: recurring.categoryId,
          type: recurring.type,
          amount: recurring.amount,
          description: recurring.description,
          date: recurring.nextOccurrence,
          merchant: recurring.merchant,
          notes: recurring.notes,
          tags: recurring.tags,
          isRecurring: true,
          recurringId: recurring._id,
        });

        await transaction.save();

        // Update recurring transaction
        recurring.lastCreated = recurring.nextOccurrence;
        recurring.nextOccurrence = this.calculateNextOccurrence(
          recurring.nextOccurrence,
          recurring.frequency
        );

        // Check if end date reached
        if (recurring.endDate && recurring.nextOccurrence > recurring.endDate) {
          recurring.isActive = false;
        }

        await recurring.save();

        count++;
        logger.info(`Created recurring transaction: ${recurring.description}`);
      } catch (error) {
        logger.error(`Failed to create recurring transaction ${recurring._id}:`, error);
      }
    }

    if (count > 0) {
      logger.info(`Processed ${count} recurring transactions`);
    }

    return count;
  }

  // Detect recurring patterns in transactions (ML feature)
  async detectPatterns(userId: string): Promise<{
    suggestions: {
      description: string;
      amount: number;
      frequency: string;
      confidence: number;
      transactions: string[];
    }[];
  }> {
    // Get last 6 months of transactions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: sixMonthsAgo },
      isRecurring: false,
    }).sort({ date: 1 });

    // Group by similar amounts and descriptions
    const groups = new Map<
      string,
      { transactions: any[]; dates: Date[]; amount: number }
    >();

    for (const t of transactions) {
      // Create a key based on rounded amount and normalized description
      const key = `${Math.round(t.amount / 10) * 10}_${t.description
        .toLowerCase()
        .replace(/\s+/g, '_')
        .slice(0, 20)}`;

      const group = groups.get(key) || {
        transactions: [],
        dates: [],
        amount: t.amount,
      };

      group.transactions.push(t);
      group.dates.push(t.date);
      groups.set(key, group);
    }

    // Analyze patterns
    const suggestions: {
      description: string;
      amount: number;
      frequency: string;
      confidence: number;
      transactions: string[];
    }[] = [];

    for (const [, group] of groups) {
      if (group.transactions.length < 3) continue;

      // Calculate intervals between transactions
      const intervals: number[] = [];
      for (let i = 1; i < group.dates.length; i++) {
        const days = Math.round(
          (group.dates[i].getTime() - group.dates[i - 1].getTime()) /
            (1000 * 60 * 60 * 24)
        );
        intervals.push(days);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance =
        intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) /
        intervals.length;
      const stdDev = Math.sqrt(variance);

      // Determine frequency if pattern is consistent (low std dev)
      if (stdDev < avgInterval * 0.3) {
        let frequency: string;
        if (avgInterval <= 3) frequency = 'daily';
        else if (avgInterval <= 10) frequency = 'weekly';
        else if (avgInterval <= 18) frequency = 'biweekly';
        else if (avgInterval <= 35) frequency = 'monthly';
        else if (avgInterval <= 100) frequency = 'quarterly';
        else frequency = 'yearly';

        const confidence = Math.max(
          0,
          Math.min(100, 100 - (stdDev / avgInterval) * 100)
        );

        if (confidence >= 60) {
          suggestions.push({
            description: group.transactions[0].description,
            amount: Math.round(
              group.transactions.reduce((s, t) => s + t.amount, 0) /
                group.transactions.length
            ),
            frequency,
            confidence: Math.round(confidence),
            transactions: group.transactions.map((t) => t._id.toString()),
          });
        }
      }
    }

    return {
      suggestions: suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 10),
    };
  }

  // Helper methods
  private calculateNextOccurrence(fromDate: Date, frequency: string): Date {
    const next = new Date(fromDate);

    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }
}

export const recurringTransactionService = new RecurringTransactionService();
