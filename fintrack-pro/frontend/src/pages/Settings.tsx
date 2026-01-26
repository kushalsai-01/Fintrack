import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  CreditCard,
  Download,
  Trash2,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Lock,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useNotificationStore } from '@/stores/notificationStore';
import api from '@/services/api';
import { cn } from '@/lib/utils';

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'CAD', label: 'CAD ($)', symbol: '$' },
  { value: 'AUD', label: 'AUD ($)', symbol: '$' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
  { value: 'INR', label: 'INR (₹)', symbol: '₹' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
];

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { addNotification } = useNotificationStore();

  const [activeTab, setActiveTab] = useState('profile');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    budgetAlerts: true,
    goalReminders: true,
    weeklyReport: true,
    tips: false,
  });

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => api.put('/users/profile', data),
    onSuccess: () => {
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Profile updated',
        message: 'Your profile has been updated successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
    onError: () => {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Update failed',
        message: 'Failed to update profile. Please try again.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormData) =>
      api.put('/users/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      passwordForm.reset();
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Password changed',
        message: 'Your password has been changed successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
    onError: () => {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Password change failed',
        message: 'Failed to change password. Please check your current password.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => api.delete('/users/account'),
    onSuccess: () => {
      logout();
      navigate('/login');
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const blob = await api.downloadFile('/users/export');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fintrack-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Data exported',
        message: 'Your data has been exported successfully.',
        createdAt: new Date().toISOString(),
        read: false,
      });
    },
  });

  const handleProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handlePasswordSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="data">
            <Download className="h-4 w-4 mr-2" />
            Data
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    error={profileForm.formState.errors.firstName?.message}
                    {...profileForm.register('firstName')}
                  />
                  <Input
                    label="Last Name"
                    error={profileForm.formState.errors.lastName?.message}
                    {...profileForm.register('lastName')}
                  />
                </div>
                <Input
                  label="Email"
                  type="email"
                  error={profileForm.formState.errors.email?.message}
                  {...profileForm.register('email')}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Currency</label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Language</label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" isLoading={updateProfileMutation.isPending}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                  <div className="relative">
                    <Input
                      label="Current Password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      error={passwordForm.formState.errors.currentPassword?.message}
                      {...passwordForm.register('currentPassword')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      label="New Password"
                      type={showNewPassword ? 'text' : 'password'}
                      error={passwordForm.formState.errors.newPassword?.message}
                      {...passwordForm.register('newPassword')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Input
                    label="Confirm New Password"
                    type="password"
                    error={passwordForm.formState.errors.confirmPassword?.message}
                    {...passwordForm.register('confirmPassword')}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" isLoading={changePasswordMutation.isPending}>
                      Change Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Authenticator App</p>
                      <p className="text-sm text-muted-foreground">Not configured</p>
                    </div>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sessions</CardTitle>
                <CardDescription>
                  Manage your active sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out All Devices
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
                { key: 'push', label: 'Push Notifications', description: 'Receive push notifications in your browser' },
                { key: 'budgetAlerts', label: 'Budget Alerts', description: 'Get notified when you approach budget limits' },
                { key: 'goalReminders', label: 'Goal Reminders', description: 'Reminders about your savings goals' },
                { key: 'weeklyReport', label: 'Weekly Report', description: 'Receive a weekly summary of your finances' },
                { key: 'tips', label: 'Financial Tips', description: 'Receive personalized money-saving tips' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      notifications[item.key as keyof typeof notifications]
                        ? 'bg-primary'
                        : 'bg-muted'
                    )}
                    onClick={() =>
                      setNotifications((prev) => ({
                        ...prev,
                        [item.key]: !prev[item.key as keyof typeof notifications],
                      }))
                    }
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        notifications[item.key as keyof typeof notifications]
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                Customize the appearance of the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'light', label: 'Light', Icon: Sun },
                  { value: 'dark', label: 'Dark', Icon: Moon },
                  { value: 'system', label: 'System', Icon: Monitor },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                      theme === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <option.Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{option.label}</span>
                    {theme === option.value && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>
                  Download all your financial data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => exportDataMutation.mutate()}
                  isLoading={exportDataMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export All Data
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions that affect your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Account Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove
              all your data from our servers.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-destructive/10 rounded-lg text-sm">
            <p className="font-medium text-destructive">Warning:</p>
            <ul className="list-disc list-inside mt-2 text-muted-foreground space-y-1">
              <li>All your transactions will be deleted</li>
              <li>All your budgets and goals will be removed</li>
              <li>Your financial history will be lost forever</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccountMutation.mutate()}
              isLoading={deleteAccountMutation.isPending}
            >
              Yes, Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
