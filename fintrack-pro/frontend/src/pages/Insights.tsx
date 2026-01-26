import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Filter,
  Sparkles,
  PiggyBank,
  CreditCard,
  Target,
  Calendar,
  DollarSign,
  ShoppingCart,
  Home,
  Car,
  Utensils,
  Zap,
  Clock,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Progress } from '@/components/ui/Progress';
import { LoadingSpinner } from '@/components/ui/Loading';
import { useNotificationStore } from '@/stores/notificationStore';
import api from '@/services/api';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';

interface Insight {
  id: string;
  type: 'saving' | 'spending' | 'budget' | 'goal' | 'anomaly' | 'opportunity' | 'achievement';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact?: number;
  impactType?: 'positive' | 'negative';
  category?: string;
  actionLabel?: string;
  actionUrl?: string;
  createdAt: string;
  saved?: boolean;
  helpful?: boolean | null;
}

interface InsightStats {
  totalInsights: number;
  savingsOpportunities: number;
  potentialSavings: number;
  achievementsUnlocked: number;
  alertsResolved: number;
}

const INSIGHT_ICONS: Record<Insight['type'], React.ElementType> = {
  saving: PiggyBank,
  spending: ShoppingCart,
  budget: CreditCard,
  goal: Target,
  anomaly: AlertTriangle,
  opportunity: Sparkles,
  achievement: CheckCircle,
};

const INSIGHT_COLORS: Record<Insight['type'], string> = {
  saving: 'text-green-600 bg-green-500/10 border-green-500/20',
  spending: 'text-red-600 bg-red-500/10 border-red-500/20',
  budget: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
  goal: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
  anomaly: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  opportunity: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/20',
  achievement: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
};

const PRIORITY_BADGES: Record<Insight['priority'], { variant: 'destructive' | 'warning' | 'default'; label: string }> = {
  high: { variant: 'destructive', label: 'High Priority' },
  medium: { variant: 'warning', label: 'Medium' },
  low: { variant: 'default', label: 'Low' },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Housing: Home,
  Transportation: Car,
  Food: Utensils,
  Shopping: ShoppingCart,
  Utilities: Zap,
  Entertainment: Sparkles,
};

export default function Insights() {
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<'all' | 'opportunities' | 'alerts' | 'achievements'>('all');
  const [typeFilter, setTypeFilter] = useState<Insight['type'] | 'all'>('all');
  const [savedFilter, setSavedFilter] = useState<'all' | 'saved'>('all');

  // Fetch insights
  const { data, isLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const response = await api.get<{ insights: Insight[]; stats: InsightStats }>('/insights');
      return response;
    },
  });

  const insights = data?.insights || [];
  const stats = data?.stats || {
    totalInsights: 0,
    savingsOpportunities: 0,
    potentialSavings: 0,
    achievementsUnlocked: 0,
    alertsResolved: 0,
  };

  // Filter insights
  const filteredInsights = insights.filter((insight) => {
    // Tab filter
    if (activeTab === 'opportunities' && !['saving', 'opportunity'].includes(insight.type)) return false;
    if (activeTab === 'alerts' && !['anomaly', 'spending', 'budget'].includes(insight.type)) return false;
    if (activeTab === 'achievements' && insight.type !== 'achievement') return false;

    // Type filter
    if (typeFilter !== 'all' && insight.type !== typeFilter) return false;

    // Saved filter
    if (savedFilter === 'saved' && !insight.saved) return false;

    return true;
  });

  // Grouped insights by priority
  const highPriorityInsights = filteredInsights.filter((i) => i.priority === 'high');
  const otherInsights = filteredInsights.filter((i) => i.priority !== 'high');

  // Handlers
  const handleSaveInsight = (insightId: string) => {
    // API call would go here
    addNotification({
      id: Date.now().toString(),
      type: 'success',
      title: 'Insight saved',
      message: 'You can find saved insights in your bookmarks.',
      createdAt: new Date().toISOString(),
      read: false,
    });
  };

  const handleFeedback = (insightId: string, helpful: boolean) => {
    // API call would go here
    addNotification({
      id: Date.now().toString(),
      type: 'success',
      title: 'Thanks for your feedback!',
      message: 'This helps us improve our recommendations.',
      createdAt: new Date().toISOString(),
      read: false,
    });
  };

  // Insight Card Component
  const InsightCard = ({ insight, featured = false }: { insight: Insight; featured?: boolean }) => {
    const IconComponent = INSIGHT_ICONS[insight.type];
    const colorClass = INSIGHT_COLORS[insight.type];
    const CategoryIcon = insight.category ? CATEGORY_ICONS[insight.category] : null;

    return (
      <Card className={cn(
        'group hover:shadow-md transition-all',
        featured && 'border-primary/30 bg-primary/5'
      )}>
        <CardContent className={cn('p-4', featured && 'p-6')}>
          <div className="flex items-start gap-4">
            <div className={cn('p-3 rounded-xl border', colorClass)}>
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={cn('font-semibold', featured && 'text-lg')}>
                      {insight.title}
                    </h3>
                    {insight.priority === 'high' && (
                      <Badge variant="destructive" className="text-xs">
                        Action Needed
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {insight.description}
                  </p>
                </div>
              </div>

              {/* Impact */}
              {insight.impact && (
                <div className={cn(
                  'mt-3 p-3 rounded-lg',
                  insight.impactType === 'positive'
                    ? 'bg-green-500/10'
                    : 'bg-red-500/10'
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Potential {insight.impactType === 'positive' ? 'Savings' : 'Loss'}
                    </span>
                    <span className={cn(
                      'font-semibold',
                      insight.impactType === 'positive' ? 'text-green-600' : 'text-red-600'
                    )}>
                      {insight.impactType === 'positive' ? '+' : '-'}
                      {formatCurrency(insight.impact)}
                    </span>
                  </div>
                </div>
              )}

              {/* Category & Timestamp */}
              <div className="flex items-center gap-3 mt-3">
                {insight.category && CategoryIcon && (
                  <Badge variant="outline" className="text-xs">
                    <CategoryIcon className="h-3 w-3 mr-1" />
                    {insight.category}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  2 hours ago
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => handleFeedback(insight.id, true)}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Helpful
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => handleFeedback(insight.id, false)}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => handleSaveInsight(insight.id)}
                  >
                    {insight.saved ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {insight.actionUrl && (
                  <Button size="sm" asChild>
                    <a href={insight.actionUrl}>
                      {insight.actionLabel || 'Take Action'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            Personalized recommendations powered by AI analysis
          </p>
        </div>
        <Button variant="outline">
          <Share2 className="h-4 w-4 mr-2" />
          Share Report
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Insights</p>
                <p className="text-2xl font-bold">{stats.totalInsights}</p>
              </div>
              <Lightbulb className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Savings Found</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.potentialSavings)}
                </p>
              </div>
              <PiggyBank className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Achievements</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.achievementsUnlocked}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alerts Resolved</p>
                <p className="text-2xl font-bold">{stats.alertsResolved}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Featured Insight */}
      {highPriorityInsights.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Requires Attention
          </h2>
          <div className="grid gap-4">
            {highPriorityInsights.slice(0, 2).map((insight) => (
              <InsightCard key={insight.id} insight={insight} featured />
            ))}
          </div>
        </div>
      )}

      {/* Tabs & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList>
                <TabsTrigger value="all">
                  All Insights
                  <Badge variant="outline" className="ml-2">{insights.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="opportunities">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Opportunities
                </TabsTrigger>
                <TabsTrigger value="alerts">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Alerts
                </TabsTrigger>
                <TabsTrigger value="achievements">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Achievements
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
              >
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="saving">Saving</SelectItem>
                  <SelectItem value="spending">Spending</SelectItem>
                  <SelectItem value="budget">Budget</SelectItem>
                  <SelectItem value="goal">Goal</SelectItem>
                  <SelectItem value="anomaly">Anomaly</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                  <SelectItem value="achievement">Achievement</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={savedFilter}
                onValueChange={(v) => setSavedFilter(v as typeof savedFilter)}
              >
                <SelectTrigger className="w-[140px]">
                  <Bookmark className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="saved">Saved Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights List */}
      {otherInsights.length > 0 ? (
        <div className="grid gap-4">
          {otherInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">No insights found</h3>
            <p className="text-muted-foreground mt-1">
              {typeFilter !== 'all' || savedFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Keep tracking your finances to unlock personalized insights'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Weekly Recommendations
          </CardTitle>
          <CardDescription>
            Based on your spending patterns this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-600">Save More</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You could save $127/month by reducing dining out expenses
              </p>
              <Button variant="ghost" size="sm" className="mt-2 text-green-600">
                Learn how <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-600">Goal Boost</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Add $50/week to reach your vacation goal 2 months early
              </p>
              <Button variant="ghost" size="sm" className="mt-2 text-blue-600">
                Adjust goal <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-purple-600">Bill Alert</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your electricity bill is 23% higher than average this month
              </p>
              <Button variant="ghost" size="sm" className="mt-2 text-purple-600">
                View details <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
