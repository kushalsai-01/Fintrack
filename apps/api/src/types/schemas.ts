/**
 * Zod validation schemas for API requests
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ============================================================================
// Auth Schemas
// ============================================================================

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    currency: z.string().length(3).default('USD'),
    timezone: z.string().default('UTC'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

// ============================================================================
// User Schemas
// ============================================================================

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    currency: z.string().length(3).optional(),
    locale: z.string().optional(),
    timezone: z.string().optional(),
  }),
});

export const updatePreferencesSchema = z.object({
  body: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    weeklyReport: z.boolean().optional(),
    monthlyReport: z.boolean().optional(),
    budgetAlerts: z.boolean().optional(),
    goalAlerts: z.boolean().optional(),
    billReminders: z.boolean().optional(),
    anomalyAlerts: z.boolean().optional(),
    darkMode: z.boolean().optional(),
    compactView: z.boolean().optional(),
    defaultView: z.enum(['dashboard', 'transactions', 'analytics']).optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

// ============================================================================
// Transaction Schemas
// ============================================================================

export const createTransactionSchema = z.object({
  body: z.object({
    type: z.enum(['income', 'expense', 'transfer']),
    amount: z.number().positive('Amount must be positive'),
    description: z.string().min(1, 'Description is required').max(500),
    categoryId: objectIdSchema,
    date: z.coerce.date().optional(),
    merchant: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
    tags: z.array(z.string()).max(10).optional(),
    receiptUrl: z.string().url().optional(),
    isRecurring: z.boolean().optional(),
    recurringId: objectIdSchema.optional(),
  }),
});

export const updateTransactionSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    type: z.enum(['income', 'expense', 'transfer']).optional(),
    amount: z.number().positive().optional(),
    description: z.string().min(1).max(500).optional(),
    categoryId: objectIdSchema.optional(),
    date: z.coerce.date().optional(),
    merchant: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
    tags: z.array(z.string()).max(10).optional(),
    receiptUrl: z.string().url().optional().nullable(),
  }),
});

export const getTransactionsSchema = z.object({
  query: paginationSchema.merge(dateRangeSchema).extend({
    type: z.enum(['income', 'expense', 'transfer']).optional(),
    categoryId: objectIdSchema.optional(),
    minAmount: z.coerce.number().optional(),
    maxAmount: z.coerce.number().optional(),
    search: z.string().optional(),
    isRecurring: z.coerce.boolean().optional(),
    isAnomaly: z.coerce.boolean().optional(),
  }),
});

// ============================================================================
// Category Schemas
// ============================================================================

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(50),
    type: z.enum(['income', 'expense']),
    icon: z.string().max(10).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
    budget: z.number().positive().optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    icon: z.string().max(10).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    budget: z.number().positive().optional().nullable(),
  }),
});

// ============================================================================
// Budget Schemas
// ============================================================================

export const createBudgetSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    amount: z.number().positive('Amount must be positive'),
    categoryId: objectIdSchema.optional(),
    period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    alertThreshold: z.number().min(0).max(100).default(80),
    alertEnabled: z.boolean().default(true),
    rollover: z.boolean().default(false),
  }),
});

export const updateBudgetSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    amount: z.number().positive().optional(),
    categoryId: objectIdSchema.optional().nullable(),
    period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    alertThreshold: z.number().min(0).max(100).optional(),
    alertEnabled: z.boolean().optional(),
    rollover: z.boolean().optional(),
  }),
});

// ============================================================================
// Goal Schemas
// ============================================================================

export const createGoalSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    targetAmount: z.number().positive('Target amount must be positive'),
    currentAmount: z.number().min(0).default(0),
    targetDate: z.coerce.date(),
    icon: z.string().max(10).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    autoContribute: z.boolean().default(false),
    autoContributeAmount: z.number().positive().optional(),
    autoContributeDay: z.number().min(1).max(28).optional(),
  }),
});

export const updateGoalSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    targetAmount: z.number().positive().optional(),
    targetDate: z.coerce.date().optional(),
    icon: z.string().max(10).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    autoContribute: z.boolean().optional(),
    autoContributeAmount: z.number().positive().optional(),
    autoContributeDay: z.number().min(1).max(28).optional(),
  }),
});

export const goalContributionSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    note: z.string().max(200).optional(),
  }),
});

// ============================================================================
// Bill Schemas
// ============================================================================

export const createBillSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    amount: z.number().positive('Amount must be positive'),
    dueDate: z.coerce.date(),
    frequency: z.enum(['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
    categoryId: objectIdSchema.optional(),
    autopay: z.boolean().default(false),
    reminderDays: z.number().min(0).max(30).default(3),
    notes: z.string().max(500).optional(),
    website: z.string().url().optional(),
  }),
});

export const updateBillSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    amount: z.number().positive().optional(),
    dueDate: z.coerce.date().optional(),
    frequency: z.enum(['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).optional(),
    categoryId: objectIdSchema.optional().nullable(),
    autopay: z.boolean().optional(),
    reminderDays: z.number().min(0).max(30).optional(),
    notes: z.string().max(500).optional(),
    website: z.string().url().optional().nullable(),
  }),
});

// ============================================================================
// Investment Schemas
// ============================================================================

export const createInvestmentSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    type: z.enum(['stock', 'etf', 'mutual_fund', 'crypto', 'bond', 'real_estate', 'other']),
    symbol: z.string().max(20).optional(),
    shares: z.number().positive('Shares must be positive'),
    purchasePrice: z.number().positive('Purchase price must be positive'),
    currentPrice: z.number().positive('Current price must be positive'),
    purchaseDate: z.coerce.date(),
    notes: z.string().max(500).optional(),
  }),
});

export const updateInvestmentSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    symbol: z.string().max(20).optional(),
    currentPrice: z.number().positive().optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const investmentSharesSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    shares: z.number().positive('Shares must be positive'),
    price: z.number().positive('Price must be positive'),
  }),
});

// ============================================================================
// Debt Schemas
// ============================================================================

export const createDebtSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    type: z.enum(['credit_card', 'student_loan', 'mortgage', 'car_loan', 'personal_loan', 'medical', 'other']),
    originalBalance: z.number().positive('Original balance must be positive'),
    currentBalance: z.number().min(0),
    interestRate: z.number().min(0).max(100),
    minimumPayment: z.number().min(0),
    dueDate: z.coerce.date(),
    lender: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
  }),
});

export const updateDebtSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    currentBalance: z.number().min(0).optional(),
    interestRate: z.number().min(0).max(100).optional(),
    minimumPayment: z.number().min(0).optional(),
    dueDate: z.coerce.date().optional(),
    lender: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
  }),
});

export const debtPaymentSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    note: z.string().max(200).optional(),
  }),
});

export const payoffPlanSchema = z.object({
  query: z.object({
    strategy: z.enum(['avalanche', 'snowball']).default('avalanche'),
    extraPayment: z.coerce.number().min(0).default(0),
  }),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const analyticsQuerySchema = z.object({
  query: z.object({
    period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
});

// ============================================================================
// Export Types from Schemas
// ============================================================================

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>['body'];
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>['body'];
export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>['body'];
export type CreateGoalInput = z.infer<typeof createGoalSchema>['body'];
export type CreateBillInput = z.infer<typeof createBillSchema>['body'];
export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>['body'];
export type CreateDebtInput = z.infer<typeof createDebtSchema>['body'];
