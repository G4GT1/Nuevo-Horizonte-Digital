import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Plus, X, Loader2, CheckCircle2, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminApi } from '@/api/admin';
import Pagination from '@/components/ui/Pagination';
import { format, isPast } from 'date-fns';

const STATUS_BADGE = {
  pending: 'badge-warn',
  used: 'badge-green',
  expired: 'badge-muted',
};

export default function AdminInvitationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // full inv object
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-invitations'],
    queryFn: () => adminApi.getInvitations().then((r) => r.data.data.invitaciones ?? []),
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => adminApi.deleteInvitation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-invitations'] });
      setDeleteTarget(null);
      setSuccess('Invitación eliminada.');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (e) => {
      setDeleteTarget(null);
      setErr(e.response?.data?.message ?? 'Error al eliminar invitación');
      setTimeout(() => setErr(''), 4000);
    },
  });

  const invitations = data ?? [];
  const totalPages = Math.max(1, Math.ceil(invitations.length / pageSize));
  const pagedInvitations = invitations.slice((page - 1) * pageSize, page * pageSize);

  const getStatus = (inv) => {
    if (inv.usedAt) return 'used';
    if (isPast(new Date(inv.expiresAt))) return 'expired';
    return 'pending';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Mail size={20} />
            {t('admin.invitations')}
          </h1>
          <p className="page-subtitle">{invitations.length} invitaciones</p>
        </div>
        <button onClick={() => { setErr(''); setOpen(true); }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={14} />
          {t('admin.inviteUser')}
        </button>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-success/10 border border-success/20 text-success rounded-lg px-4 py-3 text-sm"
        >
          <CheckCircle2 size={15} />
          {success}
        </motion.div>
      )}

      {err && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-danger/10 border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm"
        >
          <AlertCircle size={15} />
          {err}
          <button onClick={() => setErr('')} className="ml-auto"><X size={13} /></button>
        </motion.div>
      )}

      {isLoading ? (
        <div className="card p-8 text-center text-text-muted text-sm">{t('common.loading')}</div>
      ) : invitations.length === 0 ? (
        <div className="card p-10 text-center space-y-2">
          <Mail size={32} className="text-border mx-auto" />
          <p className="text-text-muted text-sm">No hay invitaciones enviadas</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border bg-surface">
              <tr>
                {['Email', 'Rol', 'Estado', 'Creada', 'Expira', 'Usada', ''].map((h, i) => (
                  <th key={i} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedInvitations.map((inv) => {
                const status = getStatus(inv);
                return (
                  <tr key={inv._id} className="hover:bg-card-hover transition-colors">
                    <td className="table-cell font-medium">{inv.email}</td>
                    <td className="table-cell">
                      <span className="badge badge-info capitalize">{t(`admin.${inv.role}`)}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${STATUS_BADGE[status]}`}>
                        {status === 'pending' && <Clock size={10} />}
                        {status === 'used' && <CheckCircle2 size={10} />}
                        {status === 'expired' && <AlertCircle size={10} />}
                        {t(`admin.${status}`)}
                      </span>
                    </td>
                    <td className="table-cell text-text-muted text-xs">
                      {format(new Date(inv.createdAt), 'dd/MM/yy HH:mm')}
                    </td>
                    <td className="table-cell text-text-muted text-xs">
                      {format(new Date(inv.expiresAt), 'dd/MM/yy HH:mm')}
                    </td>
                    <td className="table-cell text-text-muted text-xs">
                      {inv.usedAt ? format(new Date(inv.usedAt), 'dd/MM/yy HH:mm') : '—'}
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => setDeleteTarget(inv)}
                        className="btn-ghost p-1.5 text-text-subtle hover:text-danger hover:bg-danger/10 rounded transition-colors"
                        title="Eliminar invitación"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {invitations.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <AnimatePresence>
        {open && (
          <InviteModal
            key="invite-modal"
            onClose={() => setOpen(false)}
            onSuccess={(email) => {
              qc.invalidateQueries({ queryKey: ['admin-invitations'] });
              setOpen(false);
              setSuccess(`Invitación enviada a ${email}`);
              setTimeout(() => setSuccess(''), 4000);
            }}
          />
        )}
        {deleteTarget && (
          <DeleteInvitationModal
            key="delete-modal"
            invitation={deleteTarget}
            isPending={deleteMut.isPending}
            onConfirm={() => deleteMut.mutate(deleteTarget._id)}
            onClose={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DeleteInvitationModal({ invitation, isPending, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative card w-full max-w-sm p-5 space-y-4 z-10"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-text">Eliminar invitación</h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={14} /></button>
        </div>
        <p className="text-sm text-text-muted leading-relaxed">
          ¿Eliminar la invitación enviada a{' '}
          <strong className="text-text">{invitation.email}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="btn-danger text-sm flex items-center gap-2"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Eliminar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function InviteModal({ onClose, onSuccess }) {
  const { t } = useTranslation();
  const schema = z.object({
    email: z.string().min(1, t('validation.required')).email(t('validation.emailInvalid')),
    role: z.string(),
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', role: 'tecnico' },
    mode: 'onChange',
  });

  const [serverError, setServerError] = useState('');

  const sendMut = useMutation({
    mutationFn: (d) => adminApi.sendInvitation(d),
    onSuccess: (_, vars) => onSuccess(vars.email),
    onError: (e) => setServerError(e.response?.data?.message ?? 'Error al enviar invitación'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative card w-full max-w-sm p-5 space-y-4 z-10"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-text">{t('admin.inviteUser')}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={14} /></button>
        </div>

        <form onSubmit={handleSubmit((data) => sendMut.mutate(data))} noValidate className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className={`input ${errors.email ? '!border-danger/60 focus:!border-danger' : ''}`}
              placeholder="usuario@ies.es"
              {...register('email')}
            />
            <AnimatePresence>
              {errors.email && (
                <motion.p
                  key="err"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-danger text-xs mt-1"
                >
                  <AlertCircle size={11} />
                  {errors.email.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div>
            <label className="label">{t('admin.role')}</label>
            <select className="input" {...register('role')}>
              <option value="tecnico">{t('admin.tecnico')}</option>
              <option value="alumnado">{t('admin.alumnado')}</option>
              <option value="superadmin">{t('admin.superadmin')}</option>
            </select>
          </div>

          {serverError && (
            <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{serverError}</p>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">{t('common.cancel')}</button>
            <button
              type="submit"
              disabled={isSubmitting || sendMut.isPending}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {(isSubmitting || sendMut.isPending) && <Loader2 size={13} className="animate-spin" />}
              Enviar invitación
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
