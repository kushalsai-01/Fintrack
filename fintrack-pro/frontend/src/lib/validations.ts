import { z } from 'zod';

/**
 * Validation schemas for forms using Zod
 */

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  monthlyIncome: z.number().positive().optional(),
  preferredCurrency: z.string().default('USD'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Transaction Schemas
export const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  description: z.string().min(1, 'Description is required').max(500),
  notes: z.string().max(1000).optional(),
  category: z.string().optional(),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'digital_wallet', 'crypto', 'other']).default('card'),
  needsVsWants: z.enum(['needs', 'wants', 'unknown']).default('unknown'),
  date: z.date(),
  isRecurring: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

// Category Schema
export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  type: z.enum(['income', 'expense', 'both']),
  parentId: z.string().optional(),
  budget: z.number().positive().optional(),
});

// Budget Schema
export const budgetSchema = z.object({
  name: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  category: z.string().optional(), // Alias
  amount: z.number().positive('Budget amount must be positive'),
  period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  startDate: z.date().optional(),
  alertThreshold: z.number().min(0).max(100).optional(),
  alerts: z.array(z.number().min(1).max(100)).default([50, 75, 90, 100]),
});

// Goal Schema
export const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100),
  description: z.string().max(500).optional(),
  icon: z.string().default('Target'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'),
  type: z.enum(['savings', 'debt_payoff', 'investment', 'purchase', 'emergency_fund', 'retirement', 'custom']),
  targetAmount: z.number().positive('Target amount must be positive'),
  currentAmount: z.number().min(0).default(0),
  targetDate: z.date(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  monthlyContribution: z.number().min(0).optional(),
  autoContribute: z.boolean().default(false),
});

// Bill Schema
export const billSchema = z.object({
  name: z.string().min(1, 'Bill name is required').max(100),
  description: z.string().max(500).optional(),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'custom']),
  dueDate: z.date(),
  autoPay: z.boolean().default(false),
  isAutoPay: z.boolean().optional(), // Alias for autoPay
  notes: z.string().max(500).optional(),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'digital_wallet', 'crypto', 'other']).optional(),
  reminderDays: z.array(z.number().min(1).max(30)).default([3, 7]),
});

// Investment Schema
export const investmentSchema = z.object({
  name: z.string().min(1, 'Investment name is required').max(100),
  symbol: z.string().max(10).optional(),
  type: z.enum(['stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'real_estate', 'commodity', 'other']),
  quantity: z.number().positive('Quantity must be positive'),
  purchasePrice: z.number().positive('Purchase price must be positive'),
  currency: z.string().default('USD'),
  purchaseDate: z.date(),
  notes: z.string().max(500).optional(),
});

// Debt Schema
export const debtSchema = z.object({
  name: z.string().min(1, 'Debt name is required').max(100),
  type: z.enum(['credit_card', 'student_loan', 'mortgage', 'auto_loan', 'personal_loan', 'medical', 'other']),
  originalAmount: z.number().positive('Original amount must be positive'),
  currentBalance: z.number().min(0, 'Current balance cannot be negative'),
  interestRate: z.number().min(0).max(100, 'Interest rate must be between 0 and 100'),
  minimumPayment: z.number().positive('Minimum payment must be positive'),
  dueDate: z.number().min(1).max(31, 'Due date must be between 1 and 31'),
  dueDay: z.number().min(1).max(31).optional(), // Alias for dueDate
  startDate: z.date(),
  lender: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// Report Schema
export const reportSchema = z.object({
  name: z.string().min(1, 'Report name is required').max(100),
  type: z.enum(['monthly', 'quarterly', 'annual', 'tax', 'custom']),
  format: z.enum(['pdf', 'excel', 'csv']),
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }),
  sections: z.array(z.object({
    type: z.enum(['summary', 'transactions', 'categories', 'trends', 'goals', 'investments']),
    enabled: z.boolean(),
    options: z.record(z.unknown()).optional(),
  })),
});

// User Settings Schema
export const userSettingsSchema = z.object({
  darkMode: z.boolean(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    billReminders: z.boolean(),
    budgetAlerts: z.boolean(),
    weeklyReport: z.boolean(),
    monthlyReport: z.boolean(),
  }),
  privacy: z.object({
    shareData: z.boolean(),
    analyticsOptIn: z.boolean(),
  }),
  language: z.string().default('en'),
});

// Profile Schema
export const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  monthlyIncome: z.number().positive().optional(),
  preferredCurrency: z.string(),
  timezone: z.string(),
});

// Change Password Schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// AI Chat Schema
export const chatMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
});

// Type exports from schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type TransactionFormData = z.infer<typeof transactionSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type BudgetFormData = z.infer<typeof budgetSchema>;
export type GoalFormData = z.infer<typeof goalSchema>;
export type BillFormData = z.infer<typeof billSchema>;
export type InvestmentFormData = z.infer<typeof investmentSchema>;
export type DebtFormData = z.infer<typeof debtSchema>;
export type ReportFormData = z.infer<typeof reportSchema>;
export type UserSettingsFormData = z.infer<typeof userSettingsSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ChatMessageFormData = z.infer<typeof chatMessageSchema>;
