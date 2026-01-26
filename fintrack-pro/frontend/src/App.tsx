import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';

// Layout
import { Layout } from '@/components/layout/Layout';

// Auth Pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';

// Main Pages
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import Budgets from '@/pages/Budgets';
import Categories from '@/pages/Categories';
import Goals from '@/pages/Goals';
import Analytics from '@/pages/Analytics';

// Finance Pages
import Bills from '@/pages/Bills';
import Investments from '@/pages/Investments';
import Debts from '@/pages/Debts';

// Tools Pages
import AIAdvisor from '@/pages/AIAdvisor';
import Reports from '@/pages/Reports';
import Insights from '@/pages/Insights';

// Settings Pages
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';
import Notifications from '@/pages/Notifications';

// Loading component
import { LoadingSpinner } from '@/components/ui/Loading';

/**
 * Protected Route Component
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * Public Route Component (redirects to dashboard if authenticated)
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/**
 * Main App Component
 */
function App() {
  const { fetchUser, isAuthenticated } = useAuthStore();
  const { connect, disconnect, fetchNotifications } = useNotificationStore();
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetchUser();
      }
      setIsInitialized(true);
    };
    
    initAuth();
  }, [fetchUser]);

  // Show nothing while initializing to prevent flash
  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connect();
      fetchNotifications();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect, fetchNotifications]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
          },
          success: {
            iconTheme: {
              primary: 'hsl(var(--success))',
              secondary: 'hsl(var(--success-foreground))',
            },
          },
          error: {
            iconTheme: {
              primary: 'hsl(var(--destructive))',
              secondary: 'hsl(var(--destructive-foreground))',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="categories" element={<Categories />} />
          <Route path="goals" element={<Goals />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="bills" element={<Bills />} />
          <Route path="investments" element={<Investments />} />
          <Route path="debts" element={<Debts />} />
          <Route path="advisor" element={<AIAdvisor />} />
          <Route path="reports" element={<Reports />} />
          <Route path="insights" element={<Insights />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
