import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  MoreHorizontal,
  Edit,
  Trash2,
  Briefcase,
  Building2,
  Bitcoin,
  Coins,
  LineChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
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
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import { investmentSchema, type InvestmentFormData } from '@/lib/validations';
import type { Investment } from '@shared/types';

const INVESTMENT_TYPES = [
  { value: 'stocks', label: 'Stocks', Icon: LineChart },
  { value: 'bonds', label: 'Bonds', Icon: BarChart3 },
  { value: 'etf', label: 'ETFs', Icon: PieChart },
  { value: 'mutual_fund', label: 'Mutual Funds', Icon: Briefcase },
  { value: 'real_estate', label: 'Real Estate', Icon: Building2 },
  { value: 'crypto', label: 'Cryptocurrency', Icon: Bitcoin },
  { value: 'other', label: 'Other', Icon: Coins },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function Investments() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingInvestmentId, setDeletingInvestmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('portfolio');

  // Fetch investments
  const { data: investments, isLoading } = useQuery({
    queryKey: ['investments'],
    queryFn: () => api.get<Investment[]>('/investments'),
  });

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      type: 'stocks',
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: InvestmentFormData) => api.post('/investments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      setIsDialogOpen(false);
      reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Investment added',
        message: 'Your investment has been added successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvestmentFormData }) =>
      api.put(`/investments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      setIsDialogOpen(false);
      setEditingInvestment(null);
      reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Investment updated',
        message: 'Your investment has been updated successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/investments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      setIsDeleteDialogOpen(false);
      setDeletingInvestmentId(null);
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Investment deleted',
        message: 'Your investment has been deleted.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  // Handlers
  const onSubmit = (data: InvestmentFormData) => {
    if (editingInvestment) {
      updateMutation.mutate({ id: editingInvestment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setValue('name', investment.name);
    setValue('symbol', investment.symbol || '');
    setValue('type', investment.type);
    setValue('shares', investment.shares);
    setValue('purchasePrice', investment.purchasePrice);
    setValue('currentPrice', investment.currentPrice);
    setValue('purchaseDate', new Date(investment.purchaseDate).toISOString().split('T')[0]);
    setValue('notes', investment.notes || '');
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingInvestmentId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingInvestmentId) {
      deleteMutation.mutate(deletingInvestmentId);
    }
  };

  const handleOpenDialog = () => {
    setEditingInvestment(null);
    reset({
      type: 'stocks',
      purchaseDate: new Date().toISOString().split('T')[0],
    });
    setIsDialogOpen(true);
  };

  // Calculate totals
  const totalInvested = investments?.reduce((sum, inv) => sum + inv.purchasePrice * inv.shares, 0) || 0;
  const totalValue = investments?.reduce((sum, inv) => sum + inv.currentPrice * inv.shares, 0) || 0;
  const totalGainLoss = totalValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  // Group by type for pie chart
  const typeBreakdown = investments?.reduce((acc, inv) => {
    const type = inv.type;
    const value = inv.currentPrice * inv.shares;
    const existing = acc.find((item) => item.type === type);
    if (existing) {
      existing.value += value;
    } else {
      const typeInfo = INVESTMENT_TYPES.find((t) => t.value === type);
      acc.push({
        type,
        name: typeInfo?.label || type,
        value,
        color: COLORS[acc.length % COLORS.length],
      });
    }
    return acc;
  }, [] as { type: string; name: string; value: number; color: string }[]) || [];

  // Mock performance data (would come from API)
  const performanceData = [
    { month: 'Jan', value: totalValue * 0.85 },
    { month: 'Feb', value: totalValue * 0.88 },
    { month: 'Mar', value: totalValue * 0.92 },
    { month: 'Apr', value: totalValue * 0.90 },
    { month: 'May', value: totalValue * 0.95 },
    { month: 'Jun', value: totalValue * 0.98 },
    { month: 'Jul', value: totalValue },
  ];

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
          <h1 className="text-3xl font-bold">Investments</h1>
          <p className="text-muted-foreground mt-1">
            Track your investment portfolio
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenDialog}>
          Add Investment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invested</p>
                <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Gain/Loss</p>
                <p className={cn('text-2xl font-bold', totalGainLoss >= 0 ? 'text-success' : 'text-destructive')}>
                  {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
                </p>
              </div>
              <div className={cn(
                'h-12 w-12 rounded-lg flex items-center justify-center',
                totalGainLoss >= 0 ? 'bg-success/10' : 'bg-destructive/10'
              )}>
                {totalGainLoss >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-success" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-destructive" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Return %</p>
                <p className={cn('text-2xl font-bold', totalGainLossPercent >= 0 ? 'text-success' : 'text-destructive')}>
                  {totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
                </p>
              </div>
              <div className={cn(
                'h-12 w-12 rounded-lg flex items-center justify-center',
                totalGainLossPercent >= 0 ? 'bg-success/10' : 'bg-destructive/10'
              )}>
                {totalGainLossPercent >= 0 ? (
                  <ArrowUpRight className="h-6 w-6 text-success" />
                ) : (
                  <ArrowDownRight className="h-6 w-6 text-destructive" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="portfolio">
            <Briefcase className="h-4 w-4 mr-2" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="performance">
            <LineChart className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="allocation">
            <PieChart className="h-4 w-4 mr-2" />
            Allocation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="mt-4">
          {investments && investments.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {investments.map((investment) => {
                const typeInfo = INVESTMENT_TYPES.find((t) => t.value === investment.type);
                const Icon = typeInfo?.Icon || Coins;
                const totalValue = investment.currentPrice * investment.shares;
                const totalCost = investment.purchasePrice * investment.shares;
                const gainLoss = totalValue - totalCost;
                const gainLossPercent = (gainLoss / totalCost) * 100;

                return (
                  <Card key={investment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{investment.name}</p>
                              {investment.symbol && (
                                <Badge variant="secondary">{investment.symbol}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {investment.shares} shares @ {formatCurrency(investment.currentPrice)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(totalValue)}</p>
                            <p className={cn(
                              'text-sm',
                              gainLoss >= 0 ? 'text-success' : 'text-destructive'
                            )}>
                              {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)} ({gainLossPercent.toFixed(2)}%)
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(investment)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(investment.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
                        <span>{typeInfo?.label || investment.type}</span>
                        <span>Purchased: {new Date(investment.purchaseDate).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No investments yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking your investment portfolio
                </p>
                <Button onClick={handleOpenDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Investment
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Performance</CardTitle>
              <CardDescription>Historical value over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="url(#valueGradient)"
                      strokeWidth={2}
                      name="Portfolio Value"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>Portfolio distribution by type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={typeBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {typeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Allocation Details</CardTitle>
                <CardDescription>Breakdown by investment type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {typeBreakdown.map((item) => {
                    const percentage = (item.value / totalValue) * 100;
                    return (
                      <div key={item.type} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                            <span className="font-semibold">{formatCurrency(item.value)}</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {typeBreakdown.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No investments to analyze
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingInvestment ? 'Edit Investment' : 'Add Investment'}
            </DialogTitle>
            <DialogDescription>
              {editingInvestment
                ? 'Update your investment details.'
                : 'Add a new investment to your portfolio.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Name"
                placeholder="e.g., Apple Inc."
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="Symbol (optional)"
                placeholder="e.g., AAPL"
                {...register('symbol')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Select
                value={watch('type') || 'stocks'}
                onValueChange={(value) => setValue('type', value as InvestmentFormData['type'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Shares/Units"
                type="number"
                step="0.0001"
                placeholder="0"
                error={errors.shares?.message}
                {...register('shares', { valueAsNumber: true })}
              />
              <Input
                label="Purchase Date"
                type="date"
                error={errors.purchaseDate?.message}
                {...register('purchaseDate')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Purchase Price"
                type="number"
                step="0.01"
                placeholder="0.00"
                leftAddon="$"
                error={errors.purchasePrice?.message}
                {...register('purchasePrice', { valueAsNumber: true })}
              />
              <Input
                label="Current Price"
                type="number"
                step="0.01"
                placeholder="0.00"
                leftAddon="$"
                error={errors.currentPrice?.message}
                {...register('currentPrice', { valueAsNumber: true })}
              />
            </div>

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
                {editingInvestment ? 'Update' : 'Add'} Investment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Investment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this investment? This action cannot be undone.
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
