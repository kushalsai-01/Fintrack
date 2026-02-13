import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Target,
  Calendar,
  TrendingUp,
  MoreHorizontal,
  Edit,
  Trash2,
  PiggyBank,
  Gift,
  Car,
  Home,
  Plane,
  GraduationCap,
  Heart,
  Laptop,
  CheckCircle,
  Clock,
  Pause,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { LoadingSpinner } from '@/components/ui/Loading';
import { useNotificationStore } from '@/stores/notificationStore';
import api from '@/services/api';
import { formatCurrency, cn } from '@/lib/utils';
import { goalSchema, type GoalFormData } from '@/lib/validations';
import type { Goal } from '@shared/types';

const GOAL_ICONS: Record<string, React.ElementType> = {
  savings: PiggyBank,
  gift: Gift,
  car: Car,
  home: Home,
  travel: Plane,
  education: GraduationCap,
  health: Heart,
  technology: Laptop,
  other: Target,
};

const GOAL_COLORS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Orange' },
];

const GOAL_ICON_OPTIONS = [
  { value: 'savings', label: 'Savings', Icon: PiggyBank },
  { value: 'gift', label: 'Gift', Icon: Gift },
  { value: 'car', label: 'Car', Icon: Car },
  { value: 'home', label: 'Home', Icon: Home },
  { value: 'travel', label: 'Travel', Icon: Plane },
  { value: 'education', label: 'Education', Icon: GraduationCap },
  { value: 'health', label: 'Health', Icon: Heart },
  { value: 'technology', label: 'Technology', Icon: Laptop },
  { value: 'other', label: 'Other', Icon: Target },
];

export default function Goals() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [isContributeDialogOpen, setIsContributeDialogOpen] = useState(false);
  const [contributingGoal, setContributingGoal] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  // Fetch goals
  const { data: goalsData, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get<{ goals: Goal[] }>('/goals'),
  });
  const goals = goalsData?.goals || [];

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      icon: 'savings',
      color: '#3b82f6',
      currentAmount: 0,
      priority: 'medium',
      autoContribute: false,
    },
  });

  const selectedIcon = watch('icon');
  const selectedColor = watch('color');

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: GoalFormData) => api.post('/goals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsDialogOpen(false);
      reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Goal created',
        message: 'Your goal has been created successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
    onError: (error: any) => {
      console.error('Goal creation error:', error);
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create goal. Please try again.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GoalFormData> }) =>
      api.put(`/goals/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsDialogOpen(false);
      setEditingGoal(null);
      reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Goal updated',
        message: 'Your goal has been updated successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsDeleteDialogOpen(false);
      setDeletingGoalId(null);
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Goal deleted',
        message: 'Your goal has been deleted.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const contributeMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.post(`/goals/${id}/contribute`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsContributeDialogOpen(false);
      setContributingGoal(null);
      setContributionAmount('');
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Contribution added',
        message: 'Your contribution has been added to the goal.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  // Handlers
  const onSubmit = (data: GoalFormData) => {
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setValue('name', goal.name);
    setValue('targetAmount', goal.targetAmount);
    setValue('currentAmount', goal.currentAmount);
    setValue('targetDate', new Date(goal.targetDate));
    setValue('icon', goal.icon || 'savings');
    setValue('color', goal.color || '#3b82f6');
    // Filter out 'critical' priority since backend doesn't support it
    const validPriority = goal.priority === 'critical' ? 'high' : goal.priority;
    setValue('priority', validPriority);
    setValue('autoContributeAmount', goal.monthlyContribution);
    setValue('autoContribute', goal.autoContribute);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingGoalId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingGoalId) {
      deleteMutation.mutate(deletingGoalId);
    }
  };

  const handleContribute = (goal: Goal) => {
    setContributingGoal(goal);
    setIsContributeDialogOpen(true);
  };

  const confirmContribution = () => {
    if (contributingGoal && contributionAmount) {
      contributeMutation.mutate({
        id: contributingGoal.id,
        amount: parseFloat(contributionAmount),
      });
    }
  };

  const handleOpenDialog = () => {
    setEditingGoal(null);
    reset({
      icon: 'savings',
      color: '#3b82f6',
      currentAmount: 0,
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });
    setIsDialogOpen(true);
  };

  // Filter goals by status
  const activeGoals = goals?.filter((g) => g.status === 'active') || [];
  const completedGoals = goals?.filter((g) => g.status === 'completed') || [];
  const pausedGoals = goals?.filter((g) => g.status === 'paused') || [];

  // Calculate totals
  const totalTargetAmount = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrentAmount = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const renderGoalCard = (goal: Goal) => {
    const Icon = GOAL_ICONS[goal.icon || 'other'] || Target;
    const daysRemaining = Math.ceil(
      (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const isOverdue = daysRemaining < 0;
    const isCompleted = goal.status === 'completed' || goal.progress >= 100;

    return (
      <Card key={goal.id} className="relative overflow-hidden">
        {isCompleted && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-success" />
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${goal.color}20` }}
              >
                <Icon className="h-5 w-5" style={{ color: goal.color }} />
              </div>
              <div>
                <CardTitle className="text-base">{goal.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  {isCompleted ? (
                    'Completed!'
                  ) : isOverdue ? (
                    <span className="text-destructive">Overdue by {Math.abs(daysRemaining)} days</span>
                  ) : (
                    `${daysRemaining} days left`
                  )}
                </CardDescription>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isCompleted && (
                  <DropdownMenuItem onClick={() => handleContribute(goal)}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Add Contribution
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleEdit(goal)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(goal.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                </span>
                <span className="font-medium">{Math.round(goal.progress)}%</span>
              </div>
              <Progress
                value={Math.min(goal.progress, 100)}
                className={isCompleted ? '[&>div]:bg-success' : ''}
              />
            </div>

            <div className="flex items-center justify-between">
              <Badge
                variant={
                  isCompleted ? 'success' : goal.status === 'paused' ? 'secondary' : 'default'
                }
              >
                {isCompleted ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Completed
                  </span>
                ) : goal.status === 'paused' ? (
                  <span className="flex items-center gap-1">
                    <Pause className="h-3 w-3" />
                    Paused
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    In Progress
                  </span>
                )}
              </Badge>
              {!isCompleted && goal.monthlyContribution > 0 && (
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(goal.monthlyContribution)}/mo contribution
                </span>
              )}
            </div>

            {!isCompleted && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleContribute(goal)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contribution
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Goals</h1>
          <p className="text-muted-foreground mt-1">
            Set and track your financial goals
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenDialog}>
          Create Goal
        </Button>
      </div>

      {/* Summary Card */}
      {activeGoals.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Overall Progress</p>
                <div className="flex items-center gap-4">
                  <Progress value={overallProgress} className="flex-1" />
                  <span className="font-semibold">{Math.round(overallProgress)}%</span>
                </div>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Saved</p>
                  <p className="text-xl font-bold text-success">{formatCurrency(totalCurrentAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Target</p>
                  <p className="text-xl font-bold">{formatCurrency(totalTargetAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-xl font-bold text-muted-foreground">
                    {formatCurrency(totalTargetAmount - totalCurrentAmount)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeGoals.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedGoals.length})
          </TabsTrigger>
          <TabsTrigger value="paused">
            Paused ({pausedGoals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activeGoals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeGoals.map(renderGoalCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No active goals</h3>
                <p className="text-muted-foreground mb-4">
                  Create a goal to start saving towards something meaningful
                </p>
                <Button onClick={handleOpenDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Goal
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedGoals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedGoals.map(renderGoalCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No completed goals yet</h3>
                <p className="text-muted-foreground">
                  Keep working on your active goals to see them here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="paused" className="mt-4">
          {pausedGoals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pausedGoals.map(renderGoalCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Pause className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No paused goals</h3>
                <p className="text-muted-foreground">
                  Paused goals will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGoal ? 'Edit Goal' : 'Create Goal'}
            </DialogTitle>
            <DialogDescription>
              {editingGoal
                ? 'Update your goal details.'
                : 'Set up a new savings goal.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Goal Name"
              placeholder="e.g., Emergency Fund"
              error={errors.name?.message}
              {...register('name')}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Target Amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                leftAddon="$"
                error={errors.targetAmount?.message}
                {...register('targetAmount', { valueAsNumber: true })}
              />
              <Input
                label="Current Amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                leftAddon="$"
                error={errors.currentAmount?.message}
                {...register('currentAmount', { valueAsNumber: true })}
              />
            </div>

            <Controller
              name="targetDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Target Date"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.targetDate?.message}
                />
              )}
            />

            <div>
              <label className="block text-sm font-medium mb-2">Icon</label>
              <div className="flex flex-wrap gap-2">
                {GOAL_ICON_OPTIONS.map(({ value, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center border-2 transition-colors',
                      selectedIcon === value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => setValue('icon', value)}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {GOAL_COLORS.map(({ value }) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      'h-8 w-8 rounded-full transition-transform',
                      selectedColor === value ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    )}
                    style={{ backgroundColor: value }}
                    onClick={() => setValue('color', value)}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingGoal ? 'Update' : 'Create'} Goal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contribution Dialog */}
      <Dialog open={isContributeDialogOpen} onOpenChange={setIsContributeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
            <DialogDescription>
              Add money towards your &quot;{contributingGoal?.name}&quot; goal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {contributingGoal && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Current Progress</span>
                  <span className="font-medium">{Math.round(contributingGoal.progress)}%</span>
                </div>
                <Progress value={contributingGoal.progress} />
                <p className="text-sm text-muted-foreground mt-2">
                  {formatCurrency(contributingGoal.currentAmount)} of {formatCurrency(contributingGoal.targetAmount)}
                </p>
              </div>
            )}
            <Input
              label="Contribution Amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              leftAddon="$"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsContributeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmContribution}
              isLoading={contributeMutation.isPending}
              disabled={!contributionAmount || parseFloat(contributionAmount) <= 0}
            >
              Add Contribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this goal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              isLoading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
