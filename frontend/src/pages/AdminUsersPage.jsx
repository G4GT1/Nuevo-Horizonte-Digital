import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users, Search, Shield, Ban, RotateCcw, Trash2,
  ChevronLeft, ChevronRight, Loader2, X, Check, UserCog, Edit2, AlertCircle,
} from 'lucide-react';
import { adminApi } from '@/api/admin';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';

const ROLES = ['superadmin', 'tecnico', 'alumnado'];
const ROLE_BADGE = { superadmin: 'badge-danger', tecnico: 'badge-info', alumnado: 'badge-green' };

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ msg, type = 'error', onClose }) {
  if (!msg) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${
        type === 'error'
          ? 'bg-danger/10 border-danger/30 text-danger'
          : 'bg-success/10 border-success/30 text-success'
      }`}
    >
      <AlertCircle size={14} />
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100"><X size={13} /></button>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { user: me } = useAuthStore();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState(null); // { type: 'role'|'delete'|'edit', user }
  const [toast, setToast] = useState(null); // { msg, type }

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const canManage = (targetUser) => {
    if (me?.role === 'tecnico' && targetUser.role !== 'alumnado') {
      showToast(t('errors.technicianRestriction'), 'error');
      return false;
    }
    return true;
  };

  const effectiveRoleFilter = me?.role === 'tecnico' ? 'alumnado' : roleFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, effectiveRoleFilter],
    queryFn: () =>
      adminApi.getUsers({ page, limit: 15, ...(search ? { search } : {}), ...(effectiveRoleFilter ? { role: effectiveRoleFilter } : {}) })
        .then((r) => r.data.data),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const suspendMut = useMutation({
    mutationFn: (id) => adminApi.suspendUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (e) => showToast(e.response?.data?.message ?? t('common.error')),
  });

  const reactivateMut = useMutation({
    mutationFn: (id) => adminApi.reactivateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (e) => showToast(e.response?.data?.message ?? t('common.error')),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setModal(null); },
    onError: (e) => { setModal(null); showToast(e.response?.data?.message ?? t('common.error')); },
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }) => adminApi.changeRole(id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setModal(null); },
    onError: (e) => { setModal(null); showToast(e.response?.data?.message ?? t('common.error')); },
  });

  const editMut = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setModal(null); },
    onError: (e) => showToast(e.response?.data?.message ?? t('common.error')),
  });

  const usuarios = data?.usuarios ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const isTecnico = me?.role === 'tecnico';
  const isAdmin = me?.role === 'superadmin';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users size={20} />{t('admin.users')}</h1>
          <p className="page-subtitle">{total} usuarios totales</p>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <Toast key="toast" msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
          <input
            type="text"
            className="input pl-9 text-sm"
            placeholder={t('common.search') + '...'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {!isTecnico && (
          <div className="flex gap-1.5">
            <button
              onClick={() => { setRoleFilter(''); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                !roleFilter ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-text-muted hover:bg-card'
              }`}
            >
              Todos
            </button>
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => { setRoleFilter(r); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${
                  roleFilter === r ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-text-muted hover:bg-card'
                }`}
              >
                {t(`admin.${r}`)}
              </button>
            ))}
          </div>
        )}
        {isTecnico && (
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-primary/10 text-primary border-primary/30">
            {t('admin.alumnado')}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border bg-surface">
            <tr>
              {['Nombre', 'Email', 'Rol', 'Estado', 'Último acceso', 'Acciones'].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="table-cell text-center text-text-muted py-8">{t('common.loading')}</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={6} className="table-cell text-center text-text-muted py-8">{t('common.noResults')}</td></tr>
            ) : usuarios.map((u) => (
              <motion.tr
                key={u._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-card-hover transition-colors"
              >
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {`${u.nombre?.[0] ?? ''}${u.apellidos?.[0] ?? ''}`.toUpperCase()}
                    </div>
                    <p className="text-text font-medium text-sm">{u.nombre} {u.apellidos}</p>
                  </div>
                </td>
                <td className="table-cell text-text-muted">{u.email}</td>
                <td className="table-cell">
                  <span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-muted'}`}>{t(`admin.${u.role}`)}</span>
                </td>
                <td className="table-cell">
                  <span className={`badge ${u.suspended ? 'badge-danger' : 'badge-green'}`}>
                    {u.suspended ? t('admin.suspended') : t('admin.active')}
                  </span>
                </td>
                <td className="table-cell text-text-muted text-xs">
                  {u.lastLogin ? format(new Date(u.lastLogin), 'dd/MM/yy HH:mm') : '—'}
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-1">
                    {String(me?.id) !== String(u._id) && (
                      <>
                        {/* Edit */}
                        <button
                          onClick={() => { if (!canManage(u)) return; setModal({ type: 'edit', user: u }); }}
                          className="btn-ghost p-1.5"
                          title={t('admin.editUser')}
                        >
                          <Edit2 size={13} />
                        </button>
                        {/* Change role — superadmin only */}
                        {isAdmin && (
                          <button
                            onClick={() => setModal({ type: 'role', user: u })}
                            className="btn-ghost p-1.5"
                            title={t('admin.changeRole')}
                          >
                            <UserCog size={13} />
                          </button>
                        )}
                        {/* Suspend / Reactivate — superadmin only */}
                        {isAdmin && (u.suspended ? (
                          <button
                            onClick={() => reactivateMut.mutate(u._id)}
                            disabled={reactivateMut.isPending}
                            className="btn-ghost p-1.5 text-success"
                            title={t('admin.reactivate')}
                          >
                            <RotateCcw size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={() => suspendMut.mutate(u._id)}
                            disabled={suspendMut.isPending}
                            className="btn-ghost p-1.5 text-warn"
                            title={t('admin.suspend')}
                          >
                            <Ban size={13} />
                          </button>
                        ))}
                        <button
                          onClick={() => { if (!canManage(u)) return; setModal({ type: 'delete', user: u }); }}
                          className="btn-ghost p-1.5 text-danger"
                          title={t('admin.delete')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-text-muted">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-2.5 py-1.5 flex items-center gap-1 text-xs"
          >
            <ChevronLeft size={13} /> {t('common.previous')}
          </button>
          <span className="text-xs">{t('common.page')} {page} {t('common.of')} {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary px-2.5 py-1.5 flex items-center gap-1 text-xs"
          >
            {t('common.next')} <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modal?.type === 'edit' && (
          <EditUserModal
            user={modal.user}
            onClose={() => setModal(null)}
            onSave={(id, data) => editMut.mutate({ id, data })}
            isPending={editMut.isPending}
            t={t}
          />
        )}

        {modal?.type === 'role' && (
          <Modal title={t('admin.changeRole')} onClose={() => setModal(null)}>
            <p className="text-text-muted text-sm mb-4">
              Cambiar rol de <strong className="text-text">{modal.user.nombre} {modal.user.apellidos}</strong>
            </p>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => roleMut.mutate({ id: modal.user._id, role: r })}
                  disabled={roleMut.isPending || modal.user.role === r}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm transition-all ${
                    modal.user.role === r
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'border-border hover:bg-card text-text-muted hover:text-text'
                  }`}
                >
                  <span className="capitalize">{t(`admin.${r}`)}</span>
                  {modal.user.role === r && <Check size={14} className="text-primary" />}
                  {roleMut.isPending && <Loader2 size={14} className="animate-spin" />}
                </button>
              ))}
            </div>
          </Modal>
        )}

        {modal?.type === 'delete' && (
          <Modal title={t('admin.delete')} onClose={() => setModal(null)}>
            <p className="text-text-muted text-sm mb-5">
              {t('admin.confirmDelete')}
              <strong className="text-danger block mt-1">{modal.user.nombre} {modal.user.apellidos}</strong>
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="btn-secondary text-sm">{t('common.cancel')}</button>
              <button
                onClick={() => deleteMut.mutate(modal.user._id)}
                disabled={deleteMut.isPending}
                className="btn-danger text-sm flex items-center gap-2"
              >
                {deleteMut.isPending && <Loader2 size={13} className="animate-spin" />}
                {t('common.delete')}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Edit user modal ────────────────────────────────────────────────────────

function EditUserModal({ user, onClose, onSave, isPending, t }) {
  const schema = z.object({
    nombre:    z.string().min(2, t('validation.nameMin')),
    apellidos: z.string().min(2, t('validation.nameMin')),
    email:     z.string().min(1, t('validation.required')).email(t('validation.emailInvalid')),
  });

  const { register, handleSubmit, formState: { errors, touchedFields, dirtyFields } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nombre: user.nombre ?? '', apellidos: user.apellidos ?? '', email: user.email ?? '' },
    mode: 'onChange',
  });

  const fieldCls = (field) => {
    const hasErr = !!errors[field];
    const ok = touchedFields[field] && dirtyFields[field] && !hasErr;
    if (hasErr) return 'input !border-danger/60 focus:!border-danger';
    if (ok)     return 'input !border-success/50 focus:!border-success';
    return 'input';
  };

  return (
    <Modal title={t('admin.editUser')} onClose={onClose}>
      <p className="text-text-muted text-xs mb-4">
        Editando: <strong className="text-text">{user.nombre} {user.apellidos}</strong>
      </p>
      <form onSubmit={handleSubmit((data) => onSave(user._id, data))} noValidate className="space-y-3">
        <div>
          <label className="label">Nombre</label>
          <input type="text" className={fieldCls('nombre')} {...register('nombre')} />
          <FieldErr msg={errors.nombre?.message} />
        </div>
        <div>
          <label className="label">Apellidos</label>
          <input type="text" className={fieldCls('apellidos')} {...register('apellidos')} />
          <FieldErr msg={errors.apellidos?.message} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className={fieldCls('email')} {...register('email')} />
          <FieldErr msg={errors.email?.message} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">{t('common.cancel')}</button>
          <button type="submit" disabled={isPending} className="btn-primary text-sm flex items-center gap-2">
            {isPending && <Loader2 size={13} className="animate-spin" />}
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function FieldErr({ msg }) {
  return msg ? <p className="text-danger text-xs mt-1">{msg}</p> : null;
}

// ── Modal wrapper ──────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
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
        className="relative card w-full max-w-sm p-5 z-10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-text">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={14} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
