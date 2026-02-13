/**
 * Common TypeScript types and interfaces for the backend
 */

import { Types } from 'mongoose';

// ============================================================================
// Base Types
// ============================================================================

export type ObjectId = Types.ObjectId;

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

// ============================================================================
// User Types
// ============================================================================

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  budgetAlerts: boolean;
  goalAlerts: boolean;
  billReminders: boolean;
  anomalyAlerts: boolean;
  darkMode: boolean;
  compactView: boolean;
  defaultView: 'dashboard' | 'transactions' | 'analytics';
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ============================================================================
// Transaction Types
// ============================================================================

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface TransactionFilter extends DateRangeFilter {
  type?: TransactionType;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  isRecurring?: boolean;
  isAnomaly?: boolean;
}

export interface TransactionCreateData {
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  date?: Date;
  merchant?: string;
  notes?: string;
  tags?: string[];
  receiptUrl?: string;
  isRecurring?: boolean;
  recurringId?: string;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
  averageTransaction: number;
}

// ============================================================================
// Category Types
// ============================================================================

export type CategoryType = 'income' | 'expense';

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  color: string;
  icon: string;
}

// ============================================================================
// Budget Types
// ============================================================================

export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  overBudgetCount: number;
  warningCount: number;
  onTrackCount: number;
}

// ============================================================================
// Goal Types
// ============================================================================

export type GoalPriority = 'low' | 'medium' | 'high';

export interface GoalContribution {
  amount: number;
  date: Date;
  note?: string;
}

export interface GoalMilestone {
  percentage: number;
  reachedAt?: Date;
}

export interface GoalSummary {
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgress: number;
  completedGoals: number;
  activeGoals: number;
  onTrackGoals: number;
  behindGoals: number;
}

// ============================================================================
// Bill Types
// ============================================================================

export type BillFrequency = 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type BillStatus = 'pending' | 'upcoming' | 'paid' | 'overdue';

export interface BillSummary {
  totalBills: number;
  paidThisMonth: number;
  upcomingAmount: number;
  overdueAmount: number;
  nextDueDate: Date | null;
}

// ============================================================================
// Investment Types
// ============================================================================

export type InvestmentType = 'stock' | 'etf' | 'mutual_fund' | 'crypto' | 'bond' | 'real_estate' | 'other';

export interface InvestmentPricePoint {
  date: Date;
  price: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  holdings: {
    type: InvestmentType;
    value: number;
    percentage: number;
  }[];
}

// ============================================================================
// Debt Types
// ============================================================================

export type DebtType = 'credit_card' | 'student_loan' | 'mortgage' | 'car_loan' | 'personal_loan' | 'medical' | 'other';
export type PayoffStrategy = 'avalanche' | 'snowball';

export interface DebtPayment {
  amount: number;
  date: Date;
  note?: string;
}

export interface DebtPayoffPlan {
  strategy: PayoffStrategy;
  totalDebt: number;
  totalInterest: number;
  monthlyPayment: number;
  payoffDate: Date;
  debts: {
    name: string;
    balance: number;
    interestRate: number;
    payoffOrder: number;
    payoffDate: Date;
  }[];
}

export interface DebtSummary {
  totalDebt: number;
  totalPaid: number;
  totalRemaining: number;
  monthlyPayments: number;
  highestInterestRate: number;
  debtsCount: number;
  paidOffCount: number;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType =
  | 'budget_alert'
  | 'goal_milestone'
  | 'bill_reminder'
  | 'anomaly_detected'
  | 'weekly_report'
  | 'monthly_report'
  | 'goal_completed'
  | 'achievement_unlocked'
  | 'system';

// ============================================================================
// Analytics Types
// ============================================================================

export interface FinancialHealthScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    category: string;
    score: number;
    weight: number;
    description: string;
  }[];
  recommendations: string[];
}

export interface SpendingTrend {
  period: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
}

export interface DashboardData {
  balance: number;
  income: number;
  expenses: number;
  savingsRate: number;
  budgetStatus: BudgetSummary;
  goalProgress: GoalSummary;
  recentTransactions: any[];
  upcomingBills: any[];
  notifications: any[];
  healthScore: number;
  trends: SpendingTrend[];
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: string;
    currency: string;
    locale: string;
    timezone: string;
    preferences: UserPreferences;
  };
  tokens: TokenPair;
}

// ============================================================================
// Socket.IO Types
// ============================================================================

export interface ServerToClientEvents {
  notification: (notification: any) => void;
  budgetAlert: (data: { budgetId: string; percentUsed: number; message: string }) => void;
  goalMilestone: (data: { goalId: string; milestone: number; message: string }) => void;
  transactionCreated: (transaction: any) => void;
  refresh: () => void;
}

export interface ClientToServerEvents {
  join: (userId: string) => void;
  leave: (userId: string) => void;
}

// ============================================================================
// Request Types (for Express)
// ============================================================================

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    userId: string;
    email: string;
    role: string;
  };
}
