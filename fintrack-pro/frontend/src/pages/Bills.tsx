import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Receipt,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Bell,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  CreditCard,
  Zap,
  Wifi,
  Home,
  Phone,
  Film,
  ShoppingBag,
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
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { LoadingSpinner } from '@/components/ui/Loading';
import { useNotificationStore } from '@/stores/notificationStore';
import api from '@/services/api';
import { formatCurrency, cn } from '@/lib/utils';
import { billSchema, type BillFormData } from '@/lib/validations';
import type { Bill, Category } from '@shared/types';

const BILL_ICONS: Record<string, React.ElementType> = {
  utilities: Zap,
  internet: Wifi,
  rent: Home,
  phone: Phone,
  entertainment: Film,
  shopping: ShoppingBag,
  credit_card: CreditCard,
  other: Receipt,
};

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function Bills() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('upcoming');

  // Fetch bills
  const { data: bills, isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: () => api.get<Bill[]>('/bills'),
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories'),
  });

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      frequency: 'monthly',
      isAutoPay: false,
      reminderDays: 3,
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: BillFormData) => api.post('/bills', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setIsDialogOpen(false);
      reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Bill created',
        message: 'Your bill has been added successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BillFormData }) =>
      api.put(`/bills/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setIsDialogOpen(false);
      setEditingBill(null);
      reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Bill updated',
        message: 'Your bill has been updated successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setIsDeleteDialogOpen(false);
      setDeletingBillId(null);
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Bill deleted',
        message: 'Your bill has been deleted.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.post(`/bills/${id}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Bill marked as paid',
        message: 'The bill has been recorded as paid.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  // Handlers
  const onSubmit = (data: BillFormData) => {
    if (editingBill) {
      updateMutation.mutate({ id: editingBill.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    setValue('name', bill.name);
    setValue('amount', bill.amount);
    setValue('dueDate', new Date(bill.dueDate).toISOString().split('T')[0]);
    setValue('frequency', bill.frequency);
    setValue('category', bill.category);
    setValue('isAutoPay', bill.isAutoPay);
    setValue('reminderDays', bill.reminderDays || 3);
    setValue('notes', bill.notes || '');
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingBillId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingBillId) {
      deleteMutation.mutate(deletingBillId);
    }
  };

  const handleOpenDialog = () => {
    setEditingBill(null);
    reset({
      frequency: 'monthly',
      isAutoPay: false,
      reminderDays: 3,
      dueDate: new Date().toISOString().split('T')[0],
    });
    setIsDialogOpen(true);
  };

  // Filter and sort bills
  const now = new Date();
  const upcomingBills = bills
    ?.filter((b) => {
      const dueDate = new Date(b.dueDate);
      return dueDate >= now && b.status !== 'paid';
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) || [];

  const overdueBills = bills
    ?.filter((b) => {
      const dueDate = new Date(b.dueDate);
      return dueDate < now && b.status !== 'paid';
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) || [];

  const paidBills = bills
    ?.filter((b) => b.status === 'paid')
    .sort((a, b) => new Date(b.lastPaidDate || b.dueDate).getTime() - new Date(a.lastPaidDate || a.dueDate).getTime()) || [];

  // Calculate totals
  const totalUpcoming = upcomingBills.reduce((sum, b) => sum + b.amount, 0);
  const totalOverdue = overdueBills.reduce((sum, b) => sum + b.amount, 0);
  const totalMonthly = bills
    ?.filter((b) => b.frequency === 'monthly')
    .reduce((sum, b) => sum + b.amount, 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const renderBillCard = (bill: Bill) => {
    const Icon = BILL_ICONS[bill.icon || 'other'] || Receipt;
    const daysUntilDue = Math.ceil(
      (new Date(bill.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isOverdue = daysUntilDue < 0;
    const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3;

    return (
      <Card key={bill.id} className="relative overflow-hidden">
        {isOverdue && <div className="absolute top-0 left-0 right-0 h-1 bg-destructive" />}
        {isDueSoon && !isOverdue && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-warning" />
        )}
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${bill.color || '#3b82f6'}20` }}
              >
                <Icon className="h-5 w-5" style={{ color: bill.color || '#3b82f6' }} />
              </div>
              <div>
                <p className="font-medium">{bill.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {isOverdue ? (
                    <span className="text-destructive">
                      Overdue by {Math.abs(daysUntilDue)} days
                    </span>
                  ) : daysUntilDue === 0 ? (
                    <span className="text-warning">Due today</span>
                  ) : (
                    <span>Due in {daysUntilDue} days</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(bill.amount)}</p>
                <div className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground capitalize">{bill.frequency}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {bill.status !== 'paid' && (
                    <DropdownMenuItem onClick={() => markPaidMutation.mutate(bill.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleEdit(bill)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(bill.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary">{bill.category}</Badge>
            {bill.isAutoPay && (
              <Badge variant="outline" className="text-success border-success">
                <RefreshCw className="h-3 w-3 mr-1" />
                Auto-pay
              </Badge>
            )}
            {bill.status === 'paid' && (
              <Badge variant="success">
                <CheckCircle className="h-3 w-3 mr-1" />
                Paid
              </Badge>
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
          <h1 className="text-3xl font-bold">Bills & Reminders</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your recurring bills
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenDialog}>
          Add Bill
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Bills</p>
                <p className="text-2xl font-bold">{formatCurrency(totalUpcoming)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {upcomingBills.length} bills due
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className={cn('text-2xl font-bold', overdueBills.length > 0 && 'text-destructive')}>
                  {formatCurrency(totalOverdue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {overdueBills.length} bills overdue
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalMonthly)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {bills?.filter((b) => b.frequency === 'monthly').length} monthly bills
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bills Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            <Clock className="h-4 w-4 mr-2" />
            Upcoming ({upcomingBills.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Overdue ({overdueBills.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            <CheckCircle className="h-4 w-4 mr-2" />
            Paid ({paidBills.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {upcomingBills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingBills.map(renderBillCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <CheckCircle className="h-12 w-12 text-success mb-4" />
                <h3 className="text-lg font-semibold">All caught up!</h3>
                <p className="text-muted-foreground">No upcoming bills</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          {overdueBills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overdueBills.map(renderBillCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <CheckCircle className="h-12 w-12 text-success mb-4" />
                <h3 className="text-lg font-semibold">Great job!</h3>
                <p className="text-muted-foreground">No overdue bills</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          {paidBills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paidBills.map(renderBillCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No paid bills yet</h3>
                <p className="text-muted-foreground">
                  Paid bills will appear here
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
              {editingBill ? 'Edit Bill' : 'Add Bill'}
            </DialogTitle>
            <DialogDescription>
              {editingBill
                ? 'Update your bill details.'
                : 'Add a new recurring bill to track.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Bill Name"
              placeholder="e.g., Electric Bill"
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
              <Input
                label="Due Date"
                type="date"
                error={errors.dueDate?.message}
                {...register('dueDate')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Frequency</label>
                <Select
                  value={watch('frequency') || 'monthly'}
                  onValueChange={(value) => setValue('frequency', value as BillFormData['frequency'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  {...register('isAutoPay')}
                />
                <span className="text-sm">Auto-pay enabled</span>
              </label>
            </div>

            <Input
              label="Reminder (days before)"
              type="number"
              min="0"
              max="30"
              placeholder="3"
              error={errors.reminderDays?.message}
              {...register('reminderDays', { valueAsNumber: true })}
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
                {editingBill ? 'Update' : 'Add'} Bill
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Bill</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bill? This action cannot be undone.
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
