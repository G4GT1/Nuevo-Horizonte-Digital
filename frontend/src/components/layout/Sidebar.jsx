import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Radio, Bell, FileText, Bot,
  User, Users, Mail, Activity, LogOut, ChevronLeft,
  Leaf, ShieldCheck, HelpCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { authApi } from '@/api/auth';
import { disconnectSocket } from '@/hooks/useSocket';

const ALL_NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard', roles: ['superadmin', 'tecnico', 'alumnado'] },
  { to: '/stations',  icon: Radio,           key: 'stations',  roles: ['superadmin', 'tecnico', 'alumnado'] },
  { to: '/alerts',    icon: Bell,            key: 'alerts',    roles: ['superadmin', 'tecnico'] },
  { to: '/reports',   icon: FileText,        key: 'reports',   roles: ['superadmin', 'tecnico'] },
  { to: '/ai',        icon: Bot,             key: 'ai',        roles: ['superadmin', 'tecnico', 'alumnado'] },
  { to: '/notifications', icon: Bell,        key: 'notifications', roles: ['superadmin', 'tecnico', 'alumnado'] },
  { to: '/help',          icon: HelpCircle,  key: 'help',          roles: ['superadmin', 'tecnico', 'alumnado'] },
];

const adminItems = [
  { to: '/admin/users',        icon: Users,    key: 'users',        roles: ['superadmin', 'tecnico'] },
  { to: '/admin/invitations',  icon: Mail,     key: 'invitations',  roles: ['superadmin'] },
  { to: '/admin/activity',     icon: Activity, key: 'activity',     roles: ['superadmin'] },
];

// Role badge definitions
const ROLE_BADGE = {
  superadmin: {
    label: 'Admin',
    cls: 'text-yellow-500 border-yellow-500/40 bg-yellow-500/10',
    shimmer: true,
    tooltip: 'Gestión completa: usuarios, alertas, informes, configuración',
  },
  tecnico: {
    label: 'Técnico',
    cls: 'text-green-500 border-green-500/40 bg-green-500/10',
    pulse: true,
    tooltip: 'Acceso: estaciones, alertas, informes, IA',
  },
  alumnado: {
    label: 'Alumno',
    cls: 'text-blue-400 border-blue-400/40 bg-blue-400/10',
    blink: true,
    tooltip: 'Acceso: estaciones, IA, notificaciones',
  },
};

function RoleBadge({ role, size = 'sm', className = '' }) {
  const rb = ROLE_BADGE[role];
  if (!rb) return null;

  return (
    <div className={`relative group/badge ${className}`}>
      <span
        className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border
          transition-transform duration-150 hover:scale-105 cursor-default select-none
          ${rb.cls}
          ${rb.shimmer ? 'animate-shimmer-badge' : ''}
          ${rb.pulse ? 'animate-pulse-badge' : ''}
          ${rb.blink ? 'animate-blink-border' : ''}
        `}
      >
        {rb.label}
      </span>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 hidden group-hover/badge:block z-50 pointer-events-none">
        <div className="bg-surface border border-border rounded-lg px-2.5 py-2 text-[10px] text-text-muted shadow-glow leading-relaxed text-center">
          {rb.tooltip}
        </div>
        <div className="w-2 h-2 bg-surface border-b border-r border-border rotate-45 mx-auto -mt-1" />
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, unreadNotifications } = useUiStore();
  const navigate = useNavigate();

  const role = user?.role ?? 'alumnado';
  const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(role));
  const visibleAdminItems = adminItems.filter(item => item.roles.includes(role));

  const initials = user
    ? `${user.nombre?.[0] ?? ''}${user.apellidos?.[0] ?? ''}`.toUpperCase()
    : '??';
  const fullName = user ? `${user.nombre} ${user.apellidos}` : '';

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    disconnectSocket();
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col bg-surface border-r border-border shrink-0"
      style={{ zIndex: 40 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <Leaf size={14} className="text-primary" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col min-w-0 flex-1"
            >
              <span className="font-heading font-bold text-text text-sm leading-tight truncate">Horizonte Verde</span>
              <span className="text-text-subtle text-xs leading-tight truncate">Digital</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            title={sidebarCollapsed ? t(`nav.${key}`) : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-150 relative group ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-text-muted hover:bg-card hover:text-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className="shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium truncate"
                    >
                      {t(`nav.${key}`)}
                    </motion.span>
                  )}
                </AnimatePresence>
                {key === 'notifications' && unreadNotifications > 0 && (
                  <span className="absolute right-2 top-2 w-4 h-4 rounded-full bg-primary text-bg text-[10px] font-bold flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {visibleAdminItems.length > 0 && (
          <>
            <div className="pt-3 pb-1.5 px-2.5">
              <AnimatePresence>
                {!sidebarCollapsed ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-text-subtle text-xs font-semibold uppercase tracking-wider"
                  >
                    <ShieldCheck size={11} />
                    <span>{t('nav.admin')}</span>
                  </motion.div>
                ) : (
                  <div className="border-t border-border" />
                )}
              </AnimatePresence>
            </div>
            {visibleAdminItems.map(({ to, icon: Icon, key }) => (
              <NavLink
                key={to}
                to={to}
                title={sidebarCollapsed ? t(`nav.${key}`) : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-text-muted hover:bg-card hover:text-text'
                  }`
                }
              >
                <Icon size={17} className="shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium truncate"
                    >
                      {t(`nav.${key}`)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer — user info + role badge */}
      <div className="border-t border-border p-2 space-y-1">
        <button
          onClick={() => navigate('/profile')}
          title={sidebarCollapsed ? fullName : undefined}
          className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-card transition-all duration-150 group"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-heading font-bold shrink-0 group-hover:bg-primary/30 transition-colors">
            {initials}
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col min-w-0 flex-1 text-left"
              >
                <span className="text-sm font-medium text-text truncate">{fullName}</span>
                <RoleBadge role={role} className="mt-0.5" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={handleLogout}
          title={sidebarCollapsed ? t('nav.logout') : undefined}
          className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-all duration-150"
        >
          <LogOut size={17} className="shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-medium"
              >
                {t('nav.logout')}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse tab */}
      <button
        onClick={toggleSidebar}
        className="absolute right-0 translate-x-full top-1/2 -translate-y-1/2
                   w-4 h-12 rounded-r-lg
                   bg-surface border border-l-0 border-border
                   flex items-center justify-center
                   hover:bg-primary/10 hover:text-primary hover:border-primary/30
                   text-text-muted transition-all duration-150 z-50 shadow-sm"
        aria-label="Toggle sidebar"
      >
        <motion.div
          animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <ChevronLeft size={12} />
        </motion.div>
      </button>
    </motion.aside>
  );
}

export { RoleBadge };
