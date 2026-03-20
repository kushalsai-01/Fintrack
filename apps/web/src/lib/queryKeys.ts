/**
 * Centralised React Query key factory.
 * All useQuery / useMutation cache keys must come from here so that
 * invalidation is reliable and typo-proof.
 */

export const queryKeys = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  auth: {
    me: () => ['auth', 'me'] as const,
  },

  // ── Transactions ─────────────────────────────────────────────────────────
  transactions: {
    all: () => ['transactions'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? (['transactions', 'list', filters] as const) : (['transactions', 'list'] as const),
    detail: (id: string) => ['transactions', 'detail', id] as const,
    summary: (start?: string, end?: string) => ['transactions', 'summary', start, end] as const,
    export: () => ['transactions', 'export'] as const,
  },

  // ── Budgets ───────────────────────────────────────────────────────────────
  budgets: {
    all: () => ['budgets'] as const,
    list: () => ['budgets', 'list'] as const,
    active: () => ['budgets', 'active'] as const,
    status: () => ['budgets', 'status'] as const,
    detail: (id: string) => ['budgets', 'detail', id] as const,
  },

  // ── Goals ─────────────────────────────────────────────────────────────────
  goals: {
    all: () => ['goals'] as const,
    list: (status?: string) => (status ? (['goals', 'list', status] as const) : (['goals', 'list'] as const)),
    detail: (id: string) => ['goals', 'detail', id] as const,
    summary: () => ['goals', 'summary'] as const,
  },

  // ── Bills ─────────────────────────────────────────────────────────────────
  bills: {
    all: () => ['bills'] as const,
    list: (status?: string) => (status ? (['bills', 'list', status] as const) : (['bills', 'list'] as const)),
    upcoming: () => ['bills', 'upcoming'] as const,
    summary: () => ['bills', 'summary'] as const,
    detail: (id: string) => ['bills', 'detail', id] as const,
  },

  // ── Categories ────────────────────────────────────────────────────────────
  categories: {
    all: () => ['categories'] as const,
    list: () => ['categories', 'list'] as const,
    breakdown: (months?: number) =>
      months !== undefined ? (['categories', 'breakdown', months] as const) : (['categories', 'breakdown'] as const),
  },

  // ── Analytics ────────────────────────────────────────────────────────────
  analytics: {
    dashboard: () => ['analytics', 'dashboard'] as const,
    health: () => ['analytics', 'health'] as const,
    monthly: (year: number, month: number) => ['analytics', 'monthly', year, month] as const,
    trends: (months: number) => ['analytics', 'trends', months] as const,
    spending: (params?: Record<string, unknown>) =>
      params ? (['analytics', 'spending', params] as const) : (['analytics', 'spending'] as const),
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    all: () => ['notifications'] as const,
    list: (page?: number) => (page !== undefined ? (['notifications', 'list', page] as const) : (['notifications', 'list'] as const)),
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },

  // ── Investments ───────────────────────────────────────────────────────────
  investments: {
    all: () => ['investments'] as const,
    list: () => ['investments', 'list'] as const,
    portfolio: () => ['investments', 'portfolio'] as const,
    detail: (id: string) => ['investments', 'detail', id] as const,
    history: (id: string) => ['investments', 'history', id] as const,
  },

  // ── Debts ─────────────────────────────────────────────────────────────────
  debts: {
    all: () => ['debts'] as const,
    list: () => ['debts', 'list'] as const,
    summary: () => ['debts', 'summary'] as const,
    payoffPlan: () => ['debts', 'payoff-plan'] as const,
    detail: (id: string) => ['debts', 'detail', id] as const,
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    all: () => ['reports'] as const,
    monthly: (year: number, month: number) => ['reports', 'monthly', year, month] as const,
    annual: (year: number) => ['reports', 'annual', year] as const,
  },

  // ── ML / AI ───────────────────────────────────────────────────────────────
  ml: {
    insights: () => ['insights'] as const,
    forecast: () => ['forecast'] as const,
    healthScore: () => ['health-score'] as const,
    anomalies: () => ['anomalies'] as const,
    modelStatus: (userId: string) => ['ml', 'model-status', userId] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
