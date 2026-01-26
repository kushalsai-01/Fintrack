import mongoose from 'mongoose';
import { Transaction, Budget, Goal, Bill, Debt, Investment } from '../models/index.js';
import { cacheGet, cacheSet } from '../config/redis.js';
import { getStartOfMonth, getEndOfMonth, getDateRange } from '../utils/index.js';

interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
}

interface TrendData {
  date: string;
  income: number;
  expenses: number;
  net: number;
}

interface FinancialHealth {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    category: string;
    score: number;
    weight: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
  }[];
  recommendations: string[];
}

export class AnalyticsService {
  // Get monthly summary
  async getMonthlySummary(
    userId: string,
    months = 12
  ): Promise<MonthlySummary[]> {
    const cacheKey = `analytics:${userId}:monthly:${months}`;
    
    const cached = await cacheGet<MonthlySummary[]>(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const result = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          income: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] },
          },
          expenses: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] },
          },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    const summary: MonthlySummary[] = result.map((item) => {
      const month = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      const savings = item.income - item.expenses;
      const savingsRate = item.income > 0 ? (savings / item.income) * 100 : 0;

      return {
        month,
        income: item.income,
        expenses: item.expenses,
        savings,
        savingsRate: Math.round(savingsRate * 10) / 10,
      };
    });

    await cacheSet(cacheKey, summary, 300);

    return summary;
  }

  // Get spending trends
  async getSpendingTrends(
    userId: string,
    period: 'week' | 'month' | 'quarter' | 'year'
  ): Promise<TrendData[]> {
    const { startDate, endDate } = getDateRange(period);

    const groupBy = period === 'week' ? { $dayOfWeek: '$date' } : { $dayOfMonth: '$date' };

    const result = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            date: period === 'year' ? { $month: '$date' } : { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          },
          income: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] },
          },
          expenses: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] },
          },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    return result.map((item) => ({
      date: String(item._id.date),
      income: item.income,
      expenses: item.expenses,
      net: item.income - item.expenses,
    }));
  }

  // Get financial health score
  async getFinancialHealth(userId: string): Promise<FinancialHealth> {
    const cacheKey = `analytics:${userId}:health`;
    
    const cached = await cacheGet<FinancialHealth>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startOfMonth = getStartOfMonth();
    const endOfMonth = getEndOfMonth();

    // Get data for calculations
    const [transactions, budgets, goals, bills, debts, investments] = await Promise.all([
      Transaction.find({
        userId,
        date: { $gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) },
      }),
      Budget.find({ userId, isActive: true }),
      Goal.find({ userId, status: 'active' }),
      Bill.find({ userId, isActive: true }),
      Debt.find({ userId, status: 'active' }),
      Investment.find({ userId, isActive: true }),
    ]);

    // Calculate individual scores
    const breakdown: FinancialHealth['breakdown'] = [];
    const recommendations: string[] = [];

    // 1. Savings Rate Score (25% weight)
    const monthlyData = transactions.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        else acc.expenses += t.amount;
        return acc;
      },
      { income: 0, expenses: 0 }
    );

    const savingsRate = monthlyData.income > 0
      ? ((monthlyData.income - monthlyData.expenses) / monthlyData.income) * 100
      : 0;

    let savingsScore = 0;
    let savingsStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';

    if (savingsRate >= 20) {
      savingsScore = 100;
      savingsStatus = 'excellent';
    } else if (savingsRate >= 10) {
      savingsScore = 75;
      savingsStatus = 'good';
    } else if (savingsRate >= 5) {
      savingsScore = 50;
      savingsStatus = 'fair';
    } else if (savingsRate > 0) {
      savingsScore = 25;
      savingsStatus = 'poor';
      recommendations.push('Try to increase your savings rate to at least 10%');
    } else {
      savingsScore = 0;
      savingsStatus = 'poor';
      recommendations.push('You\'re spending more than you earn. Review your expenses.');
    }

    breakdown.push({
      category: 'Savings Rate',
      score: savingsScore,
      weight: 25,
      status: savingsStatus,
    });

    // 2. Budget Adherence Score (20% weight)
    let budgetScore = 100;
    let budgetStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

    if (budgets.length > 0) {
      const overBudgetCount = budgets.filter(
        (b) => b.spent > b.amount + b.rolloverAmount
      ).length;
      const nearLimitCount = budgets.filter(
        (b) => b.spent > (b.amount + b.rolloverAmount) * 0.9
      ).length;

      budgetScore = Math.max(0, 100 - (overBudgetCount * 20) - (nearLimitCount * 10));

      if (budgetScore >= 90) budgetStatus = 'excellent';
      else if (budgetScore >= 70) budgetStatus = 'good';
      else if (budgetScore >= 50) budgetStatus = 'fair';
      else budgetStatus = 'poor';

      if (overBudgetCount > 0) {
        recommendations.push(`${overBudgetCount} budget(s) exceeded. Review spending in those categories.`);
      }
    } else {
      recommendations.push('Set up budgets to track your spending better.');
    }

    breakdown.push({
      category: 'Budget Adherence',
      score: budgetScore,
      weight: 20,
      status: budgetStatus,
    });

    // 3. Goal Progress Score (20% weight)
    let goalScore = 100;
    let goalStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

    if (goals.length > 0) {
      const onTrackGoals = goals.filter((g) => {
        const progress = g.currentAmount / g.targetAmount;
        const daysTotal = (new Date(g.targetDate).getTime() - new Date(g.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const daysElapsed = (now.getTime() - new Date(g.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const expectedProgress = daysElapsed / daysTotal;
        return progress >= expectedProgress * 0.9;
      }).length;

      goalScore = (onTrackGoals / goals.length) * 100;

      if (goalScore >= 90) goalStatus = 'excellent';
      else if (goalScore >= 70) goalStatus = 'good';
      else if (goalScore >= 50) goalStatus = 'fair';
      else goalStatus = 'poor';

      if (goalScore < 70) {
        recommendations.push('Some goals are behind schedule. Consider increasing contributions.');
      }
    } else {
      recommendations.push('Set financial goals to stay motivated and track progress.');
    }

    breakdown.push({
      category: 'Goal Progress',
      score: goalScore,
      weight: 20,
      status: goalStatus,
    });

    // 4. Debt Management Score (20% weight)
    let debtScore = 100;
    let debtStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

    if (debts.length > 0) {
      const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
      const avgInterestRate = debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length;
      const monthlyIncome = monthlyData.income / 3; // Average monthly

      const debtToIncomeRatio = monthlyIncome > 0 ? (totalDebt / (monthlyIncome * 12)) * 100 : 0;

      if (debtToIncomeRatio <= 20) {
        debtScore = 100;
        debtStatus = 'excellent';
      } else if (debtToIncomeRatio <= 35) {
        debtScore = 75;
        debtStatus = 'good';
      } else if (debtToIncomeRatio <= 50) {
        debtScore = 50;
        debtStatus = 'fair';
        recommendations.push('Consider focusing on paying down high-interest debt.');
      } else {
        debtScore = 25;
        debtStatus = 'poor';
        recommendations.push('Your debt-to-income ratio is high. Prioritize debt repayment.');
      }
    }

    breakdown.push({
      category: 'Debt Management',
      score: debtScore,
      weight: 20,
      status: debtStatus,
    });

    // 5. Bill Management Score (15% weight)
    let billScore = 100;
    let billStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

    if (bills.length > 0) {
      const overdueBills = bills.filter((b) => b.status === 'overdue').length;
      billScore = Math.max(0, 100 - (overdueBills * 25));

      if (billScore >= 90) billStatus = 'excellent';
      else if (billScore >= 70) billStatus = 'good';
      else if (billScore >= 50) billStatus = 'fair';
      else billStatus = 'poor';

      if (overdueBills > 0) {
        recommendations.push(`You have ${overdueBills} overdue bill(s). Pay them to avoid late fees.`);
      }
    }

    breakdown.push({
      category: 'Bill Management',
      score: billScore,
      weight: 15,
      status: billStatus,
    });

    // Calculate overall score
    const totalScore = breakdown.reduce((sum, item) => sum + (item.score * item.weight / 100), 0);

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (totalScore >= 90) grade = 'A';
    else if (totalScore >= 80) grade = 'B';
    else if (totalScore >= 70) grade = 'C';
    else if (totalScore >= 60) grade = 'D';
    else grade = 'F';

    const health: FinancialHealth = {
      score: Math.round(totalScore),
      grade,
      breakdown,
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
    };

    await cacheSet(cacheKey, health, 600); // Cache for 10 minutes

    return health;
  }

  // Get dashboard data
  async getDashboardData(userId: string): Promise<{
    summary: {
      totalIncome: number;
      totalExpenses: number;
      netSavings: number;
      savingsRate: number;
    };
    recentTransactions: any[];
    upcomingBills: any[];
    goalProgress: any[];
    healthScore: number;
  }> {
    const startOfMonth = getStartOfMonth();
    const endOfMonth = getEndOfMonth();

    const [transactions, recentTransactions, bills, goals, health] = await Promise.all([
      Transaction.find({
        userId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
      }),
      Transaction.find({ userId })
        .sort({ date: -1 })
        .limit(5)
        .populate('categoryId'),
      Bill.find({
        userId,
        isActive: true,
        dueDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      })
        .sort({ dueDate: 1 })
        .limit(5),
      Goal.find({ userId, status: 'active' })
        .sort({ targetDate: 1 })
        .limit(5),
      this.getFinancialHealth(userId),
    ]);

    const summary = transactions.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.totalIncome += t.amount;
        else acc.totalExpenses += t.amount;
        return acc;
      },
      { totalIncome: 0, totalExpenses: 0 }
    );

    const netSavings = summary.totalIncome - summary.totalExpenses;
    const savingsRate = summary.totalIncome > 0
      ? (netSavings / summary.totalIncome) * 100
      : 0;

    return {
      summary: {
        ...summary,
        netSavings,
        savingsRate: Math.round(savingsRate * 10) / 10,
      },
      recentTransactions,
      upcomingBills: bills,
      goalProgress: goals.map((g) => ({
        id: g._id,
        name: g.name,
        progress: Math.round((g.currentAmount / g.targetAmount) * 100),
        remaining: g.targetAmount - g.currentAmount,
        targetDate: g.targetDate,
      })),
      healthScore: health.score,
    };
  }
}

export const analyticsService = new AnalyticsService();
