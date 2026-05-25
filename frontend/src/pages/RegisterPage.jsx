import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/api/auth';

function useRegisterSchema() {
  const { t } = useTranslation();
  return z.object({
    nombre: z.string().min(2, t('validation.nameMin')),
    apellidos: z.string().min(2, t('validation.nameMin')),
    email: z.string().min(1, t('validation.required')).email(t('validation.emailInvalid')),
    password: z.string().min(8, t('validation.passwordMin')),
  });
}

function passwordStrength(pwd) {
  if (pwd.length === 0) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

const strengthLabel = ['', 'Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte'];
const strengthColor = ['', 'bg-danger', 'bg-warn', 'bg-yellow-400', 'bg-success', 'bg-success'];

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const schema = useRegisterSchema();

  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const password = watch('password', '');
  const strength = passwordStrength(password);

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await authApi.register(data);
      setRegisteredEmail(data.email);
      setSuccess(true);
    } catch (err) {
      const code = err.response?.data?.errorCode;
      if (code === 'EMAIL_EXISTS') {
        setServerError(t('errors.emailExists'));
      } else {
        const errs = err.response?.data?.errors;
        setServerError(errs ? errs.map((e) => e.msg).join('. ') : (err.response?.data?.message ?? t('errors.registerGeneric')));
      }
      setShakeKey((k) => k + 1);
    }
  };

  const fieldCls = (field) =>
    `input ${errors[field] ? '!border-danger/60 focus:!border-danger' : ''}`;

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto">
          <CheckCircle2 size={26} className="text-success" />
        </div>
        <h2 className="font-heading font-bold text-xl text-text">¡Registro completado!</h2>
        <p className="text-text-muted text-sm leading-relaxed">
          Hemos enviado un email de verificación a <strong className="text-text">{registeredEmail}</strong>.
          Revisa tu bandeja de entrada para activar tu cuenta.
        </p>
        <button onClick={() => navigate('/login')} className="btn-primary w-full py-2.5">
          Ir al inicio de sesión
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl text-text">{t('auth.register')}</h2>
        <p className="text-text-muted text-sm mt-1">{t('auth.registerSubtitle')}</p>
      </div>

      <motion.form
        key={shakeKey}
        animate={shakeKey > 0 ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.45 }}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('auth.name')}</label>
            <input type="text" className={fieldCls('nombre')} placeholder="Juan" {...register('nombre')} />
            <FieldError msg={errors.nombre?.message} />
          </div>
          <div>
            <label className="label">{t('auth.surnames')}</label>
            <input type="text" className={fieldCls('apellidos')} placeholder="García" {...register('apellidos')} />
            <FieldError msg={errors.apellidos?.message} />
          </div>
        </div>

        <div>
          <label className="label">{t('auth.email')}</label>
          <input
            type="email"
            className={fieldCls('email')}
            placeholder="usuario@ies.es"
            autoComplete="email"
            {...register('email')}
          />
          <FieldError msg={errors.email?.message} />
        </div>

        <div>
          <label className="label">{t('auth.password')}</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              className={`${fieldCls('password')} pr-10`}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
              tabIndex={-1}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="mt-1.5 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= strength ? strengthColor[strength] : 'bg-border'}`}
                  />
                ))}
              </div>
              <p className="text-text-subtle text-xs">{strengthLabel[strength]}</p>
            </div>
          )}
          <FieldError msg={errors.password?.message} />
        </div>

        <AnimatePresence>
          {serverError && (
            <motion.div
              key="server-error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2"
            >
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-2.5" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <UserPlus size={16} />
              <span>{t('auth.register')}</span>
            </>
          )}
        </button>
      </motion.form>

      <p className="text-center text-text-muted text-sm">
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className="text-primary hover:text-primary-light font-medium transition-colors">
          {t('auth.login')}
        </Link>
      </p>
    </div>
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
          className="flex items-center gap-1 text-danger text-xs mt-1"
        >
          <AlertCircle size={11} />
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
