import mongoose from 'mongoose';
import { User, IUser } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';
import { logger } from '../utils/logger.js';

interface UpdateProfileInput {
  userId: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  currency?: string;
  locale?: string;
  timezone?: string;
}

interface UpdatePreferencesInput {
  userId: string;
  preferences: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    weeklyReport?: boolean;
    monthlyReport?: boolean;
    budgetAlerts?: boolean;
    goalAlerts?: boolean;
    billReminders?: boolean;
    anomalyAlerts?: boolean;
    darkMode?: boolean;
    compactView?: boolean;
    defaultView?: 'dashboard' | 'transactions' | 'budgets';
  };
}

interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export class UserService {
  // Get user by ID
  async getById(userId: string): Promise<IUser> {
    const cacheKey = `user:${userId}`;
    
    const cached = await cacheGet<IUser>(cacheKey);
    if (cached) return cached;

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await cacheSet(cacheKey, user, 3600); // Cache for 1 hour

    return user;
  }

  // Update profile
  async updateProfile(input: UpdateProfileInput): Promise<IUser> {
    const { userId, ...updateData } = input;

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    Object.assign(user, updateData);
    await user.save();

    await cacheDel(`user:${userId}`);

    logger.info(`Profile updated for user ${userId}`);

    return user;
  }

  // Update preferences
  async updatePreferences(input: UpdatePreferencesInput): Promise<IUser> {
    const { userId, preferences } = input;

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.preferences = {
      ...user.preferences,
      ...preferences,
    };

    await user.save();

    await cacheDel(`user:${userId}`);

    logger.info(`Preferences updated for user ${userId}`);

    return user;
  }

  // Change password
  async changePassword(input: ChangePasswordInput): Promise<void> {
    const { userId, currentPassword, newPassword } = input;

    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.password) {
      throw new BadRequestError(
        'This account uses social login. Password change is not available.'
      );
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestError('New password must be different from current password');
    }

    user.password = newPassword;
    user.refreshToken = undefined; // Invalidate all sessions
    await user.save();

    await cacheDel(`user:${userId}`);

    logger.info(`Password changed for user ${userId}`);
  }

  // Upload avatar
  async updateAvatar(userId: string, avatarUrl: string): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await cacheDel(`user:${userId}`);

    return user;
  }

  // Delete account
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify password for local accounts
    if (user.password) {
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new BadRequestError('Incorrect password');
      }
    }

    // Delete all user data
    await Promise.all([
      mongoose.model('Transaction').deleteMany({ userId }),
      mongoose.model('Category').deleteMany({ userId }),
      mongoose.model('Budget').deleteMany({ userId }),
      mongoose.model('Goal').deleteMany({ userId }),
      mongoose.model('Bill').deleteMany({ userId }),
      mongoose.model('Investment').deleteMany({ userId }),
      mongoose.model('Debt').deleteMany({ userId }),
      mongoose.model('Notification').deleteMany({ userId }),
      mongoose.model('RecurringTransaction').deleteMany({ userId }),
    ]);

    await user.deleteOne();

    await cacheDel(`user:${userId}`);

    logger.info(`Account deleted: ${userId}`);
  }

  // Get user stats
  async getStats(userId: string): Promise<{
    memberSince: Date;
    totalTransactions: number;
    totalCategories: number;
    activeGoals: number;
    activeBudgets: number;
    lastActivity: Date | null;
  }> {
    const user = await this.getById(userId);

    const [transactionCount, categoryCount, goalCount, budgetCount] = await Promise.all([
      mongoose.model('Transaction').countDocuments({ userId }),
      mongoose.model('Category').countDocuments({ userId }),
      mongoose.model('Goal').countDocuments({ userId, status: 'active' }),
      mongoose.model('Budget').countDocuments({ userId, isActive: true }),
    ]);

    const lastTransaction = await mongoose
      .model('Transaction')
      .findOne({ userId })
      .sort({ createdAt: -1 })
      .select('createdAt');

    return {
      memberSince: user.createdAt,
      totalTransactions: transactionCount,
      totalCategories: categoryCount,
      activeGoals: goalCount,
      activeBudgets: budgetCount,
      lastActivity: lastTransaction?.createdAt || null,
    };
  }

  // Export user data (GDPR compliance)
  async exportData(userId: string): Promise<Record<string, unknown>> {
    const [user, transactions, categories, budgets, goals, bills, investments, debts] =
      await Promise.all([
        User.findById(userId).lean(),
        mongoose.model('Transaction').find({ userId }).lean(),
        mongoose.model('Category').find({ userId }).lean(),
        mongoose.model('Budget').find({ userId }).lean(),
        mongoose.model('Goal').find({ userId }).lean(),
        mongoose.model('Bill').find({ userId }).lean(),
        mongoose.model('Investment').find({ userId }).lean(),
        mongoose.model('Debt').find({ userId }).lean(),
      ]);

    // Remove sensitive data
    if (user) {
      delete (user as any).password;
      delete (user as any).refreshToken;
      delete (user as any).passwordResetToken;
      delete (user as any).passwordResetExpires;
    }

    return {
      user,
      transactions,
      categories,
      budgets,
      goals,
      bills,
      investments,
      debts,
      exportedAt: new Date(),
    };
  }
}

export const userService = new UserService();
