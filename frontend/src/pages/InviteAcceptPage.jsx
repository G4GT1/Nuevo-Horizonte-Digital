import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

function useInviteSchema() {
  const { t } = useTranslation();
  return z.object({
    nombre: z.string().min(2, t('validation.nameMin')),
    apellidos: z.string().min(2, t('validation.nameMin')),
    password: z.string().min(8, t('validation.passwordMin')),
  });
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
          className="flex items-center gap-1 text-danger text-xs mt-1"
        >
          <AlertCircle size={11} />
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export default function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { t } = useTranslation();
  const schema = useInviteSchema();

  const [inviteData, setInviteData] = useState(null);
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (!token) { setCheckError('Token no proporcionado'); setChecking(false); return; }
    authApi.validateInvite(token)
      .then((r) => { setInviteData(r.data.data); setChecking(false); })
      .catch((err) => {
        setCheckError(err.response?.data?.message ?? 'Invitación inválida o expirada');
        setChecking(false);
      });
  }, [token]);

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const { data: res } = await authApi.acceptInvite({ token, ...data });
      setAuth(res.data.user, res.data.accessToken);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.message ?? 'Error al aceptar la invitación');
    }
  };

  const fieldCls = (field) =>
    `input ${errors[field] ? '!border-danger/60 focus:!border-danger' : ''}`;

  if (checking) {
    return (
      <div className="text-center space-y-3">
        <Loader2 size={28} className="text-primary animate-spin mx-auto" />
        <p className="text-text-muted text-sm">Validando invitación...</p>
      </div>
    );
  }

  if (checkError) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-danger/15 border border-danger/30 flex items-center justify-center mx-auto">
          <AlertCircle size={26} className="text-danger" />
        </div>
        <h2 className="font-heading font-bold text-xl text-text">Invitación inválida</h2>
        <p className="text-text-muted text-sm">{checkError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl text-text">Aceptar invitación</h2>
        <p className="text-text-muted text-sm mt-1">
          Invitado como <strong className="text-text">{inviteData?.email}</strong>
          {inviteData?.role && (
            <span className="ml-2 badge badge-info capitalize">{inviteData.role}</span>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nombre</label>
            <input type="text" className={fieldCls('nombre')} placeholder="Juan" {...register('nombre')} />
            <FieldError msg={errors.nombre?.message} />
          </div>
          <div>
            <label className="label">Apellidos</label>
            <input type="text" className={fieldCls('apellidos')} placeholder="García" {...register('apellidos')} />
            <FieldError msg={errors.apellidos?.message} />
          </div>
        </div>

        <div>
          <label className="label">Contraseña</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              className={`${fieldCls('password')} pr-10`}
              placeholder="••••••••"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              tabIndex={-1}
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <FieldError msg={errors.password?.message} />
        </div>

        <AnimatePresence>
          {serverError && (
            <motion.div
              key="server-error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2"
            >
              <AlertCircle size={14} />
              {serverError}
            </motion.div>
          )}
        </AnimatePresence>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
          {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
          Crear cuenta
        </button>
      </form>
    </div>
  );
}
