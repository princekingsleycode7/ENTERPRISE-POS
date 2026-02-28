import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Transactions } from './pages/Transactions';
import { AuditLogs } from './pages/AuditLogs';
import { TaxAdvisor } from './pages/TaxAdvisor';
import { PendingActivation } from './pages/PendingActivation';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { useAuthStore } from './stores/useAuthStore';
import { useAdminAuthStore } from './stores/useAdminAuthStore';
import { syncService } from './services/offline/syncService';
import { checkTaxDeadlines } from './services/tax/taxNotificationService';
import { isMerchantActive } from './services/merchant/merchantService';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastContainer } from './components/common/Toast';
import { Spinner } from './components/common/Spinner';

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Protected Route wrapper with merchant activation check
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const merchantId = useAuthStore((state) => state.merchantId);
  const [isMerchantActiveState, setIsMerchantActive] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !merchantId) {
      setIsLoading(false);
      return;
    }

    const checkActivation = async () => {
      try {
        const isActive = await isMerchantActive(merchantId);
        setIsMerchantActive(isActive);
      } catch (error) {
        console.error('Error checking merchant activation:', error);
        // On error, assume inactive to be safe
        setIsMerchantActive(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkActivation();
  }, [isAuthenticated, merchantId]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // If merchant is not active, redirect to pending activation page
  if (isMerchantActiveState === false) {
    return <Navigate to="/pending-activation" replace />;
  }

  return <>{children}</>;
};

// Admin Protected Route - checks for platform_admin role
const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const adminUser = useAdminAuthStore((state) => state.user);
  const role = useAdminAuthStore((state) => state.role);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Small delay to allow auth state to initialize
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!adminUser || role !== 'platform_admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { lastActivity, isAuthenticated, logout, updateActivity } = useAuthStore();

  useEffect(() => {
    syncService.init();
    // Check tax deadlines on app startup
    checkTaxDeadlines();
  }, []);

  // Session Monitor
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAuthenticated) {
        const now = Date.now();
        if (now - lastActivity > SESSION_TIMEOUT) {
          logout();
        }
      }
    }, 60000); // Check every minute

    // Activity listeners
    const handleActivity = () => {
      if (isAuthenticated) updateActivity();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [isAuthenticated, lastActivity, logout, updateActivity]);

  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          {/* Merchant Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/pending-activation" element={<PendingActivation />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            }
          />
          
          {/* Protected Merchant Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/pos" replace />} />
            <Route path="pos" element={<POS />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="tax-advisor" element={<TaxAdvisor />} />
          </Route>
        </Routes>
      </HashRouter>
      <ToastContainer />
    </ErrorBoundary>
  );
};

export default App;