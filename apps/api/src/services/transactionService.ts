import mongoose from 'mongoose';
import { Transaction, ITransaction, Budget, Category } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { cacheGet, cacheSet, cacheDelPattern } from '../config/redis.js';
import { logger } from '../utils/logger.js';

interface CreateTransactionInput {
  userId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: Date;
  merchant?: string;
  notes?: string;
  tags?: string[];
  isRecurring?: boolean;
  recurringId?: string;
  receiptUrl?: string;
}

interface UpdateTransactionInput extends Partial<CreateTransactionInput> {
  id: string;
}

interface TransactionFilters {
  userId: string;
  type?: 'income' | 'expense';
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  tags?: string[];
  isRecurring?: boolean;
}

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  transactionCount: number;
  averageTransaction: number;
  byCategory: {
    categoryId: string;
    categoryName: string;
    total: number;
    count: number;
    type: 'income' | 'expense';
  }[];
}

export class TransactionService {
  // Create transaction
  async create(input: CreateTransactionInput): Promise<ITransaction> {
    // Verify category exists and belongs to user
    const category = await Category.findOne({
      _id: input.categoryId,
      userId: input.userId,
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const transaction = new Transaction({
      ...input,
      type: category.type, // Ensure type matches category
    });

    await transaction.save();

    // Update budget spent amount if expense
    if (transaction.type === 'expense') {
      await this.updateBudgetSpent(input.userId, input.categoryId, input.amount);
    }

    // Invalidate cache
    await cacheDelPattern(`transactions:${input.userId}:*`);
    await cacheDelPattern(`analytics:${input.userId}:*`);

    logger.info(`Transaction created: ${transaction._id}`);

    return transaction.populate('categoryId');
  }

  // Get transaction by ID
  async getById(transactionId: string, userId: string): Promise<ITransaction> {
    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId,
    }).populate('categoryId');

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return transaction;
  }

  // Get all transactions with filters
  async getAll(
    filters: TransactionFilters,
    pagination: PaginationOptions
  ): Promise<{
    transactions: ITransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page, limit, sortBy = 'date', sortOrder = 'desc' } = pagination;

    // Build query
    const query: Record<string, unknown> = { userId: filters.userId };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.categoryId) {
      query.categoryId = new mongoose.Types.ObjectId(filters.categoryId);
    }

    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        (query.date as Record<string, Date>).$gte = filters.startDate;
      }
      if (filters.endDate) {
        (query.date as Record<string, Date>).$lte = filters.endDate;
      }
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      query.amount = {};
      if (filters.minAmount !== undefined) {
        (query.amount as Record<string, number>).$gte = filters.minAmount;
      }
      if (filters.maxAmount !== undefined) {
        (query.amount as Record<string, number>).$lte = filters.maxAmount;
      }
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters.isRecurring !== undefined) {
      query.isRecurring = filters.isRecurring;
    }

    // Execute query
    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('categoryId')
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(query),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Update transaction
  async update(input: UpdateTransactionInput): Promise<ITransaction> {
    const { id, userId, ...updateData } = input;

    const transaction = await Transaction.findOne({ _id: id, userId });
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    // If category changed, verify new category
    if (updateData.categoryId) {
      const category = await Category.findOne({
        _id: updateData.categoryId,
        userId,
      });
      if (!category) {
        throw new NotFoundError('Category not found');
      }
    }

    // Calculate budget adjustment if amount changed
    if (
      transaction.type === 'expense' &&
      updateData.amount !== undefined &&
      updateData.amount !== transaction.amount
    ) {
      const difference = updateData.amount - transaction.amount;
      await this.updateBudgetSpent(
        userId!,
        (updateData.categoryId || transaction.categoryId).toString(),
        difference
      );
    }

    Object.assign(transaction, updateData);
    await transaction.save();

    // Invalidate cache
    await cacheDelPattern(`transactions:${userId}:*`);
    await cacheDelPattern(`analytics:${userId}:*`);

    return transaction.populate('categoryId');
  }

  // Delete transaction
  async delete(transactionId: string, userId: string): Promise<void> {
    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId,
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    // Adjust budget if expense
    if (transaction.type === 'expense') {
      await this.updateBudgetSpent(
        userId,
        transaction.categoryId.toString(),
        -transaction.amount
      );
    }

    await transaction.deleteOne();

    // Invalidate cache
    await cacheDelPattern(`transactions:${userId}:*`);
    await cacheDelPattern(`analytics:${userId}:*`);

    logger.info(`Transaction deleted: ${transactionId}`);
  }

  // Get summary
  async getSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TransactionSummary> {
    const cacheKey = `transactions:${userId}:summary:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    const cached = await cacheGet<TransactionSummary>(cacheKey);
    if (cached) return cached;

    const [summary, byCategory] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            date: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] },
            },
            totalExpenses: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] },
            },
            transactionCount: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            date: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$categoryId',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            type: { $first: '$type' },
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: '$category' },
        {
          $project: {
            categoryId: '$_id',
            categoryName: '$category.name',
            total: 1,
            count: 1,
            type: 1,
          },
        },
      ]),
    ]);

    const result: TransactionSummary = {
      totalIncome: summary[0]?.totalIncome || 0,
      totalExpenses: summary[0]?.totalExpenses || 0,
      netIncome: (summary[0]?.totalIncome || 0) - (summary[0]?.totalExpenses || 0),
      transactionCount: summary[0]?.transactionCount || 0,
      averageTransaction:
        summary[0]?.transactionCount > 0
          ? summary[0].totalAmount / summary[0].transactionCount
          : 0,
      byCategory,
    };

    await cacheSet(cacheKey, result, 300); // Cache for 5 minutes

    return result;
  }

  // Update budget spent amount
  private async updateBudgetSpent(
    userId: string,
    categoryId: string,
    amount: number
  ): Promise<void> {
    const now = new Date();
    
    await Budget.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        $or: [
          { categoryId: new mongoose.Types.ObjectId(categoryId) },
          { categoryId: { $exists: false } }, // Overall budget
        ],
        startDate: { $lte: now },
        endDate: { $gte: now },
        isActive: true,
      },
      { $inc: { spent: amount } }
    );
  }
}

export const transactionService = new TransactionService();
