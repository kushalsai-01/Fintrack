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
 * 
 * FIXED: Moved all useEffect hooks BEFORE any conditional returns.
 * React hooks must be called in the same order on every render.
 * Having useEffect after a conditional return violated the Rules of Hooks
 * and caused a silent crash resulting in blank screen.
 */
function App() {
  const { fetchUser, isAuthenticated } = useAuthStore();
  const { connect, disconnect, fetchNotifications } = useNotificationStore();
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize auth on mount
  // FIXED: Use empty dependency array to run only once
  // FIXED: Always set isInitialized even if fetchUser fails
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          await fetchUser();
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        // Always initialize, regardless of success/failure
        setIsInitialized(true);
      }
    };
    
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array - run only once on mount

  // Connect WebSocket when authenticated
  // FIXED: This useEffect was AFTER a conditional return, violating Rules of Hooks
  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      connect();
      fetchNotifications();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, isInitialized, connect, disconnect, fetchNotifications]);

  // Show loading while initializing (moved AFTER all hooks)
  if (!isInitialized) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background" style={{ backgroundColor: 'var(--background, #0f172a)', color: 'var(--foreground, #f8fafc)' }}>
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground" style={{ color: 'var(--muted-foreground, #94a3b8)' }}>Loading FinTrack Pro...</p>
      </div>
    );
  }

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
