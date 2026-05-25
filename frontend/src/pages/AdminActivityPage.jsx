import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { adminApi } from '@/api/admin';
import { RoleBadge } from '@/components/layout/Sidebar';
import Pagination from '@/components/ui/Pagination';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const ACTION_COLOR = {
  login: 'text-success',
  logout: 'text-text-muted',
  email_verificado: 'text-info',
  password_reset: 'text-warn',
  alerta_config_creada: 'text-primary',
  alerta_config_eliminada: 'text-danger',
  alerta_resuelta: 'text-success',
  invitacion_aceptada: 'text-primary',
};

export default function AdminActivityPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [userFilter, setUserFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-activity', page, pageSize, userFilter],
    queryFn: () =>
      adminApi.getActivity({ page, limit: pageSize, ...(userFilter ? { userId: userFilter } : {}) })
        .then((r) => r.data.data),
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Activity size={20} />
          {t('nav.activity')}
        </h1>
        <p className="page-subtitle">{total} entradas en el log</p>
      </div>

      {/* Log list */}
      {isLoading ? (
        <div className="card p-8 text-center text-text-muted text-sm">{t('common.loading')}</div>
      ) : logs.length === 0 ? (
        <div className="card p-10 text-center text-text-muted">Sin actividad registrada</div>
      ) : (
        <div className="card overflow-hidden divide-y divide-border">
          {logs.map((log, i) => (
            <motion.div
              key={log._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-start gap-4 px-4 py-3 hover:bg-card-hover transition-colors"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium font-mono ${ACTION_COLOR[log.action] ?? 'text-text'}`}>
                    {log.action}
                  </span>
                  {log.userId && typeof log.userId === 'object' ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-text-muted text-xs">
                        — {log.userId.nombre} {log.userId.apellidos}
                      </span>
                      <RoleBadge role={log.userId.role} />
                      <span className="text-text-subtle text-xs font-mono">{log.userId.email}</span>
                    </div>
                  ) : log.userId ? (
                    <span className="text-text-subtle text-xs italic line-through ml-1">
                      {String(log.userId)}
                    </span>
                  ) : log.extra?.email ? (
                    <span className="flex items-center gap-1.5 ml-1">
                      <span className="text-text-subtle text-xs font-mono line-through">{log.extra.email}</span>
                      <span className="badge badge-muted text-[9px]">usuario eliminado</span>
                    </span>
                  ) : null}
                </div>
                {log.extra && Object.keys(log.extra).length > 0 && (
                  <p className="text-text-subtle text-xs mt-0.5 font-mono truncate">
                    {JSON.stringify(log.extra)}
                  </p>
                )}
                <p className="text-text-subtle text-xs mt-1">
                  {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                  {' · '}
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })}
                </p>
              </div>
              {log.ip && (
                <span className="text-text-subtle text-xs font-mono shrink-0">{log.ip}</span>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
