import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Mail,
  Calendar,
  Shield,
  CreditCard,
  Bell,
  Settings,
  Edit,
  Camera,
  MapPin,
  Phone,
  Briefcase,
  DollarSign,
  Target,
  TrendingUp,
  PieChart,
  Award,
  Star,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/ui/Loading';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { formatCurrency, cn } from '@/lib/utils';
import type { MonthlySummary, Goal, FinancialHealth } from '@shared/types';

// Achievement badges
const ACHIEVEMENTS = [
  { id: '1', name: 'First Transaction', icon: Zap, unlocked: true },
  { id: '2', name: 'Budget Master', icon: Target, unlocked: true },
  { id: '3', name: 'Savings Champion', icon: Award, unlocked: true },
  { id: '4', name: 'Goal Setter', icon: Star, unlocked: false },
  { id: '5', name: 'Debt Free', icon: Shield, unlocked: false },
];

export default function Profile() {
  const { user } = useAuthStore();

  // Fetch user stats
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['monthly-summary'],
    queryFn: () => api.get<MonthlySummary>('/analytics/monthly'),
  });

  const { data: healthScore, isLoading: healthLoading } = useQuery({
    queryKey: ['health-score'],
    queryFn: () => api.get<FinancialHealth>('/health/latest'),
  });

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get<Goal[]>('/goals'),
  });

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () =>
      api.get<{
        totalTransactions: number;
        totalCategories: number;
        monthsActive: number;
        goalsCompleted: number;
      }>('/users/stats'),
  });

  const isLoading = summaryLoading || healthLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const activeGoals = goals?.filter((g) => g.status === 'active') || [];
  const completedGoals = goals?.filter((g) => g.status === 'completed') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and view your statistics
          </p>
        </div>
        <Link to="/settings">
          <Button variant="outline" leftIcon={<Settings className="h-4 w-4" />}>
            Settings
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.avatar} alt={user?.firstName} />
                  <AvatarFallback className="text-2xl">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <h2 className="text-xl font-bold mt-4">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-muted-foreground">{user?.email}</p>

              <div className="flex items-center gap-2 mt-2">
                <Badge variant={user?.isPremium ? 'default' : 'secondary'}>
                  {user?.isPremium ? (
                    <>
                      <Star className="h-3 w-3 mr-1" />
                      Premium
                    </>
                  ) : (
                    'Free Plan'
                  )}
                </Badge>
                {user?.isVerified && (
                  <Badge variant="success">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              <div className="w-full mt-6 space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user?.email}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Joined {new Date(user?.createdAt || Date.now()).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user?.currency || 'USD'}</span>
                </div>
              </div>

              <Link to="/settings" className="w-full mt-4">
                <Button variant="outline" className="w-full">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Stats and Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stats?.totalTransactions || 0}</p>
                <p className="text-sm text-muted-foreground">Transactions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stats?.monthsActive || 0}</p>
                <p className="text-sm text-muted-foreground">Months Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{completedGoals.length}</p>
                <p className="text-sm text-muted-foreground">Goals Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {healthScore?.overallScore || 0}
                </p>
                <p className="text-sm text-muted-foreground">Health Score</p>
              </CardContent>
            </Card>
          </div>

          {/* Financial Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                This Month's Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-lg bg-success/10">
                  <p className="text-sm text-muted-foreground">Income</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(summary?.income || 0)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-destructive/10">
                  <p className="text-sm text-muted-foreground">Expenses</p>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(summary?.expense || 0)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-primary/10">
                  <p className="text-sm text-muted-foreground">Savings</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(summary?.savings || 0)}
                  </p>
                </div>
              </div>

              {summary?.savingsRate !== undefined && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Savings Rate</span>
                    <span className="text-sm font-medium">{summary.savingsRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.max(0, Math.min(100, summary.savingsRate))} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Achievements
              </CardTitle>
              <CardDescription>
                Earn badges by reaching financial milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {ACHIEVEMENTS.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={cn(
                      'flex flex-col items-center p-4 rounded-lg border transition-colors',
                      achievement.unlocked
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-muted/50 border-muted opacity-50'
                    )}
                  >
                    <div
                      className={cn(
                        'h-12 w-12 rounded-full flex items-center justify-center',
                        achievement.unlocked ? 'bg-primary/10' : 'bg-muted'
                      )}
                    >
                      <achievement.icon
                        className={cn(
                          'h-6 w-6',
                          achievement.unlocked ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                    </div>
                    <p className="text-sm font-medium mt-2 text-center">{achievement.name}</p>
                    {achievement.unlocked && (
                      <Badge variant="success" className="mt-1 text-xs">
                        Unlocked
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Goals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Active Goals
                  </CardTitle>
                  <CardDescription>Track your progress</CardDescription>
                </div>
                <Link to="/goals">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {activeGoals.length > 0 ? (
                <div className="space-y-4">
                  {activeGoals.slice(0, 3).map((goal) => (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{goal.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {goal.progress.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={goal.progress} />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(goal.currentAmount)}</span>
                        <span>{formatCurrency(goal.targetAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No active goals. Create one to get started!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
