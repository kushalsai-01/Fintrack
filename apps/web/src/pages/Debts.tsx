import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  CreditCard,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  DollarSign,
  Percent,
  Home,
  Car,
  GraduationCap,
  ShoppingBag,
  Heart,
  Landmark,
  Receipt,
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
import { debtSchema, type DebtFormData } from '@/lib/validations';
import type { Debt } from '@shared/types';

const DEBT_TYPES = [
  { value: 'credit_card', label: 'Credit Card', Icon: CreditCard },
  { value: 'mortgage', label: 'Mortgage', Icon: Home },
  { value: 'auto_loan', label: 'Auto Loan', Icon: Car },
  { value: 'student_loan', label: 'Student Loan', Icon: GraduationCap },
  { value: 'personal_loan', label: 'Personal Loan', Icon: ShoppingBag },
  { value: 'medical', label: 'Medical Debt', Icon: Heart },
  { value: 'business', label: 'Business Loan', Icon: Landmark },
  { value: 'other', label: 'Other', Icon: Receipt },
];

const PAYOFF_STRATEGIES = [
  { value: 'avalanche', label: 'Avalanche (Highest Interest First)' },
  { value: 'snowball', label: 'Snowball (Lowest Balance First)' },
];

export default function Debts() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingDebtId, setDeletingDebtId] = useState<string | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [payoffStrategy, setPayoffStrategy] = useState<'avalanche' | 'snowball'>('avalanche');

  // Fetch debts
  const { data: debtsData, isLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: () => api.get<{ debts: Debt[] }>('/debts'),
  });
  const debts = debtsData?.debts || [];

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DebtFormData>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      type: 'credit_card',
      startDate: new Date(),
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: DebtFormData) => api.post('/debts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      setIsDialogOpen(false);
      reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Debt added',
        message: 'Your debt has been added successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
    onError: (error: any) => {
      console.error('Debt creation error:', error);
      console.error('Error response:', error.response?.data);
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to add debt. Please try again.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DebtFormData }) =>
      api.put(`/debts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      setIsDialogOpen(false);
      setEditingDebt(null);
      reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Debt updated',
        message: 'Your debt has been updated successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/debts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      setIsDeleteDialogOpen(false);
      setDeletingDebtId(null);
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Debt deleted',
        message: 'Your debt has been deleted.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.post(`/debts/${id}/payment`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      setIsPaymentDialogOpen(false);
      setPayingDebt(null);
      setPaymentAmount('');
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Payment recorded',
        message: 'Your payment has been recorded successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  // Handlers
  const onSubmit = (data: DebtFormData) => {
    if (editingDebt) {
      updateMutation.mutate({ id: editingDebt.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setValue('name', debt.name);
    setValue('type', debt.type);
    setValue('originalAmount', debt.originalAmount);
    setValue('currentBalance', debt.currentBalance);
    setValue('interestRate', debt.interestRate);
    setValue('minimumPayment', debt.minimumPayment);
    setValue('dueDate', debt.dueDay);
    setValue('startDate', debt.startDate ? new Date(debt.startDate) : new Date());
    setValue('lender', debt.lender || '');
    setValue('notes', debt.notes || '');
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingDebtId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingDebtId) {
      deleteMutation.mutate(deletingDebtId);
    }
  };

  const handlePayment = (debt: Debt) => {
    setPayingDebt(debt);
    setPaymentAmount(debt.minimumPayment.toString());
    setIsPaymentDialogOpen(true);
  };

  const confirmPayment = () => {
    if (payingDebt && paymentAmount) {
      paymentMutation.mutate({
        id: payingDebt.id,
        amount: parseFloat(paymentAmount),
      });
    }
  };

  const handleOpenDialog = () => {
    setEditingDebt(null);
    reset({
      type: 'credit_card',
      dueDate: 1,
      startDate: new Date(),
    });
    setIsDialogOpen(true);
  };

  // Filter debts
  const activeDebts = debts?.filter((d) => d.status === 'active') || [];
  const paidOffDebts = debts?.filter((d) => d.status === 'paid_off') || [];

  // Sort by payoff strategy
  const sortedActiveDebts = [...activeDebts].sort((a, b) => {
    if (payoffStrategy === 'avalanche') {
      return b.interestRate - a.interestRate; // Highest interest first
    } else {
      return a.currentBalance - b.currentBalance; // Lowest balance first
    }
  });

  // Calculate totals
  const totalDebt = activeDebts.reduce((sum, d) => sum + d.currentBalance, 0);
  const totalOriginal = activeDebts.reduce((sum, d) => sum + d.originalAmount, 0);
  const totalMinPayment = activeDebts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const avgInterestRate = activeDebts.length
    ? activeDebts.reduce((sum, d) => sum + d.interestRate, 0) / activeDebts.length
    : 0;
  const overallProgress = totalOriginal > 0 ? ((totalOriginal - totalDebt) / totalOriginal) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const renderDebtCard = (debt: Debt, isPriority: boolean = false) => {
    const typeInfo = DEBT_TYPES.find((t) => t.value === debt.type);
    const Icon = typeInfo?.Icon || Receipt;
    const paidOff = totalOriginal - debt.currentBalance;
    const progress = (paidOff / debt.originalAmount) * 100;
    const isPaidOff = debt.status === 'paid_off' || debt.currentBalance <= 0;

    return (
      <Card key={debt.id} className={cn('relative overflow-hidden', isPriority && 'ring-2 ring-primary')}>
        {isPriority && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
        )}
        {isPaidOff && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-success" />
        )}
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{debt.name}</p>
                  {isPriority && (
                    <Badge variant="default" className="text-xs">
                      Priority
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{typeInfo?.label || debt.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(debt.currentBalance)}</p>
                <p className="text-sm text-muted-foreground">
                  {debt.interestRate}% APR
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isPaidOff && (
                    <DropdownMenuItem onClick={() => handlePayment(debt)}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Make Payment
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleEdit(debt)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(debt.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatCurrency(paidOff)} paid of {formatCurrency(debt.originalAmount)}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className={isPaidOff ? '[&>div]:bg-success' : ''} />
          </div>

          <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Due day {debt.dueDay}
            </div>
            <span className="text-muted-foreground">
              Min: {formatCurrency(debt.minimumPayment)}/mo
            </span>
          </div>

          {!isPaidOff && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => handlePayment(debt)}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Make Payment
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Debt Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Track and pay off your debts strategically
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={payoffStrategy} onValueChange={(v) => setPayoffStrategy(v as 'avalanche' | 'snowball')}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Payoff strategy" />
            </SelectTrigger>
            <SelectContent>
              {PAYOFF_STRATEGIES.map((strategy) => (
                <SelectItem key={strategy.value} value={strategy.value}>
                  {strategy.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenDialog}>
            Add Debt
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Debt</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totalDebt)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payments</p>
                <p className="text-2xl font-bold">{formatCurrency(totalMinPayment)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Interest Rate</p>
                <p className="text-2xl font-bold">{avgInterestRate.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Percent className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid Off</p>
                <p className="text-2xl font-bold text-success">{Math.round(overallProgress)}%</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      {activeDebts.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">Overall Payoff Progress</p>
                <Progress value={overallProgress} />
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-xl font-bold">{formatCurrency(totalDebt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debts Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Active ({activeDebts.length})
          </TabsTrigger>
          <TabsTrigger value="paid_off">
            <CheckCircle className="h-4 w-4 mr-2" />
            Paid Off ({paidOffDebts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {sortedActiveDebts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortedActiveDebts.map((debt, index) => renderDebtCard(debt, index === 0))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <CheckCircle className="h-12 w-12 text-success mb-4" />
                <h3 className="text-lg font-semibold">Debt-free! 🎉</h3>
                <p className="text-muted-foreground">
                  You have no active debts. Great job!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="paid_off" className="mt-4">
          {paidOffDebts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {paidOffDebts.map((debt) => renderDebtCard(debt))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No paid off debts yet</h3>
                <p className="text-muted-foreground">
                  Keep making payments to see your progress here
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
              {editingDebt ? 'Edit Debt' : 'Add Debt'}
            </DialogTitle>
            <DialogDescription>
              {editingDebt
                ? 'Update your debt details.'
                : 'Add a new debt to track.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Debt Name"
              placeholder="e.g., Chase Credit Card"
              error={errors.name?.message}
              {...register('name')}
            />

            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Select
                value={watch('type') || 'credit_card'}
                onValueChange={(value) => setValue('type', value as DebtFormData['type'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DEBT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Original Amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                leftAddon="$"
                error={errors.originalAmount?.message}
                {...register('originalAmount', { valueAsNumber: true })}
              />
              <Input
                label="Current Balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                leftAddon="$"
                error={errors.currentBalance?.message}
                {...register('currentBalance', { valueAsNumber: true })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Interest Rate (APR)"
                type="number"
                step="0.01"
                placeholder="0.00"
                rightAddon="%"
                error={errors.interestRate?.message}
                {...register('interestRate', { valueAsNumber: true })}
              />
              <Input
                label="Minimum Payment"
                type="number"
                step="0.01"
                placeholder="0.00"
                leftAddon="$"
                error={errors.minimumPayment?.message}
                {...register('minimumPayment', { valueAsNumber: true })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Due Day (1-31)"
                type="number"
                min="1"
                max="31"
                placeholder="1"
                error={errors.dueDate?.message}
                {...register('dueDate', { valueAsNumber: true })}
              />
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Start Date"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.startDate?.message}
                  />
                )}
              />
            </div>

            <Input
              label="Lender (optional)"
              placeholder="e.g., Chase Bank"
              error={errors.lender?.message}
              {...register('lender')}
            />

            <Input
              label="Notes (optional)"
              placeholder="Add any notes..."
              {...register('notes')}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingDebt ? 'Update' : 'Add'} Debt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
            <DialogDescription>
              Record a payment for &quot;{payingDebt?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {payingDebt && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Current Balance</span>
                  <span className="font-semibold text-destructive">
                    {formatCurrency(payingDebt.currentBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Minimum Payment</span>
                  <span className="font-medium">{formatCurrency(payingDebt.minimumPayment)}</span>
                </div>
              </div>
            )}
            <Input
              label="Payment Amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              leftAddon="$"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPayment}
              isLoading={paymentMutation.isPending}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Debt</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this debt? This action cannot be undone.
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
