import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Edit,
  Trash2,
  Receipt,
  Calendar,
  Tag,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { LoadingSpinner } from '@/components/ui/Loading';
import { useNotificationStore } from '@/stores/notificationStore';
import api from '@/services/api';
import { formatCurrency, cn } from '@/lib/utils';
import { transactionSchema, type TransactionFormData } from '@/lib/validations';
import type { Transaction, Category, PaginatedResponse } from '@shared/types';

const TRANSACTION_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
];

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export default function Transactions() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState('month');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const limit = 10;

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (searchQuery) params.append('search', searchQuery);
    if (typeFilter !== 'all') params.append('type', typeFilter);
    if (categoryFilter !== 'all') params.append('category', categoryFilter);
    if (dateRange !== 'all') params.append('dateRange', dateRange);
    return params.toString();
  };

  // Fetch transactions
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['transactions', page, searchQuery, typeFilter, categoryFilter, dateRange],
    queryFn: () => api.get<PaginatedResponse<Transaction>>(`/transactions?${buildQueryParams()}`),
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: Category[] }>('/categories'),
  });
  const categories = categoriesData?.categories || [];

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      date: new Date(),
    },
  });

  const selectedType = watch('type');

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: TransactionFormData) => api.post('/transactions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      setIsDialogOpen(false);
      reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Transaction created',
        message: 'Your transaction has been added successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
    onError: (error: any) => {
      console.error('Transaction creation error:', error);
      console.error('Error response:', error.response?.data);
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create transaction. Please try again.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionFormData }) =>
      api.put(`/transactions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      setIsDialogOpen(false);
      setEditingTransaction(null);
      reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Transaction updated',
        message: 'Your transaction has been updated successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      setIsDeleteDialogOpen(false);
      setDeletingTransactionId(null);
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Transaction deleted',
        message: 'Your transaction has been deleted.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  // Handlers
  const onSubmit = (data: TransactionFormData) => {
    console.log('Form submitted with data:', data);
    console.log('Validation errors:', errors);
    console.log('Categories available:', categories);
    
    // category field now contains the categoryId directly
    if (!data.category) {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error',
        message: 'Please select a category.',
        createdAt: new Date().toISOString(),
        read: false,
      });
      return;
    }
    
    const submitData = {
      ...data,
      categoryId: data.category,
    };
    
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    // Skip transfer transactions since backend doesn't support them
    if (transaction.type === 'transfer') {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Not Supported',
        message: 'Transfer transactions cannot be edited yet.',
        createdAt: new Date().toISOString(),
        read: false,
      });
      return;
    }
    
    setEditingTransaction(transaction);
    setValue('description', transaction.description);
    setValue('amount', transaction.amount);
    setValue('type', transaction.type as 'income' | 'expense');
    // Find categoryId from category name
    const categoryId = categories?.find(c => c.name === transaction.category)?.id;
    setValue('category', categoryId || '');
    setValue('date', new Date(transaction.date));
    setValue('notes', transaction.notes || '');
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingTransactionId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingTransactionId) {
      deleteMutation.mutate(deletingTransactionId);
    }
  };

  const handleOpenDialog = () => {
    setEditingTransaction(null);
    reset({
      type: 'expense',
      date: new Date(),
    });
    setIsDialogOpen(true);
  };

  const transactions = transactionsData?.data || [];
  const totalPages = transactionsData ? Math.ceil(transactionsData.total / limit) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your financial transactions
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />}>
            Import
          </Button>
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
            Export
          </Button>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenDialog}>
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No transactions found</h3>
              <p className="text-muted-foreground">
                {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first transaction'}
              </p>
              {!searchQuery && typeFilter === 'all' && categoryFilter === 'all' && (
                <Button className="mt-4" onClick={handleOpenDialog}>
                  Add Transaction
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">Description</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-right p-4 font-medium">Amount</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'h-10 w-10 rounded-lg flex items-center justify-center',
                                tx.type === 'income' ? 'bg-success/10' : 'bg-destructive/10'
                              )}
                            >
                              {tx.type === 'income' ? (
                                <ArrowDownRight className="h-5 w-5 text-success" />
                              ) : (
                                <ArrowUpRight className="h-5 w-5 text-destructive" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{tx.description}</p>
                              {tx.notes && (
                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                  {tx.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary">{tx.category}</Badge>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-4 text-right">
                          <span
                            className={cn(
                              'font-semibold',
                              tx.type === 'income' ? 'text-success' : 'text-destructive'
                            )}
                          >
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(tx)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(tx.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to{' '}
                    {Math.min(page * limit, transactionsData?.total || 0)} of{' '}
                    {transactionsData?.total || 0} transactions
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </DialogTitle>
            <DialogDescription>
              {editingTransaction
                ? 'Update the transaction details below.'
                : 'Enter the details for your new transaction.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(['expense', 'income'] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={selectedType === type ? 'default' : 'outline'}
                  onClick={() => setValue('type', type)}
                  className="capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>

            <Input
              label="Description"
              placeholder="e.g., Grocery shopping"
              error={errors.description?.message}
              {...register('description')}
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
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Date"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.date?.message}
                  />
                )}
              />
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
                    ?.filter((cat) => cat.type === selectedType || cat.type === 'both')
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
              label="Notes (optional)"
              placeholder="Add any additional notes..."
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
                {editingTransaction ? 'Update' : 'Add'} Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
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
