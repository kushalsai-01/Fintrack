import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Folder,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Home,
  Car,
  Utensils,
  Film,
  Heart,
  Briefcase,
  GraduationCap,
  Plane,
  Gift,
  Zap,
  Wifi,
  Phone,
  CreditCard,
  DollarSign,
  PiggyBank,
  Wallet,
  BarChart3,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/Loading';
import { useNotificationStore } from '@/stores/notificationStore';
import api from '@/services/api';
import { formatCurrency, cn } from '@/lib/utils';
import type { Category } from '@shared/types';

// Category Icons Map
const CATEGORY_ICONS = {
  folder: Folder,
  'shopping-cart': ShoppingCart,
  home: Home,
  car: Car,
  utensils: Utensils,
  film: Film,
  heart: Heart,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  plane: Plane,
  gift: Gift,
  zap: Zap,
  wifi: Wifi,
  phone: Phone,
  'credit-card': CreditCard,
  'dollar-sign': DollarSign,
  'piggy-bank': PiggyBank,
  wallet: Wallet,
  'bar-chart': BarChart3,
} as const;

const CATEGORY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
] as const;

// Schema
const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  type: z.enum(['income', 'expense', 'both']),
  icon: z.string().min(1, 'Please select an icon'),
  color: z.string().min(1, 'Please select a color'),
  budgetLimit: z.number().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryWithStats extends Category {
  transactionCount?: number;
  totalAmount?: number;
  monthlyAverage?: number;
}

export default function Categories() {
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithStats | null>(null);

  // Form
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: 'expense',
      icon: 'folder',
      color: CATEGORY_COLORS[0],
    },
  });

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<{ categories: CategoryWithStats[] }>('/categories');
      return response.categories;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CategoryFormData) => api.post('/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsCreateDialogOpen(false);
      form.reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Category created',
        message: 'Your category has been created successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CategoryFormData & { id: string }) =>
      api.put(`/categories/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      form.reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Category updated',
        message: 'Your category has been updated successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Category deleted',
        message: 'Your category has been deleted successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  // Filtered categories
  const filteredCategories = categories.filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || category.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Group by type
  const incomeCategories = filteredCategories.filter((c) => c.type === 'income');
  const expenseCategories = filteredCategories.filter((c) => c.type === 'expense');

  // Handlers
  const handleCreate = () => {
    form.reset({
      name: '',
      type: 'expense',
      icon: 'folder',
      color: CATEGORY_COLORS[0],
    });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (category: CategoryWithStats) => {
    setSelectedCategory(category);
    form.reset({
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
      budgetLimit: category.budgetLimit,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (category: CategoryWithStats) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data: CategoryFormData) => {
    if (selectedCategory) {
      updateMutation.mutate({ ...data, id: selectedCategory.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = CATEGORY_ICONS[iconName as keyof typeof CATEGORY_ICONS] || Folder;
    return IconComponent;
  };

  // Category Card Component
  const CategoryCard = ({ category }: { category: CategoryWithStats }) => {
    const IconComponent = getIconComponent(category.icon);
    
    return (
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-lg"
                style={{ backgroundColor: `${category.color}20` }}
              >
                <IconComponent
                  className="h-5 w-5"
                  style={{ color: category.color }}
                />
              </div>
              <div>
                <h3 className="font-medium">{category.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={category.type === 'income' ? 'success' : 'default'}
                    className="text-xs"
                  >
                    {category.type === 'income' ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {category.type}
                  </Badge>
                  {category.isDefault && (
                    <Badge variant="outline" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(category)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {!category.isDefault && (
                  <DropdownMenuItem
                    onClick={() => handleDelete(category)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="font-semibold">{category.transactionCount || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold text-sm">
                {formatCurrency(category.totalAmount || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly Avg</p>
              <p className="font-semibold text-sm">
                {formatCurrency(category.monthlyAverage || 0)}
              </p>
            </div>
          </div>

          {category.budgetLimit && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Budget Limit</span>
                <span className="font-medium">
                  {formatCurrency(category.budgetLimit)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(((category.totalAmount || 0) / category.budgetLimit) * 100, 100)}%`,
                    backgroundColor:
                      (category.totalAmount || 0) > category.budgetLimit
                        ? '#ef4444'
                        : category.color,
                  }}
                />
              </div>
            </div>
          )}
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
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground mt-1">
            Organize your transactions with custom categories
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Category
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Categories</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
              <Folder className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Income Categories</p>
                <p className="text-2xl font-bold text-green-600">
                  {categories.filter((c) => c.type === 'income').length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expense Categories</p>
                <p className="text-2xl font-bold text-red-600">
                  {categories.filter((c) => c.type === 'expense').length}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">With Budget Limits</p>
                <p className="text-2xl font-bold">
                  {categories.filter((c) => c.budgetLimit).length}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Grid */}
      {typeFilter === 'all' || typeFilter === 'income' ? (
        incomeCategories.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Income Categories
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {incomeCategories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </div>
        )
      ) : null}

      {typeFilter === 'all' || typeFilter === 'expense' ? (
        expenseCategories.length > 0 && (
          <div className={typeFilter === 'all' && incomeCategories.length > 0 ? 'mt-8' : ''}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Expense Categories
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {expenseCategories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </div>
        )
      ) : null}

      {filteredCategories.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">No categories found</h3>
            <p className="text-muted-foreground mt-1">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first category to get started'}
            </p>
            {!searchQuery && (
              <Button className="mt-4" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Category
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedCategory(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory
                ? 'Update your category details'
                : 'Add a new category to organize your transactions'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Category Name"
              placeholder="e.g., Groceries"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />

            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          Income
                        </div>
                      </SelectItem>
                      <SelectItem value="expense">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          Expense
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            <Controller
              name="icon"
              control={form.control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium mb-2">Icon</label>
                  <div className="grid grid-cols-10 gap-2">
                    {Object.entries(CATEGORY_ICONS).map(([key, IconComp]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => field.onChange(key)}
                        className={cn(
                          'p-2 rounded-lg border transition-colors',
                          field.value === key
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <IconComp className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            />

            <Controller
              name="color"
              control={form.control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {CATEGORY_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center transition-transform',
                          field.value === color && 'ring-2 ring-offset-2 ring-primary scale-110'
                        )}
                        style={{ backgroundColor: color }}
                      >
                        {field.value === color && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            />

            <Input
              label="Budget Limit (Optional)"
              type="number"
              placeholder="e.g., 500"
              leftIcon={<DollarSign className="h-4 w-4" />}
              {...form.register('budgetLimit', { valueAsNumber: true })}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {selectedCategory ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {selectedCategory?.transactionCount && selectedCategory.transactionCount > 0 && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-600">Warning</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This category has {selectedCategory.transactionCount} transactions associated
                    with it. These transactions will be moved to "Uncategorized".
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedCategory && deleteMutation.mutate(selectedCategory.id)}
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
