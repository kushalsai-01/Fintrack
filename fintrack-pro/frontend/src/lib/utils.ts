import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with proper locale
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format compact number (e.g., 1.5K, 2.3M)
 */
export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(num);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Format date relative to now
 */
export function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Format date to display string
 */
export function formatDate(date: Date | string, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = new Date(date);
  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'short' as const, day: 'numeric' as const },
    medium: { month: 'short' as const, day: 'numeric' as const, year: 'numeric' as const },
    long: { weekday: 'long' as const, month: 'long' as const, day: 'numeric' as const, year: 'numeric' as const },
  };
  
  return d.toLocaleDateString('en-US', optionsMap[format]);
}

/**
 * Get health score color class
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-500';
  if (score >= 75) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Get health score background color class
 */
export function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 75) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * Get health grade from score
 */
export function getScoreGrade(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Get transaction type color
 */
export function getTransactionColor(type: 'income' | 'expense' | 'transfer'): string {
  switch (type) {
    case 'income':
      return 'text-success';
    case 'expense':
      return 'text-destructive';
    case 'transfer':
      return 'text-info';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Get trend arrow icon name
 */
export function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'TrendingUp';
    case 'down':
      return 'TrendingDown';
    default:
      return 'Minus';
  }
}

/**
 * Calculate percentage change
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

/**
 * Check if value is empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Group array by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Parse query string
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

/**
 * Local storage helpers with type safety
 */
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },
  
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};

/**
 * Category icons mapping
 */
export const categoryIcons: Record<string, string> = {
  'Food & Dining': 'UtensilsCrossed',
  'Transportation': 'Car',
  'Shopping': 'ShoppingBag',
  'Entertainment': 'Film',
  'Bills & Utilities': 'FileText',
  'Healthcare': 'Heart',
  'Education': 'GraduationCap',
  'Travel': 'Plane',
  'Personal Care': 'Sparkles',
  'Groceries': 'ShoppingCart',
  'Rent/Mortgage': 'Home',
  'Insurance': 'Shield',
  'Investments': 'TrendingUp',
  'Salary': 'Wallet',
  'Freelance': 'Briefcase',
  'Gifts': 'Gift',
  'Other': 'MoreHorizontal',
};

/**
 * Default category colors
 */
export const categoryColors: Record<string, string> = {
  'Food & Dining': '#ef4444',
  'Transportation': '#f97316',
  'Shopping': '#eab308',
  'Entertainment': '#84cc16',
  'Bills & Utilities': '#22c55e',
  'Healthcare': '#14b8a6',
  'Education': '#06b6d4',
  'Travel': '#0ea5e9',
  'Personal Care': '#3b82f6',
  'Groceries': '#6366f1',
  'Rent/Mortgage': '#8b5cf6',
  'Insurance': '#a855f7',
  'Investments': '#d946ef',
  'Salary': '#10b981',
  'Freelance': '#6ee7b7',
  'Gifts': '#f472b6',
  'Other': '#9ca3af',
};
