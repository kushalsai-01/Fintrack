// ============================================================================
// SHARED TYPES - Core Application Types
// ============================================================================

// User & Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  monthlyIncome?: number;
  preferredCurrency: string;
  timezone: string;
  settings: UserSettings;
  gamification: GamificationData;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  darkMode: boolean;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  language: string;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  billReminders: boolean;
  budgetAlerts: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
}

export interface PrivacySettings {
  shareData: boolean;
  analyticsOptIn: boolean;
}

export interface GamificationData {
  level: number;
  experience: number;
  badges: Badge[];
  streaks: StreakData;
  achievements: Achievement[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
  category: 'savings' | 'budgeting' | 'goals' | 'streak' | 'special';
}

export interface StreakData {
  current: number;
  longest: number;
  lastActivityDate: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  completedAt?: Date;
}

// Authentication Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  monthlyIncome?: number;
  preferredCurrency?: string;
}

// Transaction Types
export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  convertedAmount?: number;
  description: string;
  notes?: string;
  category: string;
  categorySource: CategorySource;
  paymentMethod: PaymentMethod;
  needsVsWants: NeedsVsWants;
  needsVsWantsSource: CategorySource;
  aiConfidence?: number;
  aiReasoning?: string;
  date: Date;
  isRecurring: boolean;
  recurringId?: string;
  tags: string[];
  receiptUrl?: string;
  merchant?: MerchantInfo;
  location?: LocationInfo;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategorySource = 'user' | 'ai' | 'auto';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'crypto' | 'other';
export type NeedsVsWants = 'needs' | 'wants' | 'unknown';

export interface MerchantInfo {
  name: string;
  category?: string;
  logo?: string;
}

export interface LocationInfo {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateTransactionDTO {
  type: TransactionType;
  amount: number;
  currency?: string;
  description: string;
  notes?: string;
  category?: string;
  paymentMethod?: PaymentMethod;
  needsVsWants?: NeedsVsWants;
  date: Date;
  isRecurring?: boolean;
  tags?: string[];
}

export interface UpdateTransactionDTO extends Partial<CreateTransactionDTO> {}

export interface TransactionFilters {
  type?: TransactionType;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: PaymentMethod;
  isRecurring?: boolean;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Category Types
export interface Category {
  id: string;
  userId?: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  parentId?: string;
  budget?: number;
  budgetLimit?: number; // Alias for budget
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryWithStats extends Category {
  budgetLimit?: number;
  totalSpent?: number;
  transactionCount?: number;
  percentUsed?: number;
}

export type CategoryType = 'income' | 'expense' | 'both';

export interface CreateCategoryDTO {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  parentId?: string;
  budget?: number;
}

// Budget Types
export interface Budget {
  id: string;
  userId: string;
  name?: string;
  categoryId: string;
  category: Category;
  color?: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
  spent: number;
  remaining: number;
  percentUsed: number;
  alertThreshold?: number;
  isShared: boolean;
  sharedWith?: string[];
  alerts: BudgetAlert[];
  createdAt: Date;
  updatedAt: Date;
}

export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface BudgetAlert {
  threshold: number;
  notified: boolean;
  notifiedAt?: Date;
}

export interface CreateBudgetDTO {
  name?: string;
  categoryId: string;
  category?: string; // Alias for categoryId (name)
  amount: number;
  period: BudgetPeriod;
  startDate?: Date;
  alerts?: number[];
  alertThreshold?: number;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentUsed: number;
  budgets: BudgetWithCategory[];
}

export interface BudgetWithCategory extends Budget {
  category: Category;
}

// Financial Health Types
export interface FinancialHealth {
  id: string;
  userId: string;
  overallScore: number;
  grade: HealthGrade;
  subScores: HealthSubScores;
  categoryScores?: CategoryScores;
  explanation: string;
  recommendations: HealthRecommendation[];
  trends: HealthTrends;
  computedAt: Date;
}

export interface CategoryScores {
  savings?: number;
  spending?: number;
  goals?: number;
  debt?: number;
  [key: string]: number | undefined;
}

export interface CategoryScore {
  category: string;
  score: number;
  spent?: number;
  budget?: number;
}

export type HealthGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export interface HealthSubScores {
  savingsRate: ScoreDetail;
  spendingVolatility: ScoreDetail;
  incomeExpenseRatio: ScoreDetail;
  budgetAdherence: ScoreDetail;
  anomalyScore: ScoreDetail;
  debtToIncome?: ScoreDetail;
  emergencyFund?: ScoreDetail;
}

export interface ScoreDetail {
  score: number;
  weight: number;
  explanation: string;
  trend: 'up' | 'down' | 'stable';
}

export interface HealthRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  actionable: string;
  potentialImpact: number;
  potentialSavings?: number;
}

export interface HealthTrends {
  lastWeek: number;
  lastMonth: number;
  last3Months: number;
  direction: 'improving' | 'declining' | 'stable';
}

// Forecast Types
export interface Forecast {
  id: string;
  userId: string;
  forecastType: ForecastType;
  predictions: ForecastPrediction[];
  summary: ForecastSummary;
  riskLevel: RiskLevel;
  riskIndicators: RiskIndicator[];
  generatedAt: Date;
  validUntil: Date;
}

export type ForecastType = '7day' | '14day' | '30day' | '90day';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ForecastPrediction {
  date: Date;
  predictedBalance: number;
  predictedIncome: number;
  predictedExpense: number;
  confidenceLower: number;
  confidenceUpper: number;
  confidence: number;
}

export interface ForecastSummary {
  startBalance: number;
  endBalance: number;
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  averageDaily: number;
  minBalance: number;
  minBalanceDate: Date;
}

export interface RiskIndicator {
  type: string;
  severity: RiskLevel;
  message: string;
  date?: Date;
  amount?: number;
}

// Goal Types
export interface Goal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  startDate: Date;
  targetDate: Date;
  priority: GoalPriority;
  status: GoalStatus;
  progress: number;
  monthlyContribution: number;
  autoContribute: boolean;
  linkedAccountId?: string;
  milestones: GoalMilestone[];
  aiRecommended: boolean;
  aiReasoning?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type GoalType = 'savings' | 'debt_payoff' | 'investment' | 'purchase' | 'emergency_fund' | 'retirement' | 'custom';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export interface GoalMilestone {
  id: string;
  name: string;
  targetAmount: number;
  reachedAt?: Date;
  isCompleted: boolean;
}

export interface CreateGoalDTO {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  type: GoalType;
  targetAmount: number;
  currentAmount?: number;
  targetDate: Date;
  priority?: GoalPriority;
  monthlyContribution?: number;
  autoContribute?: boolean;
}

// Bill & Reminder Types
export interface Bill {
  id: string;
  userId: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  category: string;
  icon?: string;
  color?: string;
  notes?: string;
  frequency: BillFrequency;
  dueDate: Date;
  nextDueDate: Date;
  lastPaidDate?: Date;
  autoPay: boolean;
  isAutoPay?: boolean; // Alias for autoPay
  paymentMethod?: PaymentMethod;
  merchant?: MerchantInfo;
  reminderDays: number[];
  status: BillStatus;
  history: BillPayment[];
  createdAt: Date;
  updatedAt: Date;
}

export type BillFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually' | 'custom';
export type BillStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface BillPayment {
  id: string;
  amount: number;
  paidAt: Date;
  transactionId?: string;
  notes?: string;
}

export interface CreateBillDTO {
  name: string;
  description?: string;
  amount: number;
  category: string;
  icon?: string;
  color?: string;
  notes?: string;
  frequency: BillFrequency;
  dueDate: Date;
  autoPay?: boolean;
  isAutoPay?: boolean;
  paymentMethod?: PaymentMethod;
  reminderDays?: number[];
}

// Investment Types
export interface Investment {
  id: string;
  userId: string;
  name: string;
  symbol?: string;
  type: InvestmentType;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: string;
  purchaseDate: Date;
  platformId?: string;
  notes?: string;
  performance: InvestmentPerformance;
  createdAt: Date;
  updatedAt: Date;
}

export type InvestmentType = 'stock' | 'etf' | 'mutual_fund' | 'bond' | 'crypto' | 'real_estate' | 'commodity' | 'other';

export interface InvestmentPerformance {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  percentageGain: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  percentageGain: number;
  dayChange: number;
  allocation: AllocationItem[];
  topPerformers: Investment[];
  worstPerformers: Investment[];
}

export interface AllocationItem {
  type: InvestmentType;
  value: number;
  percentage: number;
  count: number;
}

// Debt Types
export interface Debt {
  id: string;
  userId: string;
  name: string;
  type: DebtType;
  status?: DebtStatus;
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: number;
  dueDay?: number; // Alias for dueDate
  startDate: Date;
  estimatedPayoffDate?: Date;
  lender?: string;
  accountNumber?: string;
  notes?: string;
  payments: DebtPayment[];
  createdAt: Date;
  updatedAt: Date;
}

export type DebtType = 'credit_card' | 'student_loan' | 'mortgage' | 'auto_loan' | 'personal_loan' | 'medical' | 'other';
export type DebtStatus = 'active' | 'paid_off' | 'deferred' | 'default';

export interface DebtPayment {
  id: string;
  amount: number;
  principal: number;
  interest: number;
  paidAt: Date;
  transactionId?: string;
}

export interface DebtPayoffPlan {
  strategy: PayoffStrategy;
  debts: DebtPayoffItem[];
  totalDebt: number;
  totalInterest: number;
  payoffDate: Date;
  monthlyPayment: number;
  timeline: PayoffTimeline[];
}

export type PayoffStrategy = 'snowball' | 'avalanche' | 'custom';

export interface DebtPayoffItem {
  debtId: string;
  name: string;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  payoffOrder: number;
  payoffDate: Date;
  totalInterestPaid: number;
}

export interface PayoffTimeline {
  month: Date;
  payments: { debtId: string; amount: number; remainingBalance: number }[];
  totalRemaining: number;
}

// Recurring Transaction Types
export interface RecurringTransaction {
  id: string;
  userId: string;
  name: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date;
  nextOccurrence: Date;
  isActive: boolean;
  autoCreate: boolean;
  aiDetected: boolean;
  transactions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';

// Multi-Currency Types
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  updatedAt: Date;
}

// Shared Budget Types
export interface SharedBudget {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: SharedBudgetMember[];
  budgets: Budget[];
  totalBudget: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SharedBudgetMember {
  userId: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'avatar'>;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
  contributionPercent?: number;
}

// Notification Types
export interface Notification {
  id: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  isRead?: boolean;
  read?: boolean; // Alias for isRead
  readAt?: Date;
  actionUrl?: string;
  createdAt: Date | string;
}

export type NotificationType = 
  | 'budget_alert'
  | 'bill_reminder'
  | 'goal_milestone'
  | 'anomaly_detected'
  | 'health_score_change'
  | 'achievement_earned'
  | 'system'
  | 'ai_insight'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// AI Advisor Types
export interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    relatedTransactions?: string[];
    relatedGoals?: string[];
    charts?: ChartData[];
  };
}

export interface AdvisorConversation {
  id: string;
  userId: string;
  messages: AdvisorMessage[];
  context?: AdvisorContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdvisorContext {
  recentTransactions?: Transaction[];
  healthScore?: FinancialHealth;
  activeGoals?: Goal[];
  upcomingBills?: Bill[];
}

// Report Types
export interface Report {
  id: string;
  userId: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  dateRange: DateRange;
  sections: ReportSection[];
  status: ReportStatus;
  fileUrl?: string;
  fileSize?: number;
  generatedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export type ReportType = 'monthly' | 'quarterly' | 'annual' | 'tax' | 'custom';
export type ReportFormat = 'pdf' | 'excel' | 'csv';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ReportSection {
  type: 'summary' | 'transactions' | 'categories' | 'trends' | 'goals' | 'investments';
  enabled: boolean;
  options?: Record<string, unknown>;
}

export interface CreateReportDTO {
  name: string;
  type: ReportType;
  format: ReportFormat;
  dateRange: DateRange;
  sections: ReportSection[];
}

// Bank Integration Types
export interface BankConnection {
  id: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  institutionLogo?: string;
  accessToken: string;
  itemId: string;
  accounts: BankAccount[];
  status: ConnectionStatus;
  lastSynced?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ConnectionStatus = 'active' | 'pending' | 'error' | 'disconnected';

export interface BankAccount {
  id: string;
  connectionId: string;
  accountId: string;
  name: string;
  officialName?: string;
  type: BankAccountType;
  subtype?: string;
  mask?: string;
  currentBalance?: number;
  availableBalance?: number;
  currency: string;
  isActive: boolean;
}

export type BankAccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'other';

// Shopping Insights Types
export interface ShoppingInsight {
  id: string;
  userId: string;
  merchant: string;
  category: string;
  averageSpend: number;
  frequency: number;
  lastPurchase: Date;
  priceHistory: PricePoint[];
  recommendations: ShoppingRecommendation[];
}

export interface PricePoint {
  date: Date;
  amount: number;
  transactionId: string;
}

export interface ShoppingRecommendation {
  type: 'price_drop' | 'alternative' | 'bulk_buy' | 'timing';
  title: string;
  description: string;
  potentialSavings?: number;
}

// Receipt OCR Types
export interface ReceiptScanResult {
  success: boolean;
  confidence: number;
  data?: {
    merchant: string;
    date: Date;
    total: number;
    subtotal?: number;
    tax?: number;
    tip?: number;
    items?: ReceiptItem[];
    paymentMethod?: PaymentMethod;
    category?: string;
  };
  rawText?: string;
  errors?: string[];
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Analytics Types
export interface MonthlySummary {
  year: number;
  month: number;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
  topCategories: CategorySummary[];
  comparison: MonthComparison;
}

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  trend: number;
}

export interface MonthComparison {
  incomeChange: number;
  incomeChangePercent: number;
  expenseChange: number;
  expenseChangePercent: number;
  savingsChange: number;
  savingsChangePercent: number;
}

export interface SpendingTrend {
  period: string;
  income: number;
  expense: number;
  savings: number;
  categories: Record<string, number>;
}

// Chart Data Types
export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'donut';
  title: string;
  data: ChartDataPoint[];
  config?: ChartConfig;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartConfig {
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// WebSocket Event Types
export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  payload: T;
  timestamp: Date;
}

export type WebSocketEventType =
  | 'notification'
  | 'transaction_created'
  | 'budget_alert'
  | 'health_score_update'
  | 'goal_progress'
  | 'bill_reminder'
  | 'sync_complete';

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
// Trend Types
export interface Trend {
  period: string;
  month?: string;
  value: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'stable';
  income?: number;
  expense?: number;
  savings?: number;
}

export type TrendDirection = 'up' | 'down' | 'stable';