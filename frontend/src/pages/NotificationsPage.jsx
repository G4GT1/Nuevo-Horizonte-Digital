import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Bell, CheckCheck, Trash2, Loader2,
  AlertTriangle, Info, CheckCircle2, Settings, Users,
} from 'lucide-react';
import { notificationsApi } from '@/api/notifications';
import { useUiStore } from '@/store/uiStore';
import Pagination from '@/components/ui/Pagination';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Tipo → estilo visual ─────────────────────────────────────────────────────

const NOTIF_CONFIG = {
  alerta_critica: {
    Icon: AlertTriangle,
    iconCls: 'text-danger',
    iconBg: 'bg-danger/10 border-danger/20',
    bar: 'border-l-2 border-danger',
    unreadBg: 'bg-danger/5',
    badge: 'bg-danger/10 text-danger border border-danger/20',
    label: 'Crítico',
  },
  cuenta_suspendida: {
    Icon: AlertTriangle,
    iconCls: 'text-danger',
    iconBg: 'bg-danger/10 border-danger/20',
    bar: 'border-l-2 border-danger',
    unreadBg: 'bg-danger/5',
    badge: 'bg-danger/10 text-danger border border-danger/20',
    label: 'Crítico',
  },
  alerta_sensor: {
    Icon: AlertTriangle,
    iconCls: 'text-warn',
    iconBg: 'bg-warn/10 border-warn/20',
    bar: 'border-l-2 border-warn',
    unreadBg: 'bg-warn/5',
    badge: 'bg-warn/10 text-warn border border-warn/20',
    label: 'Advertencia',
  },
  umbral_creado: {
    Icon: Settings,
    iconCls: 'text-info',
    iconBg: 'bg-info/10 border-info/20',
    bar: 'border-l-2 border-info',
    unreadBg: 'bg-info/5',
    badge: 'bg-info/10 text-info border border-info/20',
    label: 'Sistema',
  },
  umbral_eliminado: {
    Icon: Settings,
    iconCls: 'text-text-muted',
    iconBg: 'bg-surface border-border',
    bar: 'border-l-2 border-border',
    unreadBg: 'bg-primary/3',
    badge: 'bg-surface text-text-muted border border-border',
    label: 'Sistema',
  },
  nuevo_usuario: {
    Icon: Users,
    iconCls: 'text-primary',
    iconBg: 'bg-primary/10 border-primary/20',
    bar: 'border-l-2 border-primary',
    unreadBg: 'bg-primary/5',
    badge: 'bg-primary/10 text-primary border border-primary/20',
    label: 'Sistema',
  },
  cuenta_reactivada: {
    Icon: CheckCircle2,
    iconCls: 'text-success',
    iconBg: 'bg-success/10 border-success/20',
    bar: 'border-l-2 border-success',
    unreadBg: 'bg-success/5',
    badge: 'bg-success/10 text-success border border-success/20',
    label: 'Info',
  },
  invitacion_aceptada: {
    Icon: CheckCircle2,
    iconCls: 'text-success',
    iconBg: 'bg-success/10 border-success/20',
    bar: 'border-l-2 border-success',
    unreadBg: 'bg-success/5',
    badge: 'bg-success/10 text-success border border-success/20',
    label: 'Info',
  },
  resumen_semanal: {
    Icon: CheckCircle2,
    iconCls: 'text-success',
    iconBg: 'bg-success/10 border-success/20',
    bar: 'border-l-2 border-success',
    unreadBg: 'bg-success/5',
    badge: 'bg-success/10 text-success border border-success/20',
    label: 'Info',
  },
};

const DEFAULT_CONFIG = {
  Icon: Info,
  iconCls: 'text-info',
  iconBg: 'bg-info/10 border-info/20',
  bar: 'border-l-2 border-info',
  unreadBg: 'bg-info/5',
  badge: 'bg-info/10 text-info border border-info/20',
  label: 'Sistema',
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { setUnreadNotifications } = useUiStore();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page, pageSize],
    queryFn: () => notificationsApi.getAll({ page, limit: pageSize }).then((r) => r.data.data),
    staleTime: 30_000,
    keepPreviousData: true,
    onSuccess: (d) => setUnreadNotifications(d?.noLeidas ?? 0),
  });

  const markAllMut = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      setUnreadNotifications(0);
    },
  });

  const markMut = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => notificationsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.notificaciones ?? [];
  const unread = data?.noLeidas ?? 0;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Bell size={20} />
            {t('notifications.title')}
          </h1>
          <p className="page-subtitle">
            {unread > 0 ? `${unread} sin leer` : 'Todo al día'}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAllMut.mutate()}
            disabled={markAllMut.isPending}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {markAllMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={14} />}
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="card p-8 text-center text-text-muted text-sm">{t('common.loading')}</div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Bell size={36} className="text-border mx-auto" />
          <p className="text-text-muted">{t('notifications.empty')}</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-border">
          {notifications.map((n, i) => {
            const cfg = NOTIF_CONFIG[n.type] ?? DEFAULT_CONFIG;
            const { Icon } = cfg;
            return (
              <motion.div
                key={n._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-start gap-4 px-4 py-4 hover:bg-card-hover transition-all ${cfg.bar} ${!n.read ? cfg.unreadBg : ''}`}
              >
                {/* Icon */}
                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${cfg.iconBg}`}>
                  <Icon size={15} className={cfg.iconCls} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className={`text-sm font-medium flex-1 min-w-0 ${!n.read ? 'text-text' : 'text-text-muted'}`}>
                      {n.title}
                      {!n.read && (
                        <span className="ml-2 w-1.5 h-1.5 rounded-full bg-primary inline-block align-middle" />
                      )}
                    </p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-text-muted text-xs mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-text-subtle text-xs mt-1.5">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!n.read && (
                    <button
                      onClick={() => markMut.mutate(n._id)}
                      className="btn-ghost p-1.5 text-primary hover:bg-primary/10"
                      title="Marcar como leída"
                    >
                      {markMut.isPending && markMut.variables === n._id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <CheckCircle2 size={14} />}
                    </button>
                  )}
                  <button
                    onClick={() => deleteMut.mutate(n._id)}
                    disabled={deleteMut.isPending && deleteMut.variables === n._id}
                    className="btn-ghost p-1.5 text-danger hover:bg-danger/10 disabled:opacity-50"
                    title="Eliminar"
                  >
                    {deleteMut.isPending && deleteMut.variables === n._id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {notifications.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
