import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import './i18n/index.js';
import './index.css';

import { useAuthStore } from './store/authStore';
import { useUiStore } from './store/uiStore';
import AppLayout from './components/layout/AppLayout';
import AuthLayout from './components/layout/AuthLayout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import StationsPage from './pages/StationsPage';
import StationDetailPage from './pages/StationDetailPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminInvitationsPage from './pages/AdminInvitationsPage';
import AdminActivityPage from './pages/AdminActivityPage';
import HelpPage from './pages/HelpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import InviteAcceptPage from './pages/InviteAcceptPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedLayout() {
  const { isAuthenticated, accessToken } = useAuthStore();
  if (!isAuthenticated || !accessToken) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

function AdminLayout() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'superadmin') return <Navigate to="/dashboard" replace />;
  return <AppLayout />;
}

function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuthStore();
  const { showToast } = useUiStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const allowed = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (user && !allowed) {
      showToast(t('errors.accessDenied'), 'warn');
      navigate('/dashboard', { replace: true });
    }
  }, [user?.role]);

  if (!allowed) return null;
  return children;
}

function GuestRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Auth pages */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify/:token" element={<VerifyEmailPage />} />
            <Route path="/invite/:token" element={<InviteAcceptPage />} />
          </Route>

          {/* Protected app pages */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/stations" element={<StationsPage />} />
            <Route path="/stations/:source/:id" element={<StationDetailPage />} />
            <Route path="/alerts" element={<RoleRoute allowedRoles={['superadmin', 'tecnico']}><AlertsPage /></RoleRoute>} />
            <Route path="/reports" element={<RoleRoute allowedRoles={['superadmin', 'tecnico']}><ReportsPage /></RoleRoute>} />
            <Route path="/ai" element={<AIAssistantPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/admin/users" element={<RoleRoute allowedRoles={['superadmin', 'tecnico']}><AdminUsersPage /></RoleRoute>} />
          </Route>

          {/* Admin-only pages */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/invitations" element={<AdminInvitationsPage />} />
            <Route path="/admin/activity" element={<AdminActivityPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
