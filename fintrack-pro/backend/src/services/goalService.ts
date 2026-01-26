import mongoose from 'mongoose';
import { Goal, IGoal, Notification } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { cacheDelPattern } from '../config/redis.js';
import { logger } from '../utils/logger.js';

interface CreateGoalInput {
  userId: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate: Date;
  icon?: string;
  color?: string;
  priority?: 'low' | 'medium' | 'high';
  autoContribute?: boolean;
  autoContributeAmount?: number;
  autoContributeFrequency?: 'weekly' | 'biweekly' | 'monthly';
}

interface UpdateGoalInput {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  targetAmount?: number;
  targetDate?: Date;
  icon?: string;
  color?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  autoContribute?: boolean;
  autoContributeAmount?: number;
  autoContributeFrequency?: 'weekly' | 'biweekly' | 'monthly';
}

interface ContributionInput {
  goalId: string;
  userId: string;
  amount: number;
  note?: string;
}

export class GoalService {
  // Create goal
  async create(input: CreateGoalInput): Promise<IGoal> {
    const goal = new Goal({
      ...input,
      milestones: [
        { percentage: 25 },
        { percentage: 50 },
        { percentage: 75 },
        { percentage: 100 },
      ],
    });

    await goal.save();

    await cacheDelPattern(`goals:${input.userId}:*`);

    logger.info(`Goal created: ${goal.name}`);

    return goal;
  }

  // Get goal by ID
  async getById(goalId: string, userId: string): Promise<IGoal> {
    const goal = await Goal.findOne({
      _id: goalId,
      userId,
    });

    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    return goal;
  }

  // Get all goals for user
  async getAll(
    userId: string,
    status?: 'active' | 'completed' | 'paused' | 'cancelled'
  ): Promise<IGoal[]> {
    const query: Record<string, unknown> = { userId };

    if (status) {
      query.status = status;
    }

    const goals = await Goal.find(query).sort({ targetDate: 1 });

    return goals;
  }

  // Update goal
  async update(input: UpdateGoalInput): Promise<IGoal> {
    const { id, userId, ...updateData } = input;

    const goal = await Goal.findOne({ _id: id, userId });
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    Object.assign(goal, updateData);

    // Check if goal is completed
    if (goal.currentAmount >= goal.targetAmount && goal.status === 'active') {
      goal.status = 'completed';
      goal.completedAt = new Date();

      // Create achievement notification
      await Notification.create({
        userId,
        type: 'achievement',
        title: 'Goal Achieved! 🎉',
        message: `Congratulations! You've reached your goal: ${goal.name}`,
        actionUrl: `/goals/${goal._id}`,
      });
    }

    await goal.save();

    await cacheDelPattern(`goals:${userId}:*`);

    return goal;
  }

  // Add contribution
  async addContribution(input: ContributionInput): Promise<IGoal> {
    const { goalId, userId, amount, note } = input;

    if (amount <= 0) {
      throw new BadRequestError('Contribution amount must be positive');
    }

    const goal = await Goal.findOne({ _id: goalId, userId });
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    if (goal.status !== 'active') {
      throw new BadRequestError('Cannot add contribution to inactive goal');
    }

    // Add contribution
    goal.contributions.push({
      amount,
      date: new Date(),
      note,
    });

    goal.currentAmount += amount;

    // Check milestones
    await this.checkMilestones(goal);

    // Check if goal is completed
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
      goal.completedAt = new Date();

      await Notification.create({
        userId,
        type: 'achievement',
        title: 'Goal Achieved! 🎉',
        message: `Congratulations! You've reached your goal: ${goal.name}`,
        actionUrl: `/goals/${goal._id}`,
      });
    }

    await goal.save();

    await cacheDelPattern(`goals:${userId}:*`);

    logger.info(`Contribution added to goal ${goalId}: ${amount}`);

    return goal;
  }

  // Withdraw from goal
  async withdraw(input: ContributionInput): Promise<IGoal> {
    const { goalId, userId, amount, note } = input;

    if (amount <= 0) {
      throw new BadRequestError('Withdrawal amount must be positive');
    }

    const goal = await Goal.findOne({ _id: goalId, userId });
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    if (amount > goal.currentAmount) {
      throw new BadRequestError('Withdrawal amount exceeds current balance');
    }

    goal.contributions.push({
      amount: -amount,
      date: new Date(),
      note: note || 'Withdrawal',
    });

    goal.currentAmount -= amount;

    // Revert status if was completed
    if (goal.status === 'completed' && goal.currentAmount < goal.targetAmount) {
      goal.status = 'active';
      goal.completedAt = undefined;
    }

    await goal.save();

    await cacheDelPattern(`goals:${userId}:*`);

    return goal;
  }

  // Delete goal
  async delete(goalId: string, userId: string): Promise<void> {
    const goal = await Goal.findOne({ _id: goalId, userId });

    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    await goal.deleteOne();

    await cacheDelPattern(`goals:${userId}:*`);

    logger.info(`Goal deleted: ${goalId}`);
  }

  // Get goal summary
  async getSummary(userId: string): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalTargetAmount: number;
    totalCurrentAmount: number;
    overallProgress: number;
  }> {
    const goals = await Goal.find({ userId });

    const summary = goals.reduce(
      (acc, goal) => {
        acc.totalGoals++;
        if (goal.status === 'active') acc.activeGoals++;
        if (goal.status === 'completed') acc.completedGoals++;
        acc.totalTargetAmount += goal.targetAmount;
        acc.totalCurrentAmount += goal.currentAmount;
        return acc;
      },
      {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        totalTargetAmount: 0,
        totalCurrentAmount: 0,
        overallProgress: 0,
      }
    );

    summary.overallProgress =
      summary.totalTargetAmount > 0
        ? Math.round((summary.totalCurrentAmount / summary.totalTargetAmount) * 100)
        : 0;

    return summary;
  }

  // Check and update milestones
  private async checkMilestones(goal: IGoal): Promise<void> {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;

    for (const milestone of goal.milestones) {
      if (progress >= milestone.percentage && !milestone.reachedAt) {
        milestone.reachedAt = new Date();

        // Create notification
        await Notification.create({
          userId: goal.userId,
          type: 'goal',
          title: `${milestone.percentage}% Milestone Reached! 🎯`,
          message: `You've reached ${milestone.percentage}% of your goal: ${goal.name}`,
          actionUrl: `/goals/${goal._id}`,
        });
      }
    }
  }

  // Process auto-contributions (for cron job)
  async processAutoContributions(): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();

    const goals = await Goal.find({
      status: 'active',
      autoContribute: true,
      autoContributeAmount: { $gt: 0 },
    });

    for (const goal of goals) {
      let shouldContribute = false;

      switch (goal.autoContributeFrequency) {
        case 'weekly':
          shouldContribute = dayOfWeek === 1; // Monday
          break;
        case 'biweekly':
          shouldContribute = dayOfWeek === 1 && Math.floor(dayOfMonth / 7) % 2 === 0;
          break;
        case 'monthly':
          shouldContribute = dayOfMonth === 1;
          break;
      }

      if (shouldContribute && goal.autoContributeAmount) {
        await this.addContribution({
          goalId: goal._id.toString(),
          userId: goal.userId.toString(),
          amount: goal.autoContributeAmount,
          note: 'Auto-contribution',
        });

        logger.info(`Auto-contribution processed for goal ${goal._id}`);
      }
    }
  }
}

export const goalService = new GoalService();
