import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Transactions } from './pages/Transactions';
import { AuditLogs } from './pages/AuditLogs';
import { useAuthStore } from './stores/useAuthStore';
import { syncService } from './services/offline/syncService';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastContainer } from './components/common/Toast';

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { lastActivity, isAuthenticated, logout, updateActivity } = useAuthStore();

  useEffect(() => {
    syncService.init();
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
          <Route path="/login" element={<Login />} />
          
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
          </Route>
        </Routes>
      </HashRouter>
      <ToastContainer />
    </ErrorBoundary>
  );
};

export default App;