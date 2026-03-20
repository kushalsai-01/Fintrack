import mongoose from 'mongoose';
import { Budget, IBudget, Transaction, Category, Notification } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { cacheDelPattern } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { getStartOfMonth, getEndOfMonth } from '../utils/index.js';

interface CreateBudgetInput {
  userId: string;
  categoryId?: string;
  name: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate?: Date;
  endDate?: Date;
  alertThreshold?: number;
  alertEnabled?: boolean;
  rollover?: boolean;
  notes?: string;
}

interface UpdateBudgetInput {
  id: string;
  userId: string;
  amount?: number;
  alertThreshold?: number;
  alertEnabled?: boolean;
  rollover?: boolean;
  notes?: string;
  isActive?: boolean;
}

export class BudgetService {
  // Create budget
  async create(input: CreateBudgetInput): Promise<IBudget> {
    const {
      userId,
      categoryId,
      name,
      amount,
      period,
      startDate,
      endDate,
      ...rest
    } = input;

    // Verify category if provided
    if (categoryId) {
      const category = await Category.findOne({
        _id: categoryId,
        userId,
        type: 'expense',
      });

      if (!category) {
        throw new NotFoundError('Expense category not found');
      }
    }

    // Calculate dates based on period
    const now = new Date();
    let budgetStartDate = startDate || now;
    let budgetEndDate = endDate;

    if (!budgetEndDate) {
      budgetEndDate = this.calculateEndDate(budgetStartDate, period);
    }

    // Calculate initial spent amount
    const spent = await this.calculateSpent(userId, categoryId, budgetStartDate, budgetEndDate);

    const budget = new Budget({
      userId,
      categoryId,
      name,
      amount,
      spent,
      period,
      startDate: budgetStartDate,
      endDate: budgetEndDate,
      ...rest,
    });

    await budget.save();

    await cacheDelPattern(`budgets:${userId}:*`);

    logger.info(`Budget created: ${budget.name}`);

    return budget;
  }

  // Get budget by ID
  async getById(budgetId: string, userId: string): Promise<IBudget> {
    const budget = await Budget.findOne({
      _id: budgetId,
      userId,
    }).populate('categoryId');

    if (!budget) {
      throw new NotFoundError('Budget not found');
    }

    return budget;
  }

  // Get all budgets for user
  async getAll(userId: string, includeInactive = false): Promise<IBudget[]> {
    const query: Record<string, unknown> = { userId };
    
    if (!includeInactive) {
      query.isActive = true;
    }

    const budgets = await Budget.find(query)
      .populate('categoryId')
      .sort({ endDate: -1 });

    return budgets;
  }

  // Get active budgets for current period
  async getActive(userId: string): Promise<IBudget[]> {
    const now = new Date();

    const budgets = await Budget.find({
      userId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).populate('categoryId');

    // Recalculate spent amounts
    const updatedBudgets = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.calculateSpent(
          userId,
          budget.categoryId?.toString(),
          budget.startDate,
          budget.endDate
        );

        if (spent !== budget.spent) {
          budget.spent = spent;
          await budget.save();
        }

        return budget;
      })
    );

    return updatedBudgets;
  }

  // Update budget
  async update(input: UpdateBudgetInput): Promise<IBudget> {
    const { id, userId, ...updateData } = input;

    const budget = await Budget.findOne({ _id: id, userId });
    if (!budget) {
      throw new NotFoundError('Budget not found');
    }

    Object.assign(budget, updateData);
    await budget.save();

    await cacheDelPattern(`budgets:${userId}:*`);

    return budget.populate('categoryId');
  }

  // Delete budget
  async delete(budgetId: string, userId: string): Promise<void> {
    const budget = await Budget.findOne({ _id: budgetId, userId });

    if (!budget) {
      throw new NotFoundError('Budget not found');
    }

    await budget.deleteOne();

    await cacheDelPattern(`budgets:${userId}:*`);

    logger.info(`Budget deleted: ${budgetId}`);
  }

  // Rollover budgets (for cron job)
  async rolloverBudgets(): Promise<void> {
    const now = new Date();

    const expiredBudgets = await Budget.find({
      isActive: true,
      rollover: true,
      endDate: { $lt: now },
    });

    for (const budget of expiredBudgets) {
      // Calculate rollover amount
      const remaining = Math.max(0, budget.amount - budget.spent);

      // Create new budget period
      const newStartDate = budget.endDate;
      const newEndDate = this.calculateEndDate(newStartDate, budget.period);

      const newBudget = new Budget({
        userId: budget.userId,
        categoryId: budget.categoryId,
        name: budget.name,
        amount: budget.amount,
        spent: 0,
        period: budget.period,
        startDate: newStartDate,
        endDate: newEndDate,
        alertThreshold: budget.alertThreshold,
        alertEnabled: budget.alertEnabled,
        rollover: budget.rollover,
        rolloverAmount: remaining,
        notes: budget.notes,
      });

      await newBudget.save();

      // Mark old budget as inactive
      budget.isActive = false;
      await budget.save();

      logger.info(`Budget rolled over: ${budget.name}`);
    }
  }

  // Get budget summary
  async getSummary(userId: string): Promise<{
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    budgetsOverLimit: number;
    budgetsNearLimit: number;
  }> {
    const budgets = await this.getActive(userId);

    const summary = budgets.reduce(
      (acc, budget) => {
        const total = budget.amount + budget.rolloverAmount;
        acc.totalBudget += total;
        acc.totalSpent += budget.spent;
        acc.totalRemaining += Math.max(0, total - budget.spent);

        const percentUsed = (budget.spent / total) * 100;
        if (percentUsed >= 100) {
          acc.budgetsOverLimit++;
        } else if (percentUsed >= budget.alertThreshold) {
          acc.budgetsNearLimit++;
        }

        return acc;
      },
      {
        totalBudget: 0,
        totalSpent: 0,
        totalRemaining: 0,
        budgetsOverLimit: 0,
        budgetsNearLimit: 0,
      }
    );

    return summary;
  }

  /**
   * Get per-budget status suitable for UI / notifications.
   * This is separate from `getSummary` because it includes a grade per budget.
   */
  async getStatus(userId: string): Promise<{
    summary: {
      totalBudget: number;
      totalSpent: number;
      totalRemaining: number;
      overallPercentUsed: number;
    };
    budgets: Array<{
      id: string;
      name: string;
      category?: string;
      percentUsed: number;
      remaining: number;
      status: 'excellent' | 'good' | 'fair' | 'poor';
      isOverBudget: boolean;
      period: string;
      startDate: Date;
      endDate: Date;
      alertThreshold: number;
      alertEnabled: boolean;
    }>;
  }> {
    const budgets = await this.getActive(userId);

    const totals = budgets.reduce(
      (acc, b) => {
        const total = b.amount + (b.rolloverAmount ?? 0);
        acc.totalBudget += total;
        acc.totalSpent += b.spent;
        acc.totalRemaining += Math.max(0, total - b.spent);
        return acc;
      },
      {
        totalBudget: 0,
        totalSpent: 0,
        totalRemaining: 0,
      }
    );

    const overallPercentUsed =
      totals.totalBudget > 0 ? (totals.totalSpent / totals.totalBudget) * 100 : 0;

    const budgetsWithStatus = budgets.map((budget) => {
      const percentUsed = Number(budget.percentUsed ?? 0);
      const remaining =
        typeof (budget as any).remaining === 'number'
          ? Number((budget as any).remaining)
          : Math.max(0, budget.amount + (budget.rolloverAmount ?? 0) - budget.spent);

      const status: 'excellent' | 'good' | 'fair' | 'poor' =
        percentUsed >= 100
          ? 'poor'
          : percentUsed >= budget.alertThreshold
            ? 'fair'
            : percentUsed >= 70
              ? 'good'
              : 'excellent';

      const category =
        typeof (budget as any).categoryId === 'object'
          ? (budget as any).categoryId?.name
          : undefined;

      return {
        id: budget._id.toString(),
        name: budget.name,
        category,
        percentUsed: Math.round(percentUsed * 10) / 10,
        remaining,
        status,
        isOverBudget: Boolean((budget as any).isOverBudget),
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
        alertThreshold: budget.alertThreshold,
        alertEnabled: budget.alertEnabled,
      };
    });

    return {
      summary: {
        totalBudget: totals.totalBudget,
        totalSpent: totals.totalSpent,
        totalRemaining: totals.totalRemaining,
        overallPercentUsed: Math.round(overallPercentUsed * 10) / 10,
      },
      budgets: budgetsWithStatus,
    };
  }

  // Hourly budget alert notifications
  async notifyBudgetAlerts(): Promise<void> {
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const userIdStrings = await Budget.distinct('userId', {
      isActive: true,
      alertEnabled: true,
    });

    for (const userId of userIdStrings) {
      const userIdStr = userId.toString();
      const activeBudgets = await this.getActive(userIdStr);

      for (const budget of activeBudgets) {
        if (!budget.alertEnabled) continue;

        const percentUsed = budget.percentUsed;
        if (percentUsed < budget.alertThreshold) continue;

        const title = `Budget Alert: ${budget.name}`;
        const existingToday = await Notification.findOne({
          userId: userIdStr,
          type: 'warning',
          title,
          createdAt: { $gte: todayStart, $lte: todayEnd },
        });

        if (existingToday) continue;

        const message = `${budget.name} is at ${percentUsed}% used (threshold: ${budget.alertThreshold}%).`;

        await Notification.create({
          userId: userIdStr,
          type: 'warning',
          title,
          message,
          actionUrl: `/budgets/${budget._id}`,
          metadata: { percentUsed, budgetId: budget._id.toString() },
        });
      }
    }
  }

  // Helper methods
  private calculateEndDate(startDate: Date, period: string): Date {
    const endDate = new Date(startDate);

    switch (period) {
      case 'weekly':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    endDate.setHours(23, 59, 59, 999);
    return endDate;
  }

  private async calculateSpent(
    userId: string,
    categoryId: string | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const match: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
      type: 'expense',
      deletedAt: null,
      date: { $gte: startDate, $lte: endDate },
    };

    if (categoryId) {
      match.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    const result = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return result[0]?.total || 0;
  }
}

export const budgetService = new BudgetService();
