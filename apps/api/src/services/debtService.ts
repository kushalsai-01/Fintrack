import mongoose from 'mongoose';
import { Debt, IDebt, Notification } from '../models/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { cacheDelPattern, cacheGet, cacheSet } from '../config/redis.js';
import { logger } from '../utils/logger.js';

interface CreateDebtInput {
  userId: string;
  name: string;
  type: 'credit_card' | 'personal_loan' | 'student_loan' | 'mortgage' | 'car_loan' | 'medical' | 'other';
  originalBalance: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: Date;
  lender?: string;
  accountNumber?: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
}

interface UpdateDebtInput {
  id: string;
  userId: string;
  name?: string;
  currentBalance?: number;
  interestRate?: number;
  minimumPayment?: number;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
  status?: 'active' | 'paid_off' | 'defaulted';
  notes?: string;
  isActive?: boolean;
}

interface MakePaymentInput {
  debtId: string;
  userId: string;
  amount: number;
  date?: Date;
  note?: string;
}

interface DebtPayoffPlan {
  strategy: 'avalanche' | 'snowball';
  totalDebt: number;
  totalMonthlyPayment: number;
  payoffDate: Date;
  totalInterest: number;
  debts: {
    id: string;
    name: string;
    currentBalance: number;
    interestRate: number;
    monthlyPayment: number;
    payoffDate: Date;
    totalInterest: number;
    priority: number;
  }[];
}

export class DebtService {
  // Create debt
  async create(input: CreateDebtInput): Promise<IDebt> {
    const debt = new Debt({
      ...input,
      status: 'active',
    });

    await debt.save();

    await cacheDelPattern(`debts:${input.userId}:*`);

    logger.info(`Debt created: ${debt.name}`);

    return debt;
  }

  // Get debt by ID
  async getById(debtId: string, userId: string): Promise<IDebt> {
    const debt = await Debt.findOne({
      _id: debtId,
      userId,
    });

    if (!debt) {
      throw new NotFoundError('Debt not found');
    }

    return debt;
  }

  // Get all debts for user
  async getAll(userId: string, includeInactive = false): Promise<IDebt[]> {
    const query: Record<string, unknown> = { userId };

    if (!includeInactive) {
      query.isActive = true;
    }

    const debts = await Debt.find(query).sort({ interestRate: -1 });

    return debts;
  }

  // Update debt
  async update(input: UpdateDebtInput): Promise<IDebt> {
    const { id, userId, ...updateData } = input;

    const debt = await Debt.findOne({ _id: id, userId });
    if (!debt) {
      throw new NotFoundError('Debt not found');
    }

    Object.assign(debt, updateData);
    await debt.save();

    await cacheDelPattern(`debts:${userId}:*`);

    return debt;
  }

  // Make payment
  async makePayment(input: MakePaymentInput): Promise<IDebt> {
    const { debtId, userId, amount, date, note } = input;

    if (amount <= 0) {
      throw new BadRequestError('Payment amount must be positive');
    }

    const debt = await Debt.findOne({ _id: debtId, userId });
    if (!debt) {
      throw new NotFoundError('Debt not found');
    }

    if (debt.status === 'paid_off') {
      throw new BadRequestError('Debt is already paid off');
    }

    // Record payment
    debt.payments.push({
      amount,
      date: date || new Date(),
      note,
    });

    // Update balance
    debt.currentBalance = Math.max(0, debt.currentBalance - amount);

    // Check if paid off
    if (debt.currentBalance === 0) {
      debt.status = 'paid_off';
      debt.paidOffDate = new Date();
      debt.isActive = false;

      // Create achievement notification
      await Notification.create({
        userId,
        type: 'achievement',
        title: 'Debt Paid Off! 🎉',
        message: `Congratulations! You've paid off ${debt.name}!`,
        actionUrl: `/debts/${debt._id}`,
      });
    }

    await debt.save();

    await cacheDelPattern(`debts:${userId}:*`);

    logger.info(`Payment of ${amount} made on debt ${debtId}`);

    return debt;
  }

  // Delete debt
  async delete(debtId: string, userId: string): Promise<void> {
    const debt = await Debt.findOne({ _id: debtId, userId });

    if (!debt) {
      throw new NotFoundError('Debt not found');
    }

    await debt.deleteOne();

    await cacheDelPattern(`debts:${userId}:*`);

    logger.info(`Debt deleted: ${debtId}`);
  }

  // Get debt summary
  async getSummary(userId: string): Promise<{
    totalDebt: number;
    totalMinimumPayment: number;
    highestInterestRate: number;
    averageInterestRate: number;
    debtByType: { type: string; balance: number; count: number }[];
    paidOffCount: number;
    paidOffAmount: number;
  }> {
    const debts = await this.getAll(userId, true);

    const activeDebts = debts.filter((d) => d.status === 'active');
    const paidOffDebts = debts.filter((d) => d.status === 'paid_off');

    const totalDebt = activeDebts.reduce((sum, d) => sum + d.currentBalance, 0);
    const totalMinimumPayment = activeDebts.reduce((sum, d) => sum + d.minimumPayment, 0);

    const interestRates = activeDebts.map((d) => d.interestRate);
    const highestInterestRate = Math.max(...interestRates, 0);
    const averageInterestRate =
      interestRates.length > 0
        ? interestRates.reduce((a, b) => a + b, 0) / interestRates.length
        : 0;

    // Group by type
    const byTypeMap = new Map<string, { balance: number; count: number }>();
    for (const debt of activeDebts) {
      const existing = byTypeMap.get(debt.type) || { balance: 0, count: 0 };
      existing.balance += debt.currentBalance;
      existing.count++;
      byTypeMap.set(debt.type, existing);
    }

    const debtByType = Array.from(byTypeMap.entries()).map(([type, data]) => ({
      type,
      ...data,
    }));

    return {
      totalDebt,
      totalMinimumPayment,
      highestInterestRate,
      averageInterestRate: Math.round(averageInterestRate * 100) / 100,
      debtByType,
      paidOffCount: paidOffDebts.length,
      paidOffAmount: paidOffDebts.reduce((sum, d) => sum + d.originalBalance, 0),
    };
  }

  // Generate payoff plan
  async getPayoffPlan(
    userId: string,
    strategy: 'avalanche' | 'snowball',
    extraMonthlyPayment = 0
  ): Promise<DebtPayoffPlan> {
    const cacheKey = `debts:${userId}:plan:${strategy}:${extraMonthlyPayment}`;
    
    const cached = await cacheGet<DebtPayoffPlan>(cacheKey);
    if (cached) return cached;

    const debts = await Debt.find({
      userId,
      status: 'active',
      isActive: true,
    });

    if (debts.length === 0) {
      throw new BadRequestError('No active debts found');
    }

    // Sort by strategy
    const sortedDebts = [...debts].sort((a, b) => {
      if (strategy === 'avalanche') {
        return b.interestRate - a.interestRate; // Highest interest first
      } else {
        return a.currentBalance - b.currentBalance; // Lowest balance first
      }
    });

    const totalMinimumPayment = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
    const totalMonthlyPayment = totalMinimumPayment + extraMonthlyPayment;

    // Simulate payoff
    const debtSimulations = sortedDebts.map((d, index) => ({
      id: d._id.toString(),
      name: d.name,
      balance: d.currentBalance,
      interestRate: d.interestRate,
      minimumPayment: d.minimumPayment,
      monthlyPayment: d.minimumPayment,
      totalInterest: 0,
      months: 0,
      priority: index + 1,
    }));

    let extraPayment = extraMonthlyPayment;
    let month = 0;
    const maxMonths = 360; // 30 years max

    while (debtSimulations.some((d) => d.balance > 0) && month < maxMonths) {
      month++;
      let availableExtra = extraPayment;

      for (let i = 0; i < debtSimulations.length; i++) {
        const debt = debtSimulations[i];

        if (debt.balance <= 0) continue;

        // Calculate monthly interest
        const monthlyInterest = (debt.balance * debt.interestRate) / 100 / 12;
        debt.totalInterest += monthlyInterest;

        // Determine payment
        let payment = debt.minimumPayment;

        // Apply extra payment to highest priority debt
        if (i === debtSimulations.findIndex((d) => d.balance > 0)) {
          payment += availableExtra;
        }

        // Apply payment
        debt.balance = Math.max(0, debt.balance + monthlyInterest - payment);

        if (debt.balance === 0 && debt.months === 0) {
          debt.months = month;
          // Redistribute this debt's minimum payment as extra
          availableExtra += debt.minimumPayment;
        }
      }
    }

    // Calculate results
    const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
    const totalInterest = debtSimulations.reduce((sum, d) => sum + d.totalInterest, 0);
    const payoffMonths = Math.max(...debtSimulations.map((d) => d.months));

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + payoffMonths);

    const plan: DebtPayoffPlan = {
      strategy,
      totalDebt,
      totalMonthlyPayment,
      payoffDate,
      totalInterest: Math.round(totalInterest * 100) / 100,
      debts: debtSimulations.map((d) => {
        const payoff = new Date();
        payoff.setMonth(payoff.getMonth() + d.months);

        return {
          id: d.id,
          name: d.name,
          currentBalance: debts.find((debt) => debt._id.toString() === d.id)!.currentBalance,
          interestRate: d.interestRate,
          monthlyPayment: d.monthlyPayment,
          payoffDate: payoff,
          totalInterest: Math.round(d.totalInterest * 100) / 100,
          priority: d.priority,
        };
      }),
    };

    await cacheSet(cacheKey, plan, 600);

    return plan;
  }
}

export const debtService = new DebtService();
