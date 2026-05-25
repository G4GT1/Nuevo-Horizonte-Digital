import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, Globe, Sun, Moon, Search, ChevronRight,
  LayoutDashboard, Radio, FileText, Bot, HelpCircle,
  User, Users, Mail, Activity, AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { RoleBadge } from '@/components/layout/Sidebar';
import { stationsApi } from '@/api/stations';
import i18n from '@/i18n';

// ── Page catalog ──────────────────────────────────────────────────────────────

const NAV_PAGES = [
  { labelKey: 'nav.dashboard',     icon: LayoutDashboard, path: '/dashboard',          roles: ['superadmin', 'tecnico', 'alumnado'], kw: ['panel', 'dashboard', 'inicio', 'home'] },
  { labelKey: 'nav.stations',      icon: Radio,           path: '/stations',           roles: ['superadmin', 'tecnico', 'alumnado'], kw: ['estaciones', 'stations', 'sensores', 'sensors'] },
  { labelKey: 'nav.alerts',        icon: Bell,            path: '/alerts',             roles: ['superadmin', 'tecnico'],             kw: ['alertas', 'alerts', 'avisos', 'umbral'] },
  { labelKey: 'nav.reports',       icon: FileText,        path: '/reports',            roles: ['superadmin', 'tecnico'],             kw: ['informes', 'reports', 'pdf', 'excel', 'export'] },
  { labelKey: 'nav.ai',            icon: Bot,             path: '/ai',                 roles: ['superadmin', 'tecnico', 'alumnado'], kw: ['ia', 'ai', 'asistente', 'assistant', 'chat'] },
  { labelKey: 'nav.notifications', icon: Bell,            path: '/notifications',      roles: ['superadmin', 'tecnico', 'alumnado'], kw: ['notificaciones', 'notifications'] },
  { labelKey: 'nav.help',          icon: HelpCircle,      path: '/help',               roles: ['superadmin', 'tecnico', 'alumnado'], kw: ['ayuda', 'help', 'soporte', 'support', 'faq'] },
  { labelKey: 'nav.profile',       icon: User,            path: '/profile',            roles: ['superadmin', 'tecnico', 'alumnado'], kw: ['perfil', 'profile', 'cuenta', 'account'] },
  { labelKey: 'nav.users',         icon: Users,           path: '/admin/users',        roles: ['superadmin', 'tecnico'],             kw: ['usuarios', 'users', 'admin'] },
  { labelKey: 'nav.invitations',   icon: Mail,            path: '/admin/invitations',  roles: ['superadmin'],                        kw: ['invitaciones', 'invitations', 'invite'] },
  { labelKey: 'nav.activity',      icon: Activity,        path: '/admin/activity',     roles: ['superadmin'],                        kw: ['actividad', 'activity', 'logs', 'audit'] },
];

const ACTIONS = {
  superadmin: [
    { label: 'Invitar usuario',    icon: Mail,           path: '/admin/invitations', kw: ['invitar', 'invite', 'nuevo usuario'] },
    { label: 'Gestionar usuarios', icon: Users,          path: '/admin/users',       kw: ['usuarios', 'users', 'gestionar'] },
    { label: 'Crear alerta',       icon: AlertTriangle,  path: '/alerts',            kw: ['alerta', 'alert', 'umbral', 'threshold'] },
    { label: 'Exportar informe',   icon: FileText,       path: '/reports',           kw: ['exportar', 'export', 'pdf', 'informe'] },
    { label: 'Ver actividad',      icon: Activity,       path: '/admin/activity',    kw: ['actividad', 'logs', 'activity'] },
  ],
  tecnico: [
    { label: 'Crear alerta',     icon: AlertTriangle, path: '/alerts',       kw: ['alerta', 'umbral'] },
    { label: 'Exportar informe', icon: FileText,      path: '/reports',      kw: ['exportar', 'pdf'] },
    { label: 'Ver alumnado',     icon: Users,         path: '/admin/users',  kw: ['usuarios', 'alumnado', 'students'] },
  ],
  alumnado: [],
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SearchSection({ label, children }) {
  return (
    <div>
      <div className="px-3 pt-2.5 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">{label}</span>
      </div>
      {children}
    </div>
  );
}

function SearchItem({ icon: Icon, label, badge, onClick, accent = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-card-hover ${
        accent ? 'text-primary' : 'text-text-muted hover:text-text'
      }`}
    >
      <Icon size={14} className="shrink-0" />
      <span className="flex-1 text-left truncate">{label}</span>
      {badge && (
        <span className="text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded text-text-subtle shrink-0">{badge}</span>
      )}
      <ChevronRight size={11} className="text-text-subtle shrink-0" />
    </button>
  );
}

// ── TopbarSearch ──────────────────────────────────────────────────────────────

function TopbarSearch() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role ?? 'alumnado';

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch stations when panel opens
  const { data: stations = [] } = useQuery({
    queryKey: ['search-stations'],
    queryFn: async () => {
      const [fc, cs] = await Promise.allSettled([
        stationsApi.getFCStations(),
        stationsApi.getCesensStations(),
      ]);
      const fcList = fc.status === 'fulfilled'
        ? (fc.value.data?.data ?? []).map((s) => ({
            name: s.name?.custom ?? s.name?.original ?? String(s._id),
            path: `/stations/fieldclimate/${s.name?.original ?? s._id}`,
            source: 'FieldClimate',
          }))
        : [];
      const csList = cs.status === 'fulfilled'
        ? (cs.value.data?.data ?? []).map((s) => ({
            name: s.nombre ?? s.ubicacion ?? `Cesens #${s.id}`,
            path: `/stations/cesens/${s.id ?? s.id_ubicacion}`,
            source: 'Cesens',
          }))
        : [];
      return [...fcList, ...csList];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const q = query.toLowerCase().trim();

  const pages = NAV_PAGES.filter((p) => p.roles.includes(role));
  const actions = ACTIONS[role] ?? [];

  const filteredPages = q
    ? pages.filter((p) => p.kw.some((k) => k.includes(q)) || t(p.labelKey).toLowerCase().includes(q)).slice(0, 5)
    : pages.slice(0, 5);

  const filteredStations = q
    ? stations.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 4)
    : stations.slice(0, 3);

  const filteredActions = q
    ? actions.filter((a) => a.kw.some((k) => k.includes(q)) || a.label.toLowerCase().includes(q))
    : actions.slice(0, 4);

  const hasResults = filteredPages.length > 0 || filteredStations.length > 0 || filteredActions.length > 0;

  const goTo = (path) => {
    navigate(path);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('search.placeholder')}
          className="w-full bg-bg border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-text placeholder:text-text-subtle
                     focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-150"
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-1.5 left-0 right-0 card shadow-glow-lg z-50 overflow-hidden pb-1.5 max-h-[420px] overflow-y-auto"
          >
            {q.length > 0 && !hasResults && (
              <p className="text-text-muted text-xs px-3 py-4 text-center">{t('common.noResults')}</p>
            )}
            {q.length === 0 && !hasResults && (
              <p className="text-text-muted text-xs px-3 py-4 text-center">Escribe para buscar...</p>
            )}

            {filteredPages.length > 0 && (
              <SearchSection label={t('search.pages')}>
                {filteredPages.map((page) => (
                  <SearchItem key={page.path} icon={page.icon} label={t(page.labelKey)} onClick={() => goTo(page.path)} />
                ))}
              </SearchSection>
            )}

            {filteredStations.length > 0 && (
              <SearchSection label={t('search.stations')}>
                {filteredStations.map((s) => (
                  <SearchItem key={s.path} icon={Radio} label={s.name} badge={s.source} onClick={() => goTo(s.path)} />
                ))}
              </SearchSection>
            )}

            {filteredActions.length > 0 && (
              <SearchSection label={t('search.quickActions')}>
                {filteredActions.map((a) => (
                  <SearchItem key={a.path + a.label} icon={a.icon} label={a.label} onClick={() => goTo(a.path)} accent />
                ))}
              </SearchSection>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────

export default function Topbar() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { unreadNotifications, theme, toggleTheme } = useUiStore();

  const toggleLang = () => {
    const next = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(next);
  };

  const initials = user
    ? `${user.nombre?.[0] ?? ''}${user.apellidos?.[0] ?? ''}`.toUpperCase()
    : '??';

  return (
    <header className="h-14 flex items-center gap-3 px-5 border-b border-border bg-surface shrink-0">
      <div className="flex-1 flex justify-center">
        <TopbarSearch />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={toggleLang}
          className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-2"
          title="Switch language"
        >
          <Globe size={14} />
          <span className="uppercase font-semibold">{i18n.language}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="btn-ghost p-2"
          title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <Link to="/notifications" className="relative btn-ghost p-2" aria-label={t('nav.notifications')}>
          <Bell size={17} />
          {unreadNotifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded bg-danger text-white text-[10px] font-bold flex items-center justify-center leading-none border-2 border-surface">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-1.5 ml-1">
          {user?.role && <RoleBadge role={user.role} />}
          <Link
            to="/profile"
            className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center
                       text-primary text-xs font-heading font-bold hover:bg-primary/30 transition-all duration-150"
            aria-label={t('nav.profile')}
          >
            {initials}
          </Link>
        </div>
      </div>
    </header>
  );
}
