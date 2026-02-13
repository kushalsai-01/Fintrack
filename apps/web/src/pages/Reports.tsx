import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  FileText,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Clock,
  Check,
  Plus,
  Trash2,
  FileSpreadsheet,
  FileIcon,
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
import { LoadingSpinner } from '@/components/ui/Loading';
import { useNotificationStore } from '@/stores/notificationStore';
import api from '@/services/api';
import { formatCurrency, cn } from '@/lib/utils';
import { reportSchema, type ReportFormData } from '@/lib/validations';
import type { Report } from '@shared/types';

const REPORT_TYPES = [
  {
    value: 'monthly',
    label: 'Monthly Summary',
    description: 'Overview of income, expenses, and savings for a specific month',
    icon: Calendar,
  },
  {
    value: 'category',
    label: 'Category Analysis',
    description: 'Detailed breakdown of spending by category',
    icon: PieChart,
  },
  {
    value: 'trends',
    label: 'Trends Report',
    description: 'Long-term trends in your financial behavior',
    icon: TrendingUp,
  },
  {
    value: 'tax',
    label: 'Tax Summary',
    description: 'Year-end summary for tax preparation',
    icon: FileSpreadsheet,
  },
  {
    value: 'goals',
    label: 'Goals Progress',
    description: 'Progress report on all your financial goals',
    icon: BarChart3,
  },
];

const FORMAT_OPTIONS = [
  { value: 'pdf', label: 'PDF', icon: FileIcon },
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet },
];

export default function Reports() {
  const { addNotification } = useNotificationStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('reports');

  // Fetch reports
  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.get<Report[]>('/reports'),
  });

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      type: 'monthly',
      format: 'pdf',
    },
  });

  const selectedType = watch('type');
  const selectedFormat = watch('format');

  // Generate report mutation
  const generateMutation = useMutation({
    mutationFn: (data: ReportFormData) => api.post<Report>('/reports/generate', data),
    onSuccess: () => {
      refetch();
      setIsDialogOpen(false);
      reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Report generating',
        message: 'Your report is being generated. It will be ready shortly.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
    onError: () => {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Error',
        message: 'Failed to generate report. Please try again.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  // Download mutation
  const downloadMutation = useMutation({
    mutationFn: async (report: Report) => {
      const blob = await api.downloadFile(`/reports/${report.id}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name}.${report.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onError: () => {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Download failed',
        message: 'Failed to download the report. Please try again.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/reports/${id}`),
    onSuccess: () => {
      refetch();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Report deleted',
        message: 'The report has been deleted.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const onSubmit = (data: ReportFormData) => {
    generateMutation.mutate(data);
  };

  const handleOpenDialog = () => {
    reset({
      type: 'monthly',
      format: 'pdf',
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });
    setIsDialogOpen(true);
  };

  // Group reports by status
  const completedReports = reports?.filter((r) => r.status === 'completed') || [];
  const pendingReports = reports?.filter((r) => r.status === 'pending' || r.status === 'generating') || [];

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
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and download detailed financial reports
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenDialog}>
          Generate Report
        </Button>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((type) => (
          <Card
            key={type.value}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => {
              setValue('type', type.value as ReportFormData['type']);
              setIsDialogOpen(true);
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <type.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{type.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reports List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-2" />
            My Reports ({completedReports.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            Processing ({pendingReports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4">
          {completedReports.length > 0 ? (
            <div className="space-y-3">
              {completedReports.map((report) => {
                const typeInfo = REPORT_TYPES.find((t) => t.value === report.type);
                const Icon = typeInfo?.icon || FileText;

                return (
                  <Card key={report.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{report.name}</p>
                              <Badge variant="secondary" className="uppercase text-xs">
                                {report.format}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(report.dateRange.start).toLocaleDateString()} -{' '}
                              {new Date(report.dateRange.end).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadMutation.mutate(report)}
                            isLoading={downloadMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(report.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No reports yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generate your first report to see it here
                </p>
                <Button onClick={handleOpenDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {pendingReports.length > 0 ? (
            <div className="space-y-3">
              {pendingReports.map((report) => {
                const typeInfo = REPORT_TYPES.find((t) => t.value === report.type);
                const Icon = typeInfo?.icon || FileText;

                return (
                  <Card key={report.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-warning animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{report.name}</p>
                              <Badge variant="warning">Processing</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(report.dateRange.start).toLocaleDateString()} -{' '}
                              {new Date(report.dateRange.end).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <LoadingSpinner size="sm" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Check className="h-12 w-12 text-success mb-4" />
                <h3 className="text-lg font-semibold">No pending reports</h3>
                <p className="text-muted-foreground">
                  All your reports have been processed
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Generate Report Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Choose the type of report and date range to generate
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Report Type</label>
              <div className="grid grid-cols-2 gap-2">
                {REPORT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setValue('type', type.value as ReportFormData['type'])}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border text-left transition-colors',
                      selectedType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <type.icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Report Name"
              placeholder="e.g., January 2024 Summary"
              error={errors.name?.message}
              {...register('name')}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                error={errors.startDate?.message}
                {...register('startDate')}
              />
              <Input
                label="End Date"
                type="date"
                error={errors.endDate?.message}
                {...register('endDate')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Format</label>
              <div className="flex gap-2">
                {FORMAT_OPTIONS.map((format) => (
                  <button
                    key={format.value}
                    type="button"
                    onClick={() => setValue('format', format.value as ReportFormData['format'])}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                      selectedFormat === format.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <format.icon className="h-4 w-4" />
                    <span className="text-sm font-medium uppercase">{format.value}</span>
                  </button>
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
              <Button type="submit" isLoading={isSubmitting || generateMutation.isPending}>
                Generate Report
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
