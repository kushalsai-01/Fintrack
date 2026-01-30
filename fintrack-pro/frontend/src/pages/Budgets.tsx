import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { LoadingSpinner } from '@/components/ui/Loading';
import { useNotificationStore } from '@/stores/notificationStore';
import api from '@/services/api';
import { formatCurrency, cn } from '@/lib/utils';
import { budgetSchema, type BudgetFormData } from '@/lib/validations';
import type { Budget, Category, MonthlySummary } from '@shared/types';

const BUDGET_PERIODS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function Budgets() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  // Fetch budgets
  const { data: budgetsData, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.get<{ budgets: Budget[] }>('/budgets'),
  });
  const budgets = budgetsData?.budgets || [];

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: Category[] }>('/categories'),
  });
  const categories = categoriesData?.categories || [];

  // Fetch monthly summary for spending data
  const { data: summary } = useQuery({
    queryKey: ['monthly-summary'],
    queryFn: () => api.get<MonthlySummary>('/analytics/monthly'),
  });

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      period: 'monthly',
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: BudgetFormData) => api.post('/budgets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setIsDialogOpen(false);
      reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Budget created',
        message: 'Your budget has been created successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
    onError: (error: any) => {
      console.error('Budget creation error:', error);
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create budget. Please try again.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BudgetFormData }) =>
      api.put(`/budgets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setIsDialogOpen(false);
      setEditingBudget(null);
      reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Budget updated',
        message: 'Your budget has been updated successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setIsDeleteDialogOpen(false);
      setDeletingBudgetId(null);
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Budget deleted',
        message: 'Your budget has been deleted.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  // Calculate spent amounts from summary
  const getCategorySpent = (categoryName: string): number => {
    const cat = summary?.topCategories?.find(
      (c) => c.category.toLowerCase() === categoryName.toLowerCase()
    );
    return cat?.amount || 0;
  };

  // Handlers
  const onSubmit = (data: BudgetFormData) => {
    console.log('Budget form submitted:', data);
    console.log('Form errors:', errors);
    
    // Transform category to categoryId for backend
    const submitData = {
      ...data,
      categoryId: data.category,
    };
    
    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setValue('name', budget.name || '');
    setValue('amount', budget.amount);
    setValue('category', budget.category?.id || '');
    setValue('period', budget.period);
    setValue('alertThreshold', budget.alertThreshold || 80);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingBudgetId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingBudgetId) {
      deleteMutation.mutate(deletingBudgetId);
    }
  };

  const handleOpenDialog = () => {
    setEditingBudget(null);
    reset({
      period: 'monthly',
      alertThreshold: 80,
    });
    setIsDialogOpen(true);
  };

  // Calculate totals
  const totalBudget = budgets?.reduce((sum, b) => sum + b.amount, 0) || 0;
  const totalSpent = budgets?.reduce((sum, b) => sum + getCategorySpent(b.category.name), 0) || 0;
  const totalRemaining = totalBudget - totalSpent;

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
          <h1 className="text-3xl font-bold">Budgets</h1>
          <p className="text-muted-foreground mt-1">
            Set spending limits and track your budget progress
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenDialog}>
          Create Budget
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'h-12 w-12 rounded-lg flex items-center justify-center',
                  totalRemaining >= 0 ? 'bg-success/10' : 'bg-destructive/10'
                )}
              >
                <TrendingUp
                  className={cn('h-6 w-6', totalRemaining >= 0 ? 'text-success' : 'text-destructive')}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    totalRemaining >= 0 ? 'text-success' : 'text-destructive'
                  )}
                >
                  {formatCurrency(Math.abs(totalRemaining))}
                  {totalRemaining < 0 && ' over'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budgets Grid */}
      {budgets && budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => {
            const spent = getCategorySpent(budget.category.name);
            const percentage = (spent / budget.amount) * 100;
            const remaining = budget.amount - spent;
            const isOverBudget = percentage > 100;
            const isNearLimit = percentage >= (budget.alertThreshold || 80);

            return (
              <Card key={budget.id} className="relative overflow-hidden">
                {isOverBudget && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-destructive" />
                )}
                {isNearLimit && !isOverBudget && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-warning" />
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${budget.color}20` }}
                      >
                        <Wallet className="h-4 w-4" style={{ color: budget.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{budget.name}</CardTitle>
                        <CardDescription className="capitalize">{budget.period}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(budget)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(budget.id)}
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
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatCurrency(spent)} of {formatCurrency(budget.amount)}
                      </span>
                      <span className="font-medium">{Math.round(percentage)}%</span>
                    </div>
                    <Progress
                      value={Math.min(percentage, 100)}
                      className={cn(
                        isOverBudget
                          ? '[&>div]:bg-destructive'
                          : isNearLimit
                          ? '[&>div]:bg-warning'
                          : ''
                      )}
                    />
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          isOverBudget ? 'destructive' : isNearLimit ? 'warning' : 'secondary'
                        }
                      >
                        {budget.category.name}
                      </Badge>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isOverBudget ? 'text-destructive' : 'text-muted-foreground'
                        )}
                      >
                        {isOverBudget ? (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {formatCurrency(Math.abs(remaining))} over
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-success" />
                            {formatCurrency(remaining)} left
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No budgets yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first budget to start tracking your spending
            </p>
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Budget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? 'Edit Budget' : 'Create Budget'}
            </DialogTitle>
            <DialogDescription>
              {editingBudget
                ? 'Update your budget settings.'
                : 'Set up a new budget to track your spending.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Budget Name"
              placeholder="e.g., Monthly Groceries"
              error={errors.name?.message}
              {...register('name')}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                leftAddon="$"
                error={errors.amount?.message}
                {...register('amount', { valueAsNumber: true })}
              />
              <div>
                <label className="block text-sm font-medium mb-1">Period</label>
                <Select
                  value={watch('period') || 'monthly'}
                  onValueChange={(value) => setValue('period', value as 'weekly' | 'monthly' | 'yearly')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Select
                value={watch('category') || ''}
                onValueChange={(value) => setValue('category', value)}
              >
                <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    ?.filter((cat) => cat.type === 'expense' || cat.type === 'both')
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
              )}
            </div>

            <Input
              label="Alert Threshold (%)"
              type="number"
              min="1"
              max="100"
              placeholder="80"
              error={errors.alertThreshold?.message}
              {...register('alertThreshold', { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground -mt-2">
              Get notified when spending reaches this percentage of your budget
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingBudget ? 'Update' : 'Create'} Budget
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Budget</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this budget? This action cannot be undone.
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
