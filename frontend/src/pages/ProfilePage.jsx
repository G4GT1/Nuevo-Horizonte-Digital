import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Globe, Moon, Sun, Bell, Mail, BarChart2,
  CheckCircle2, Shield, Send, Loader2, X, Edit2,
  Lock, Check, Eye, EyeOff,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth';
import { reportsApi } from '@/api/reports';
import i18n from '@/i18n/index.js';
import { format } from 'date-fns';

// ── Role config ────────────────────────────────────────────────────────────

const ROLE_LABEL = { superadmin: 'Superadmin', tecnico: 'Técnico', alumnado: 'Alumnado' };
const ROLE_CLS   = {
  superadmin: 'bg-primary/10 text-primary border-primary/20',
  tecnico:    'bg-info/10 text-info border-info/20',
  alumnado:   'bg-success/10 text-success border-success/20',
};

const ROLE_PERMS = {
  alumnado: {
    can:    ['Ver estaciones y datos de sensores', 'Usar el asistente IA', 'Ver predicción meteorológica', 'Gestionar notificaciones'],
    cannot: ['Configurar alertas y umbrales', 'Exportar informes', 'Gestionar usuarios', 'Acceso al panel de administración'],
  },
  tecnico: {
    can:    ['Ver estaciones y datos de sensores', 'Usar el asistente IA', 'Ver predicción meteorológica', 'Configurar alertas y umbrales', 'Exportar informes', 'Gestionar usuarios con rol alumnado'],
    cannot: ['Gestionar usuarios técnicos o admins', 'Gestionar invitaciones', 'Ver registro de actividad', 'Crear usuarios directamente'],
  },
  superadmin: {
    can:    ['Acceso completo a todas las funciones', 'Gestionar todos los usuarios y roles', 'Enviar invitaciones', 'Ver registro de actividad', 'Configurar alertas y umbrales', 'Exportar informes'],
    cannot: [],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative rounded-full transition-colors shrink-0 ${on ? 'bg-primary' : 'bg-surface border border-border'}`}
      style={{ width: 40, height: 22 }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-bg transition-transform"
        style={{ width: 18, height: 18, left: 2, transform: on ? 'translateX(18px)' : 'translateX(0)' }}
      />
    </button>
  );
}

function FieldError({ msg }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.p
          key="err"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-danger text-xs mt-1"
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function inputCls(hasError, touched, isDirty) {
  if (hasError) return 'input !border-danger/60 focus:!border-danger';
  if (touched && isDirty && !hasError) return 'input !border-success/50 focus:!border-success';
  return 'input';
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [weeklyToast, setWeeklyToast] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const toggleLang = () => {
    const next = (user?.preferences?.language ?? 'es') === 'es' ? 'en' : 'es';
    updateUser({ preferences: { ...user?.preferences, language: next } });
    i18n.changeLanguage(next);
    flash();
  };

  const toggleTheme = () => {
    const next = (user?.preferences?.theme ?? 'dark') === 'dark' ? 'light' : 'dark';
    updateUser({ preferences: { ...user?.preferences, theme: next } });
    flash();
  };

  const toggleNotif = (key) => {
    updateUser({ notifications: { ...user?.notifications, [key]: !user?.notifications?.[key] } });
    flash();
  };

  const weeklyMut = useMutation({
    mutationFn: () => reportsApi.sendWeeklyNow(),
    onSuccess: () => { setWeeklyToast('ok'); setTimeout(() => setWeeklyToast(null), 5000); },
    onError:   () => { setWeeklyToast('error'); setTimeout(() => setWeeklyToast(null), 5000); },
  });

  const initials  = user ? `${user.nombre?.[0] ?? ''}${user.apellidos?.[0] ?? ''}`.toUpperCase() : '??';
  const roleCls   = ROLE_CLS[user?.role]   ?? 'bg-surface text-text-muted border-border';
  const roleLabel = ROLE_LABEL[user?.role] ?? user?.role ?? '—';
  const isDark    = (user?.preferences?.theme ?? 'dark') === 'dark';
  const isEN      = (user?.preferences?.language ?? 'es') === 'en';
  const perms     = ROLE_PERMS[user?.role] ?? ROLE_PERMS.alumnado;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border-2 border-primary/30 flex items-center justify-center shadow-glow shrink-0">
            <span className="font-heading font-bold text-primary text-xl">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-heading font-bold text-text text-lg leading-tight">
                {user?.nombre} {user?.apellidos}
              </h2>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleCls}`}>
                <Shield size={9} className="inline mr-1" />
                {roleLabel}
              </span>
            </div>
            <p className="text-text-muted text-sm mt-0.5">{user?.email}</p>
            {user?.lastLogin && (
              <p className="text-text-subtle text-xs mt-1">
                Último acceso: {format(new Date(user.lastLogin), 'dd/MM/yyyy HH:mm')}
              </p>
            )}
          </div>
          <AnimatePresence>
            {saved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 text-success text-sm shrink-0"
              >
                <CheckCircle2 size={14} /> {t('profile.saved')}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── 2-col: edit profile + change password ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <EditProfileCard
          user={user}
          updateUser={updateUser}
          editing={editingProfile}
          setEditing={setEditingProfile}
          msg={profileMsg}
          setMsg={setProfileMsg}
          t={t}
        />
        <ChangePasswordCard
          editing={editingPassword}
          setEditing={setEditingPassword}
          msg={pwdMsg}
          setMsg={setPwdMsg}
          t={t}
        />
      </div>

      {/* ── Permissions card ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
        <h3 className="font-heading font-semibold text-text flex items-center gap-2 text-sm mb-4">
          <Shield size={14} className="text-primary" />
          {t('profile.permissions')}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ml-1 ${roleCls}`}>{roleLabel}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-text-subtle text-xs uppercase tracking-wider font-semibold mb-2">{t('profile.canDo')}</p>
            <ul className="space-y-1.5">
              {perms.can.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-text">
                  <Check size={13} className="text-success shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {perms.cannot.length > 0 && (
            <div>
              <p className="text-text-subtle text-xs uppercase tracking-wider font-semibold mb-2">{t('profile.cannotDo')}</p>
              <ul className="space-y-1.5">
                {perms.cannot.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-text-muted">
                    <X size={13} className="text-danger shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Preferences ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5 space-y-4">
        <h3 className="font-heading font-semibold text-text flex items-center gap-2 text-sm">
          <Globe size={14} className="text-primary" />
          {t('profile.preferences')}
        </h3>
        <div className="flex items-center justify-between py-2.5 border-b border-border">
          <div>
            <p className="text-text text-sm font-medium">{t('profile.language')}</p>
            <p className="text-text-subtle text-xs">Idioma de la interfaz</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (!isEN) return; toggleLang(); }}
              title="Español"
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all border-2 ${
                !isEN
                  ? 'border-success shadow-[0_0_8px_rgba(34,197,94,0.35)] scale-110'
                  : 'border-transparent opacity-50 hover:opacity-75'
              }`}
            >
              🇪🇸
            </button>
            <button
              onClick={() => { if (isEN) return; toggleLang(); }}
              title="English"
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all border-2 ${
                isEN
                  ? 'border-success shadow-[0_0_8px_rgba(34,197,94,0.35)] scale-110'
                  : 'border-transparent opacity-50 hover:opacity-75'
              }`}
            >
              🇬🇧
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <div>
            <p className="text-text text-sm font-medium">{t('profile.theme')}</p>
            <p className="text-text-subtle text-xs">{isDark ? 'Modo oscuro' : 'Modo claro'}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center hover:border-primary/40 transition-all"
          >
            {isDark ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-warn" />}
          </button>
        </div>
      </motion.div>

      {/* ── Notifications ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5 space-y-1">
        <h3 className="font-heading font-semibold text-text flex items-center gap-2 text-sm mb-3">
          <Bell size={14} className="text-primary" />
          {t('profile.notifications')}
        </h3>
        <AnimatePresence>
          {weeklyToast && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm mb-3 ${
                weeklyToast === 'ok' ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'
              }`}
            >
              {weeklyToast === 'ok'
                ? <><CheckCircle2 size={14} /> Resumen enviado a {user?.email}</>
                : <><X size={14} /> Error al enviar. Inténtalo de nuevo.</>}
            </motion.div>
          )}
        </AnimatePresence>
        {[
          { key: 'emailCritical', Icon: Mail, label: t('profile.emailCritical'), desc: 'Email cuando hay alertas críticas' },
          {
            key: 'weeklyReport', Icon: BarChart2, label: t('profile.weeklyReport'), desc: 'Resumen semanal por email (lunes 08:00)',
            extra: (
              <button
                onClick={() => weeklyMut.mutate()}
                disabled={weeklyMut.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-info/30 bg-info/5 text-info text-xs font-medium hover:bg-info/10 transition-all disabled:opacity-50 relative"
              >
                {weeklyMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Enviar ahora
                <span className="absolute -top-2 -right-2 bg-warn text-bg text-[8px] font-bold px-1 rounded">Demo</span>
              </button>
            ),
          },
        ].map(({ key, Icon, label, desc, extra }) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                <Icon size={14} className="text-text-muted" />
              </div>
              <div className="min-w-0">
                <p className="text-text text-sm font-medium">{label}</p>
                <p className="text-text-subtle text-xs">{desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              {extra}
              <Toggle on={user?.notifications?.[key] !== false} onChange={() => toggleNotif(key)} />
            </div>
          </div>
        ))}
        <p className="text-text-subtle text-xs pt-1">
          Las preferencias se guardan localmente. Para persistirlas entre dispositivos, contacta al administrador.
        </p>
      </motion.div>
    </div>
  );
}

// ── Edit profile card ──────────────────────────────────────────────────────

function EditProfileCard({ user, updateUser, editing, setEditing, msg, setMsg, t }) {
  const schema = z.object({
    nombre:    z.string().min(2, t('validation.nameMin')),
    apellidos: z.string().min(2, t('validation.nameMin')),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, touchedFields, dirtyFields } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nombre: user?.nombre ?? '', apellidos: user?.apellidos ?? '' },
    mode: 'onChange',
  });

  const onSubmit = async (data) => {
    setMsg('');
    try {
      const { data: res } = await authApi.updateProfile(data);
      updateUser({ nombre: res.data.usuario.nombre, apellidos: res.data.usuario.apellidos });
      setMsg('ok');
      setEditing(false);
      reset({ nombre: res.data.usuario.nombre, apellidos: res.data.usuario.apellidos });
    } catch (err) {
      setMsg(err.response?.data?.message ?? 'Error al guardar');
    }
  };

  const onCancel = () => { setEditing(false); setMsg(''); reset(); };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-text flex items-center gap-2 text-sm">
          <User size={14} className="text-primary" />
          {t('profile.editProfile')}
        </h3>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-ghost p-1.5 text-text-muted hover:text-primary" title={t('profile.editProfile')}>
            <Edit2 size={13} />
          </button>
        )}
      </div>

      {!editing ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {[
            { label: 'Nombre',    value: user?.nombre    ?? '—' },
            { label: 'Apellidos', value: user?.apellidos ?? '—' },
            { label: 'Email',     value: user?.email     ?? '—' },
            { label: 'Rol',       value: ROLE_LABEL[user?.role] ?? user?.role ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="space-y-0.5">
              <p className="text-text-subtle text-[10px] uppercase tracking-wider font-medium">{label}</p>
              <p className="text-text text-sm font-medium truncate">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input
              type="text"
              className={inputCls(!!errors.nombre, touchedFields.nombre, dirtyFields.nombre)}
              {...register('nombre')}
            />
            <FieldError msg={errors.nombre?.message} />
          </div>
          <div>
            <label className="label">Apellidos</label>
            <input
              type="text"
              className={inputCls(!!errors.apellidos, touchedFields.apellidos, dirtyFields.apellidos)}
              {...register('apellidos')}
            />
            <FieldError msg={errors.apellidos?.message} />
          </div>
          {msg && msg !== 'ok' && (
            <p className="text-danger text-xs">{msg}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={isSubmitting} className="btn-primary text-sm flex items-center gap-2 py-1.5">
              {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {t('common.save')}
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary text-sm py-1.5">{t('common.cancel')}</button>
          </div>
        </form>
      )}
      {msg === 'ok' && !editing && (
        <AnimatePresence>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-success text-xs flex items-center gap-1"
          >
            <CheckCircle2 size={12} /> {t('profile.saved')}
          </motion.p>
        </AnimatePresence>
      )}
    </motion.div>
  );
}

// ── Change password card ───────────────────────────────────────────────────

function ChangePasswordCard({ editing, setEditing, msg, setMsg, t }) {
  const [showCurr, setShowCurr] = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);

  const schema = z.object({
    currentPassword: z.string().min(1, t('validation.currentPasswordRequired')),
    newPassword:     z.string()
      .min(8, t('validation.passwordStrong'))
      .regex(/[A-Z]/, t('validation.passwordStrong'))
      .regex(/[0-9]/, t('validation.passwordStrong'))
      .regex(/[^A-Za-z0-9]/, t('validation.passwordStrong')),
    confirmPassword: z.string(),
  }).refine((d) => d.newPassword === d.confirmPassword, {
    message: t('validation.passwordConfirm'),
    path: ['confirmPassword'],
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, touchedFields, dirtyFields } } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const onSubmit = async (data) => {
    setMsg('');
    try {
      await authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      setMsg('ok');
      setEditing(false);
      reset();
    } catch (err) {
      const code = err.response?.data?.errorCode;
      if (code === 'WRONG_CURRENT_PASSWORD') {
        setMsg('La contraseña actual no es correcta.');
      } else {
        setMsg(err.response?.data?.message ?? 'Error al cambiar la contraseña');
      }
    }
  };

  const onCancel = () => { setEditing(false); setMsg(''); reset(); };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-text flex items-center gap-2 text-sm">
          <Lock size={14} className="text-primary" />
          {t('profile.changePassword')}
        </h3>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-ghost p-1.5 text-text-muted hover:text-primary">
            <Edit2 size={13} />
          </button>
        )}
      </div>

      {!editing ? (
        <div className="space-y-0.5">
          <p className="text-text-subtle text-xs">Contraseña</p>
          <p className="text-text text-sm tracking-widest">••••••••</p>
          {msg === 'ok' && (
            <p className="text-success text-xs flex items-center gap-1 mt-2">
              <CheckCircle2 size={12} /> {t('profile.saved')}
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
          <PasswordField
            label={t('profile.currentPassword')}
            show={showCurr}
            onToggle={() => setShowCurr((s) => !s)}
            reg={register('currentPassword')}
            error={errors.currentPassword?.message}
            touched={touchedFields.currentPassword}
            dirty={dirtyFields.currentPassword}
          />
          <PasswordField
            label={t('profile.newPassword')}
            show={showNew}
            onToggle={() => setShowNew((s) => !s)}
            reg={register('newPassword')}
            error={errors.newPassword?.message}
            touched={touchedFields.newPassword}
            dirty={dirtyFields.newPassword}
          />
          <PasswordField
            label={t('profile.confirmPassword')}
            show={showConf}
            onToggle={() => setShowConf((s) => !s)}
            reg={register('confirmPassword')}
            error={errors.confirmPassword?.message}
            touched={touchedFields.confirmPassword}
            dirty={dirtyFields.confirmPassword}
          />
          {msg && msg !== 'ok' && <p className="text-danger text-xs">{msg}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={isSubmitting} className="btn-primary text-sm flex items-center gap-2 py-1.5">
              {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {t('common.save')}
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary text-sm py-1.5">{t('common.cancel')}</button>
          </div>
        </form>
      )}
    </motion.div>
  );
}

function PasswordField({ label, show, onToggle, reg, error, touched, dirty }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={`${inputCls(!!error, touched, dirty)} pr-10`}
          {...reg}
        />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors" tabIndex={-1}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <FieldError msg={error} />
    </div>
  );
}
