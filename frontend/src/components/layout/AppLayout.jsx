import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatbotWidget from '@/components/widgets/ChatbotWidget';
import { useSocket } from '@/hooks/useSocket';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/api/axios';
import { notificationsApi } from '@/api/notifications';

const routeTitles = {
  '/dashboard': 'nav.dashboard',
  '/stations': 'nav.stations',
  '/alerts': 'nav.alerts',
  '/reports': 'nav.reports',
  '/ai': 'nav.ai',
  '/notifications': 'nav.notifications',
  '/help': 'nav.help',
  '/profile': 'nav.profile',
  '/admin/users': 'nav.users',
  '/admin/invitations': 'nav.invitations',
  '/admin/activity': 'nav.activity',
};

const TOAST_STYLES = {
  info:    { cls: 'bg-info/10 border-info/30 text-info',       Icon: Info },
  success: { cls: 'bg-success/10 border-success/30 text-success', Icon: CheckCircle2 },
  error:   { cls: 'bg-danger/10 border-danger/30 text-danger',  Icon: AlertCircle },
  warn:    { cls: 'bg-warn/10 border-warn/30 text-warn',        Icon: AlertCircle },
};

function GlobalToast() {
  const { toast, clearToast } = useUiStore();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 4000);
    return () => clearTimeout(t);
  }, [toast?.id]);

  const cfg = TOAST_STYLES[toast?.type] ?? TOAST_STYLES.info;

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium min-w-72 max-w-sm ${cfg.cls}`}
        >
          <cfg.Icon size={16} className="shrink-0" />
          <span className="flex-1">{toast.message}</span>
          <button onClick={clearToast} className="opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { incrementUnread, theme, setUnreadNotifications, setPageSubtitle } = useUiStore();
  const { isAuthenticated, accessToken, setToken, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const titleKey = Object.keys(routeTitles).find((k) => location.pathname.startsWith(k))
    ?? 'nav.dashboard';

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    setPageSubtitle(null);
  }, [location.pathname]);

  const { data: notifUnreadCount } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll().then((r) => r.data.data),
    staleTime: 30_000,
    select: (data) => data.noLeidas,
  });

  useEffect(() => {
    if (typeof notifUnreadCount === 'number') {
      setUnreadNotifications(notifUnreadCount);
    }
  }, [notifUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (accessToken) return;

    api.post('/auth/refresh-token')
      .then(({ data }) => {
        setToken(data.data.accessToken);
      })
      .catch(() => {
        logout();
        navigate('/login', { replace: true });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSocket({
    onNewAlert: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onNewNotification: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onSensorUpdate: (data) => {
      queryClient.setQueryData(['sensor-live', data.stationId], data);
    },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title={t(titleKey)} />
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
      {location.pathname === '/help' && <ChatbotWidget mode="help" />}
      <GlobalToast />
    </div>
  );
}
