import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
  Calendar,
  Zap,
  Plus,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { LoadingSpinner } from '@/components/ui/Loading';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { formatCurrency, formatPercent, getScoreColor, getScoreGrade } from '@/lib/utils';
import type { MonthlySummary, FinancialHealth, Forecast, Goal, Transaction } from '@shared/types';

// Dashboard Stats Card
interface StatsCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}

function StatsCard({ title, value, change, icon: Icon, trend, description }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                {trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 text-success" />
                ) : trend === 'down' ? (
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                ) : null}
                <span className={trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : ''}>
                  {formatPercent(change)}
                </span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Health Score Ring
function HealthScoreRing({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative h-32 w-32">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={getScoreColor(score)}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
        <span className="text-sm text-muted-foreground">{grade}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Fetch monthly summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['monthly-summary', currentYear, currentMonth],
    queryFn: () => api.get<MonthlySummary>(`/analytics/monthly?year=${currentYear}&month=${currentMonth}`),
  });

  // Fetch health score
  const { data: healthScore, isLoading: healthLoading } = useQuery({
    queryKey: ['health-score'],
    queryFn: () => api.get<FinancialHealth>('/health/latest'),
  });

  // Fetch forecast
  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['forecast'],
    queryFn: () => api.get<Forecast>('/forecast/latest?forecastType=30day'),
  });

  // Fetch goals
  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get<Goal[]>('/goals?status=active&limit=4'),
  });

  // Fetch recent transactions
  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => api.get<Transaction[]>('/transactions?limit=5'),
  });

  const isLoading = summaryLoading || healthLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Good {getGreeting()}, {user?.firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your financial overview for {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/transactions">
            <Button leftIcon={<Plus className="h-4 w-4" />}>
              Add Transaction
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Income"
          value={formatCurrency(summary?.income || 0)}
          change={summary?.comparison?.incomeChangePercent}
          icon={TrendingUp}
          trend={summary?.comparison?.incomeChangePercent && summary.comparison.incomeChangePercent > 0 ? 'up' : 'down'}
        />
        <StatsCard
          title="Total Expenses"
          value={formatCurrency(summary?.expense || 0)}
          change={summary?.comparison?.expenseChangePercent}
          icon={TrendingDown}
          trend={summary?.comparison?.expenseChangePercent && summary.comparison.expenseChangePercent > 0 ? 'down' : 'up'}
        />
        <StatsCard
          title="Net Savings"
          value={formatCurrency(summary?.savings || 0)}
          change={summary?.comparison?.savingsChangePercent}
          icon={DollarSign}
          trend={summary?.comparison?.savingsChangePercent && summary.comparison.savingsChangePercent > 0 ? 'up' : 'down'}
        />
        <StatsCard
          title="Savings Rate"
          value={`${summary?.savingsRate?.toFixed(1) || 0}%`}
          icon={Target}
          description={summary?.savingsRate && summary.savingsRate > 20 ? 'Great job!' : 'Try to save more'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Financial Health
            </CardTitle>
            <CardDescription>Your overall financial wellness</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <HealthScoreRing
                score={healthScore?.overallScore || 0}
                grade={healthScore?.grade || 'N/A'}
              />
              <p className="mt-4 text-center text-sm text-muted-foreground">
                {healthScore?.explanation || 'Compute your health score to see insights'}
              </p>
              {healthScore?.recommendations && healthScore.recommendations.length > 0 && (
                <div className="mt-4 w-full">
                  <p className="text-sm font-medium mb-2">Top Recommendations:</p>
                  <ul className="space-y-2">
                    {healthScore.recommendations.slice(0, 2).map((rec) => (
                      <li key={rec.id} className="flex items-start gap-2 text-sm">
                        <Zap className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{rec.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Link to="/analytics" className="mt-4">
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Spending by Category */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Spending by Category
                </CardTitle>
                <CardDescription>Your top spending categories this month</CardDescription>
              </div>
              <Link to="/analytics">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary?.topCategories?.slice(0, 5).map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{cat.percentage.toFixed(1)}%</span>
                      <span className="font-medium">{formatCurrency(cat.amount)}</span>
                    </div>
                  </div>
                  <Progress value={cat.percentage} />
                </div>
              ))}
              {(!summary?.topCategories || summary.topCategories.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  No spending data yet this month
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Active Goals
                </CardTitle>
                <CardDescription>Track your financial goals</CardDescription>
              </div>
              <Link to="/goals">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goals?.slice(0, 4).map((goal) => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${goal.color}20` }}
                      >
                        <Target className="h-4 w-4" style={{ color: goal.color }} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{goal.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={goal.progress >= 100 ? 'success' : 'secondary'}>
                      {goal.progress.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={Math.min(goal.progress, 100)} />
                </div>
              ))}
              {(!goals || goals.length === 0) && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No active goals</p>
                  <Link to="/goals">
                    <Button variant="outline" size="sm" className="mt-2">
                      Create a Goal
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>Your latest financial activity</CardDescription>
              </div>
              <Link to="/transactions">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions?.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        tx.type === 'income' ? 'bg-success/10' : 'bg-destructive/10'
                      }`}
                    >
                      {tx.type === 'income' ? (
                        <ArrowDownRight className="h-5 w-5 text-success" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{tx.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        tx.type === 'income' ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
              {(!recentTransactions || recentTransactions.length === 0) && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No transactions yet</p>
                  <Link to="/transactions">
                    <Button variant="outline" size="sm" className="mt-2">
                      Add Transaction
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
