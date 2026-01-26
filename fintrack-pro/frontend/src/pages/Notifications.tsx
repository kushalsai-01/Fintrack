import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  CreditCard,
  Calendar,
  Lightbulb,
  Gift,
  Shield,
  Clock,
  Filter,
  MoreHorizontal,
  Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { LoadingSpinner } from '@/components/ui/Loading';
import { useNotificationStore } from '@/stores/notificationStore';
import api from '@/services/api';
import { cn, formatDate } from '@/lib/utils';
import type { Notification } from '@shared/types';

// Notification Icon Map
const NOTIFICATION_ICONS: Record<Notification['type'], React.ElementType> = {
  success: Check,
  info: Lightbulb,
  warning: AlertTriangle,
  error: Shield,
  bill: CreditCard,
  goal: Target,
  achievement: Gift,
  insight: TrendingUp,
  anomaly: AlertTriangle,
};

const NOTIFICATION_COLORS: Record<Notification['type'], string> = {
  success: 'text-green-600 bg-green-500/10',
  info: 'text-blue-600 bg-blue-500/10',
  warning: 'text-amber-600 bg-amber-500/10',
  error: 'text-red-600 bg-red-500/10',
  bill: 'text-purple-600 bg-purple-500/10',
  goal: 'text-emerald-600 bg-emerald-500/10',
  achievement: 'text-yellow-600 bg-yellow-500/10',
  insight: 'text-cyan-600 bg-cyan-500/10',
  anomaly: 'text-orange-600 bg-orange-500/10',
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const { notifications: storeNotifications } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all');
  const [typeFilter, setTypeFilter] = useState<Notification['type'] | 'all'>('all');
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Fetch notifications from API
  const { data: apiNotifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get<{ notifications: Notification[] }>('/notifications');
      return response.notifications;
    },
  });

  // Combine store notifications with API notifications
  const allNotifications = [...storeNotifications, ...apiNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => api.delete('/notifications/clear'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Filter notifications
  const filteredNotifications = allNotifications.filter((notification) => {
    // Tab filter
    if (activeTab === 'unread' && notification.read) return false;
    if (activeTab === 'archived' && !notification.archived) return false;
    if (activeTab !== 'archived' && notification.archived) return false;

    // Type filter
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;

    return true;
  });

  // Stats
  const unreadCount = allNotifications.filter((n) => !n.read && !n.archived).length;
  const archivedCount = allNotifications.filter((n) => n.archived).length;

  // Group by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = formatDate(notification.createdAt, 'long');
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  // Notification Item Component
  const NotificationItem = ({ notification }: { notification: Notification }) => {
    const IconComponent = NOTIFICATION_ICONS[notification.type] || Bell;
    const colorClass = NOTIFICATION_COLORS[notification.type];

    return (
      <div
        className={cn(
          'flex gap-4 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50',
          !notification.read && 'bg-primary/5 border-primary/20'
        )}
        onClick={() => {
          if (!notification.read) {
            markAsReadMutation.mutate(notification.id);
          }
          setSelectedNotification(notification);
        }}
      >
        <div className={cn('p-2.5 rounded-lg h-fit', colorClass)}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={cn('font-medium', !notification.read && 'font-semibold')}>
                {notification.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {notification.message}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!notification.read && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!notification.read && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsReadMutation.mutate(notification.id);
                      }}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark as read
                    </DropdownMenuItem>
                  )}
                  {!notification.archived && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveMutation.mutate(notification.id);
                      }}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(notification.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {notification.type}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(notification.createdAt, 'relative')}
            </span>
          </div>
        </div>
      </div>
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
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your financial activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
          <Button variant="outline" onClick={() => setIsSettingsDialogOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{allNotifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold text-primary">{unreadCount}</p>
              </div>
              <div className="relative">
                <Bell className="h-8 w-8 text-primary" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-xs text-primary-foreground flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Archived</p>
                <p className="text-2xl font-bold">{archivedCount}</p>
              </div>
              <Archive className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <Badge variant="outline" className="ml-2">
                    {allNotifications.filter((n) => !n.archived).length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread
                  {unreadCount > 0 && (
                    <Badge className="ml-2">{unreadCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="archived">
                  Archived
                  <Badge variant="outline" className="ml-2">{archivedCount}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="bill">Bills</SelectItem>
                  <SelectItem value="goal">Goals</SelectItem>
                  <SelectItem value="achievement">Achievements</SelectItem>
                  <SelectItem value="insight">Insights</SelectItem>
                  <SelectItem value="anomaly">Anomalies</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearAllMutation.mutate()}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {Object.keys(groupedNotifications).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, notifications]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{date}</h3>
              <Card>
                <CardContent className="p-2">
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">No notifications</h3>
            <p className="text-muted-foreground mt-1">
              {activeTab === 'unread'
                ? "You're all caught up!"
                : activeTab === 'archived'
                ? "No archived notifications"
                : "You don't have any notifications yet"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notification Detail Dialog */}
      <Dialog
        open={!!selectedNotification}
        onOpenChange={(open) => !open && setSelectedNotification(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && (
                <>
                  {React.createElement(
                    NOTIFICATION_ICONS[selectedNotification.type] || Bell,
                    {
                      className: cn(
                        'h-5 w-5',
                        NOTIFICATION_COLORS[selectedNotification.type].split(' ')[0]
                      ),
                    }
                  )}
                  {selectedNotification.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <p className="text-muted-foreground">{selectedNotification.message}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedNotification.type}</Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDate(selectedNotification.createdAt, 'full')}
                </span>
              </div>
              {selectedNotification.actionUrl && (
                <Button className="w-full" asChild>
                  <a href={selectedNotification.actionUrl}>
                    {selectedNotification.actionLabel || 'View Details'}
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
            <DialogDescription>
              Manage how you receive notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {[
              { key: 'billReminders', label: 'Bill Reminders', icon: CreditCard, description: 'Get notified before bills are due' },
              { key: 'goalUpdates', label: 'Goal Updates', icon: Target, description: 'Progress updates on your savings goals' },
              { key: 'spendingAlerts', label: 'Spending Alerts', icon: AlertTriangle, description: 'Alerts when you exceed budget limits' },
              { key: 'weeklyInsights', label: 'Weekly Insights', icon: Lightbulb, description: 'Weekly financial summary and tips' },
              { key: 'achievements', label: 'Achievements', icon: Gift, description: 'Celebrate your financial milestones' },
              { key: 'anomalies', label: 'Unusual Activity', icon: Shield, description: 'Alerts for suspicious transactions' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 rounded-lg bg-muted"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <button
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors"
                >
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6 transition-transform" />
                </button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSettingsDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
