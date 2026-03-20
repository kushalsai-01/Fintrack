import mongoose from 'mongoose';
import { Transaction, ITransaction, Budget, Category } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { cacheGet, cacheSet, cacheDelPattern } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { predictCategory } from '../utils/mlService.js';
import { emitToUser } from '../utils/socket.js';

interface CreateTransactionInput {
  userId: string;
  categoryId?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  date: Date;
  merchant?: string;
  notes?: string;
  tags?: string[];
  isRecurring?: boolean;
  recurringId?: string;
  receiptUrl?: string;
  categoryConfirmed?: boolean;
}

interface UpdateTransactionInput extends Partial<CreateTransactionInput> {
  id: string;
}

interface TransactionFilters {
  userId: string;
  type?: 'income' | 'expense' | 'transfer';
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
    const escapeRegExp = (value: string): string =>
      value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const resolveCategoryByIdOrPrediction = async (): Promise<{
      categoryId: string;
      type: 'income' | 'expense';
    }> => {
      if (input.categoryId) {
        const category = await Category.findOne({
          _id: input.categoryId,
          userId: input.userId,
          isActive: true,
        });
        if (!category) throw new NotFoundError('Category not found');
        return { categoryId: category._id.toString(), type: category.type };
      }

      // If categoryId is not provided, ask ML to predict a category name.
      // For better "Other" handling, pass signed amount: expenses => negative.
      const signedAmount = input.type === 'expense' ? -input.amount : input.amount;
      const mlResp = await predictCategory(
        input.description,
        signedAmount,
        input.merchant
      );

      // Fallback category name based on confidence.
      const predictedName =
        mlResp.success && mlResp.data
          ? mlResp.data.confidence < 0.6
            ? 'Other'
            : mlResp.data.category
          : 'Other';

      const normalizePredictedCategoryName = (name: string): string => {
        switch (name) {
          case 'Dining':
            return 'Food & Dining';
          case 'Transportation':
            return 'Transport';
          case 'Groceries':
            return 'Food & Dining';
          default:
            return name;
        }
      };

      const normalizedName = normalizePredictedCategoryName(predictedName);

      // Resolve predicted name to user's category (case-insensitive).
      const category = await Category.findOne({
        userId: input.userId,
        isActive: true,
        type: input.type,
        name: { $regex: new RegExp(`^${escapeRegExp(normalizedName)}$`, 'i') },
      });

      if (category) {
        return { categoryId: category._id.toString(), type: category.type };
      }

      // Last resort: use the first active default category for that type.
      const fallback = await Category.findOne({
        userId: input.userId,
        isActive: true,
        type: input.type,
        isDefault: true,
      });

      if (fallback) {
        return { categoryId: fallback._id.toString(), type: fallback.type };
      }

      throw new NotFoundError('No active category available to assign');
    };

    const { categoryId, type } = await resolveCategoryByIdOrPrediction();

    const transaction = new Transaction({
      ...input,
      categoryId: new mongoose.Types.ObjectId(categoryId),
      type,
      categoryConfirmed: input.categoryConfirmed ?? (input.categoryId ? true : false),
    });

    await transaction.save();

    // Update budget spent amount if expense
    if (transaction.type === 'expense') {
      await this.updateBudgetSpent(input.userId, transaction.categoryId.toString(), transaction.amount);
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
      deletedAt: null,
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
    const query: Record<string, unknown> = { userId: filters.userId, deletedAt: null };

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

    const transaction = await Transaction.findOne({ _id: id, userId, deletedAt: null });
    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const oldType = transaction.type;
    const oldCategoryId = transaction.categoryId.toString();
    const oldAmount = transaction.amount;

    const effectiveType =
      typeof updateData.type === 'string' && (updateData.type === 'income' || updateData.type === 'expense')
        ? updateData.type
        : transaction.type;

    // Re-run ML categorization if the description changed and no explicit categoryId was provided.
    const descriptionChanged =
      typeof updateData.description === 'string' &&
      updateData.description.trim().length > 0 &&
      updateData.description !== transaction.description;

    if (descriptionChanged && updateData.categoryId === undefined) {
      const amountForPrediction =
        typeof updateData.amount === 'number' ? updateData.amount : transaction.amount;
      const signedAmount = effectiveType === 'expense' ? -amountForPrediction : amountForPrediction;

      const mlResp = await predictCategory(
        updateData.description,
        signedAmount,
        updateData.merchant
      );

      const predictedName =
        mlResp.success && mlResp.data
          ? mlResp.data.confidence < 0.6
            ? 'Other'
            : mlResp.data.category
          : 'Other';

      const escapeRegExp = (value: string): string =>
        value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const normalizePredictedCategoryName = (name: string): string => {
        switch (name) {
          case 'Dining':
            return 'Food & Dining';
          case 'Transportation':
            return 'Transport';
          case 'Groceries':
            return 'Food & Dining';
          default:
            return name;
        }
      };

      const normalizedName = normalizePredictedCategoryName(predictedName);

      const category = await Category.findOne({
        userId,
        isActive: true,
        type: effectiveType,
        name: { $regex: new RegExp(`^${escapeRegExp(normalizedName)}$`, 'i') },
      });

      if (category) {
        (updateData as typeof updateData & { categoryId?: string }).categoryId = category._id.toString();
        (updateData as typeof updateData & { type?: typeof transaction.type }).type = category.type;
      }
    }

    // If category changed (or is being set by ML), verify new category belongs to user.
    if (updateData.categoryId) {
      const category = await Category.findOne({
        _id: updateData.categoryId,
        userId,
        isActive: true,
      });
      if (!category) {
        throw new NotFoundError('Category not found');
      }
      // Ensure transaction.type matches category.type.
      updateData.type = category.type;
    }

    Object.assign(transaction, updateData);
    await transaction.save();

    // Adjust budget spent amounts for expense transactions.
    const newType = transaction.type;
    const newCategoryId = transaction.categoryId.toString();
    const newAmount = transaction.amount;

    if (oldType === 'expense' && newType === 'expense') {
      // Always remove old values then add new to keep budgets consistent.
      await this.updateBudgetSpent(userId, oldCategoryId, -oldAmount);
      await this.updateBudgetSpent(userId, newCategoryId, newAmount);
    } else if (oldType === 'expense' && newType !== 'expense') {
      await this.updateBudgetSpent(userId, oldCategoryId, -oldAmount);
    } else if (oldType !== 'expense' && newType === 'expense') {
      await this.updateBudgetSpent(userId, newCategoryId, newAmount);
    }

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
      deletedAt: null,
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

    transaction.deletedAt = new Date();
    await transaction.save();

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
            deletedAt: null,
            type: { $in: ['income', 'expense'] },
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
            deletedAt: null,
            type: { $in: ['income', 'expense'] },
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

  // Create a transfer between two accounts (creates outgoing + incoming legs)
  async createTransfer(
    userId: string,
    amount: number,
    description: string,
    date: Date,
    fromAccountId?: string,
    toAccountId?: string,
    notes?: string
  ): Promise<{ outgoing: ITransaction; incoming: ITransaction; transferId: string }> {
    const transferId = new mongoose.Types.ObjectId().toString();

    // Resolve a neutral "Transfer" category for the user (or fall back to any expense/income category)
    const findTransferCategory = async (type: 'expense' | 'income') => {
      const cat = await Category.findOne({
        userId,
        isActive: true,
        $or: [
          { name: { $regex: /^transfer$/i } },
          { name: { $regex: /^other$/i } },
        ],
      });
      if (cat) return cat._id;

      const fallback = await Category.findOne({ userId, isActive: true, type });
      if (!fallback) throw new NotFoundError('No active category found for transfer');
      return fallback._id;
    };

    const [outCatId, inCatId] = await Promise.all([
      findTransferCategory('expense'),
      findTransferCategory('income'),
    ]);

    const outgoing = await Transaction.create({
      userId,
      type: 'transfer',
      amount,
      description,
      date,
      notes,
      transferId,
      transferDirection: 'out',
      linkedAccountId: toAccountId ? new mongoose.Types.ObjectId(toAccountId) : undefined,
      bankAccountId: fromAccountId ? new mongoose.Types.ObjectId(fromAccountId) : undefined,
      categoryId: outCatId,
      categoryConfirmed: true,
    });

    const incoming = await Transaction.create({
      userId,
      type: 'transfer',
      amount,
      description,
      date,
      notes,
      transferId,
      transferDirection: 'in',
      linkedAccountId: fromAccountId ? new mongoose.Types.ObjectId(fromAccountId) : undefined,
      bankAccountId: toAccountId ? new mongoose.Types.ObjectId(toAccountId) : undefined,
      categoryId: inCatId,
      categoryConfirmed: true,
    });

    await outgoing.populate('categoryId');
    await incoming.populate('categoryId');

    emitToUser(userId, 'transaction:created', { transaction: (outgoing as any).toJSON() });
    emitToUser(userId, 'transaction:created', { transaction: (incoming as any).toJSON() });

    await cacheDelPattern(`transactions:${userId}:*`);
    await cacheDelPattern(`analytics:${userId}:*`);

    logger.info(`Transfer created: ${transferId}`);
    return { outgoing, incoming, transferId };
  }

  // Trigger per-user ML model retraining (background, fire-and-forget)
  async triggerRetrainIfNeeded(userId: string): Promise<void> {
    try {
      const count = await Transaction.countDocuments({
        userId,
        categoryConfirmed: true,
        categoryId: { $exists: true, $ne: null },
        deletedAt: null,
      });

      if (count < 20) return;

      const transactions = await Transaction.find({
        userId,
        categoryConfirmed: true,
        deletedAt: null,
      })
        .select('description amount categoryId')
        .populate('categoryId', 'name')
        .lean();

      const samples = transactions.map((t: any) => ({
        description: t.description,
        amount: t.amount,
        category: t.categoryId?.name ?? 'Other',
      }));

      const { default: axios } = await import('axios');
      const mlUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8001';
      await axios.post(
        `${mlUrl}/train/train/${userId}`,
        { user_id: userId, transactions: samples },
        { timeout: 5000 }
      );
    } catch {
      // Non-critical — ignore failures silently
    }
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
