import mongoose from 'mongoose';
import { Category, ICategory, Transaction } from '../models/index.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.js';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from '../config/redis.js';
import { logger } from '../utils/logger.js';

interface CreateCategoryInput {
  userId: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  budgetLimit?: number;
}

interface UpdateCategoryInput {
  id: string;
  userId: string;
  name?: string;
  icon?: string;
  color?: string;
  budgetLimit?: number;
  isActive?: boolean;
}

interface CategoryWithStats extends ICategory {
  transactionCount: number;
  totalAmount: number;
  monthlyAverage: number;
}

export class CategoryService {
  // Create category
  async create(input: CreateCategoryInput): Promise<ICategory> {
    // Check for duplicate name
    const existing = await Category.findOne({
      userId: input.userId,
      name: { $regex: new RegExp(`^${input.name}$`, 'i') },
    });

    if (existing) {
      throw new ConflictError('Category with this name already exists');
    }

    const category = new Category(input);
    await category.save();

    await cacheDel(`categories:${input.userId}`);

    logger.info(`Category created: ${category.name}`);

    return category;
  }

  // Get category by ID
  async getById(categoryId: string, userId: string): Promise<ICategory> {
    const category = await Category.findOne({
      _id: categoryId,
      userId,
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return category;
  }

  // Get all categories for user
  async getAll(userId: string): Promise<ICategory[]> {
    const cacheKey = `categories:${userId}`;
    
    const cached = await cacheGet<ICategory[]>(cacheKey);
    if (cached) return cached;

    const categories = await Category.find({ userId, isActive: true })
      .sort({ type: 1, name: 1 });

    await cacheSet(cacheKey, categories, 3600); // Cache for 1 hour

    return categories;
  }

  // Get categories with stats
  async getAllWithStats(userId: string): Promise<CategoryWithStats[]> {
    const cacheKey = `categories:${userId}:stats`;
    
    const cached = await cacheGet<CategoryWithStats[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const categories = await Category.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isActive: true,
        },
      },
      {
        $lookup: {
          from: 'transactions',
          let: { categoryId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$categoryId', '$$categoryId'] },
                    { $gte: ['$date', threeMonthsAgo] },
                  ],
                },
              },
            },
          ],
          as: 'transactions',
        },
      },
      {
        $addFields: {
          transactionCount: { $size: '$transactions' },
          totalAmount: { $sum: '$transactions.amount' },
          monthlyAverage: {
            $divide: [{ $sum: '$transactions.amount' }, 3],
          },
        },
      },
      {
        $project: {
          transactions: 0,
        },
      },
      {
        $sort: { type: 1, name: 1 },
      },
    ]);

    await cacheSet(cacheKey, categories, 300); // Cache for 5 minutes

    return categories as CategoryWithStats[];
  }

  // Update category
  async update(input: UpdateCategoryInput): Promise<ICategory> {
    const { id, userId, ...updateData } = input;

    const category = await Category.findOne({ _id: id, userId });
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Check for duplicate name if name is being changed
    if (updateData.name && updateData.name !== category.name) {
      const existing = await Category.findOne({
        userId,
        name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
        _id: { $ne: id },
      });

      if (existing) {
        throw new ConflictError('Category with this name already exists');
      }
    }

    Object.assign(category, updateData);
    await category.save();

    await cacheDelPattern(`categories:${userId}*`);

    return category;
  }

  // Delete category
  async delete(categoryId: string, userId: string): Promise<void> {
    const category = await Category.findOne({
      _id: categoryId,
      userId,
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    if (category.isDefault) {
      throw new BadRequestError('Cannot delete default category');
    }

    // Check if category has transactions
    const transactionCount = await Transaction.countDocuments({
      categoryId,
      userId,
    });

    if (transactionCount > 0) {
      // Soft delete - mark as inactive
      category.isActive = false;
      await category.save();
    } else {
      await category.deleteOne();
    }

    await cacheDelPattern(`categories:${userId}*`);

    logger.info(`Category deleted: ${categoryId}`);
  }

  // Get category breakdown
  async getBreakdown(
    userId: string,
    type: 'income' | 'expense',
    startDate: Date,
    endDate: Date
  ): Promise<{ categoryId: string; name: string; color: string; total: number; percentage: number }[]> {
    const result = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$categoryId',
          total: { $sum: '$amount' },
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
          name: '$category.name',
          color: '$category.color',
          total: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    const grandTotal = result.reduce((sum, item) => sum + item.total, 0);

    return result.map((item) => ({
      ...item,
      percentage: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0,
    }));
  }
}

export const categoryService = new CategoryService();
