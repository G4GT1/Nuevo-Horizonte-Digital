import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import './i18n';
import '../index.css';

import { useAuthStore } from '@shared/store/authStore';
import { useUiStore } from '@shared/store/uiStore';
import AppLayout from '@shared/components/layout/AppLayout';
import AuthLayout from '@shared/components/layout/AuthLayout';

import LoginPage from '@features/auth/pages/LoginPage';
import RegisterPage from '@features/auth/pages/RegisterPage';
import ForgotPasswordPage from '@features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@features/auth/pages/ResetPasswordPage';
import VerifyEmailPage from '@features/auth/pages/VerifyEmailPage';
import InvitePage from '@features/auth/pages/InvitePage';

import DashboardPage from '@features/dashboard/pages/DashboardPage';
import StationsPage from '@features/stations/pages/StationsPage';
import StationDetailPage from '@features/stations/pages/StationDetailPage';
import AlertsPage from '@features/alerts/pages/AlertsPage';
import ReportsPage from '@features/reports/pages/ReportsPage';
import AIAssistantPage from '@features/ai/pages/AIAssistantPage';
import NotificationsPage from '@features/notifications/pages/NotificationsPage';
import ProfilePage from '@features/profile/pages/ProfilePage';
import HelpPage from '@features/help/pages/HelpPage';
import AdminUsersPage from '@features/admin/pages/AdminUsersPage';
import AdminInvitationsPage from '@features/admin/pages/AdminInvitationsPage';
import AdminLogsPage from '@features/admin/pages/AdminLogsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

/**
 * Guard de ruta: requiere sesion autenticada con accessToken vigente.
 * Redirige a /login si alguna condicion falla.
 * @component
 * @returns {JSX.Element}
 */
function ProtectedLayout() {
  const { isAuthenticated, accessToken } = useAuthStore();
  if (!isAuthenticated || !accessToken) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

/**
 * Guard de ruta: requiere sesion activa y rol 'superadmin'.
 * Redirige a /login o /dashboard segun el fallo.
 * @component
 * @returns {JSX.Element}
 */
function AdminLayout() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'superadmin') return <Navigate to="/dashboard" replace />;
  return <AppLayout />;
}

/**
 * Guard de ruta inline: solo renderiza hijos si el rol del usuario esta permitido.
 * Muestra toast y redirige a /dashboard si el rol no tiene acceso.
 * @component
 * @param {Object} props
 * @param {string[]} props.allowedRoles - Roles con acceso a esta ruta.
 * @param {React.ReactNode} props.children - Pagina a renderizar si se permite.
 * @returns {JSX.Element|null}
 */
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

/**
 * Guard de ruta para invitados: redirige a /dashboard si el usuario ya esta autenticado.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Pagina de autenticacion a renderizar.
 * @returns {JSX.Element}
 */
function GuestRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

/**
 * Raiz de la aplicacion. Configura QueryClient, BrowserRouter y el arbol de rutas.
 * Las rutas publicas usan AuthLayout; las protegidas usan ProtectedLayout o AdminLayout.
 * @component
 * @returns {JSX.Element}
 */
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
            <Route path="/invite/:token" element={<InvitePage />} />
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
            <Route path="/admin/activity" element={<AdminLogsPage />} />
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
