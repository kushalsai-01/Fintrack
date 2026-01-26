import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  PieChart,
  BarChart3,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { LoadingSpinner } from '@/components/ui/Loading';
import api from '@/services/api';
import { formatCurrency, cn } from '@/lib/utils';
import type { MonthlySummary, Trend, FinancialHealth } from '@shared/types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface TimeRange {
  value: string;
  label: string;
  months: number;
}

const TIME_RANGES: TimeRange[] = [
  { value: '3m', label: 'Last 3 Months', months: 3 },
  { value: '6m', label: 'Last 6 Months', months: 6 },
  { value: '1y', label: 'Last Year', months: 12 },
  { value: 'all', label: 'All Time', months: 60 },
];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('6m');
  const [activeTab, setActiveTab] = useState('overview');

  const selectedRange = TIME_RANGES.find((r) => r.value === timeRange) || TIME_RANGES[1];

  // Fetch trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['trends', timeRange],
    queryFn: () => api.get<Trend[]>(`/analytics/trends?months=${selectedRange.months}`),
  });

  // Fetch current month summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['monthly-summary'],
    queryFn: () => api.get<MonthlySummary>('/analytics/monthly'),
  });

  // Fetch health score
  const { data: healthScore, isLoading: healthLoading } = useQuery({
    queryKey: ['health-score'],
    queryFn: () => api.get<FinancialHealth>('/health/latest'),
  });

  // Fetch category breakdown
  const { data: categoryBreakdown, isLoading: categoryLoading } = useQuery({
    queryKey: ['category-breakdown', timeRange],
    queryFn: () =>
      api.get<{ category: string; amount: number; percentage: number; color: string }[]>(
        `/analytics/categories?months=${selectedRange.months}`
      ),
  });

  const isLoading = trendsLoading || summaryLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Prepare chart data
  const trendChartData =
    trends?.map((t) => ({
      month: new Date(t.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      income: t.income,
      expense: t.expense,
      savings: t.savings,
    })) || [];

  const categoryChartData =
    summary?.topCategories?.map((cat, idx) => ({
      name: cat.category,
      value: cat.amount,
      color: COLORS[idx % COLORS.length],
    })) || [];

  // Calculate totals from trends
  const totalIncome = trends?.reduce((sum, t) => sum + t.income, 0) || 0;
  const totalExpense = trends?.reduce((sum, t) => sum + t.expense, 0) || 0;
  const totalSavings = trends?.reduce((sum, t) => sum + t.savings, 0) || 0;
  const avgMonthlySavings = trends?.length ? totalSavings / trends.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Deep insights into your financial health
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedRange.label}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(totalExpense)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedRange.label}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Savings</p>
                <p className={cn('text-2xl font-bold', totalSavings >= 0 ? 'text-success' : 'text-destructive')}>
                  {formatCurrency(totalSavings)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedRange.label}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Monthly Savings</p>
                <p className={cn('text-2xl font-bold', avgMonthlySavings >= 0 ? 'text-success' : 'text-destructive')}>
                  {formatCurrency(avgMonthlySavings)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Per month</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <LineChart className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="categories">
            <PieChart className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <BarChart3 className="h-4 w-4 mr-2" />
            Comparison
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Income vs Expense Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Income vs Expenses</CardTitle>
                <CardDescription>Monthly trend over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChartData}>
                      <defs>
                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v / 1000}k`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#10b981"
                        fill="url(#incomeGradient)"
                        strokeWidth={2}
                        name="Income"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#ef4444"
                        fill="url(#expenseGradient)"
                        strokeWidth={2}
                        name="Expenses"
                      />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Health Score */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Health</CardTitle>
                <CardDescription>Your overall score breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {healthScore ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-center">
                      <div className="relative h-32 w-32">
                        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="hsl(var(--muted))"
                            strokeWidth="8"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 45}
                            strokeDashoffset={2 * Math.PI * 45 * (1 - healthScore.overallScore / 100)}
                            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold">{healthScore.overallScore}</span>
                          <span className="text-sm text-muted-foreground">{healthScore.grade}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Savings</span>
                          <span className="font-medium">{healthScore.categoryScores.savings}%</span>
                        </div>
                        <Progress value={healthScore.categoryScores.savings} />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Spending</span>
                          <span className="font-medium">{healthScore.categoryScores.spending}%</span>
                        </div>
                        <Progress value={healthScore.categoryScores.spending} />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Goals</span>
                          <span className="font-medium">{healthScore.categoryScores.goals}%</span>
                        </div>
                        <Progress value={healthScore.categoryScores.goals} />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Debt</span>
                          <span className="font-medium">{healthScore.categoryScores.debt}%</span>
                        </div>
                        <Progress value={healthScore.categoryScores.debt} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No health score available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Distribution of expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category List */}
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Detailed spending per category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary?.topCategories?.map((cat, idx) => (
                    <div key={cat.category} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="font-medium">{cat.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{cat.percentage.toFixed(1)}%</Badge>
                          <span className="font-semibold">{formatCurrency(cat.amount)}</span>
                        </div>
                      </div>
                      <Progress value={cat.percentage} />
                    </div>
                  ))}
                  {(!summary?.topCategories || summary.topCategories.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      No spending data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Comparison</CardTitle>
              <CardDescription>Income, expenses, and savings month by month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="savings" name="Savings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Insights */}
      {healthScore?.recommendations && healthScore.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Insights & Recommendations</CardTitle>
            <CardDescription>Personalized tips to improve your finances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthScore.recommendations.slice(0, 6).map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                        rec.priority === 'high'
                          ? 'bg-destructive/10'
                          : rec.priority === 'medium'
                          ? 'bg-warning/10'
                          : 'bg-primary/10'
                      )}
                    >
                      {rec.priority === 'high' ? (
                        <ArrowUpRight className="h-4 w-4 text-destructive" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{rec.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                      {rec.potentialSavings && (
                        <Badge variant="success" className="mt-2">
                          Potential savings: {formatCurrency(rec.potentialSavings)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
