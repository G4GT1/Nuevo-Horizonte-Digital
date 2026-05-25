import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, LogIn, AlertCircle, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

function useLoginSchema() {
  const { t } = useTranslation();
  return z.object({
    email: z.string().min(1, t('validation.required')).email(t('validation.emailInvalid')),
    password: z.string().min(1, t('validation.required')),
  });
}

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const schema = useLoginSchema();

  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState({ msg: '', showResend: false, email: '' });
  const [shake, setShake] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendOk, setResendOk] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const mapError = (err) => {
    const code = err.response?.data?.errorCode;
    const status = err.response?.status;
    if (status === 429) return { msg: t('errors.tooManyAttempts'), showResend: false, email: '' };
    switch (code) {
      case 'EMAIL_NOT_FOUND':   return { msg: t('errors.emailNotFound'),    showResend: false, email: '' };
      case 'WRONG_PASSWORD':    return { msg: t('errors.wrongPassword'),     showResend: false, email: '' };
      case 'EMAIL_NOT_VERIFIED': return { msg: t('errors.emailNotVerified'), showResend: true,  email: err.response?.data?.email ?? '' };
      case 'ACCOUNT_SUSPENDED': return { msg: t('errors.accountSuspended'),  showResend: false, email: '' };
      default: return { msg: err.response?.data?.message ?? t('errors.loginGeneric'), showResend: false, email: '' };
    }
  };

  const onSubmit = async (data) => {
    setServerError({ msg: '', showResend: false, email: '' });
    setResendOk(false);
    try {
      const { data: res } = await authApi.login(data);
      setAuth(res.data.user, res.data.accessToken);
      navigate('/dashboard');
    } catch (err) {
      const mapped = mapError(err);
      setServerError(mapped);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleResend = async () => {
    if (!serverError.email) return;
    setResendLoading(true);
    try {
      await authApi.resendVerification(serverError.email);
      setResendOk(true);
    } catch {}
    finally { setResendLoading(false); }
  };

  const fieldCls = (field) =>
    `input ${errors[field] ? '!border-danger/60 focus:!border-danger' : ''}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl text-text">{t('auth.login')}</h2>
        <p className="text-text-muted text-sm mt-1">{t('auth.loginSubtitle')}</p>
      </div>

      <motion.form
        animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-4"
      >
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
              autoComplete="current-password"
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
          <FieldError msg={errors.password?.message} />
        </div>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-primary hover:text-primary-light transition-colors">
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <AnimatePresence>
          {serverError.msg && (
            <motion.div
              key="server-error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{serverError.msg}</span>
              </div>
              {serverError.showResend && !resendOk && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="w-full flex items-center justify-center gap-2 text-sm border border-info/30 bg-info/5 text-info px-3 py-2 rounded-lg hover:bg-info/10 transition-all disabled:opacity-50"
                >
                  {resendLoading ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                  {t('auth.resendVerification')}
                </button>
              )}
              {resendOk && (
                <p className="text-success text-xs text-center">{t('auth.verificationResent')}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-2.5" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <LogIn size={16} />
              <span>{t('auth.login')}</span>
            </>
          )}
        </button>
      </motion.form>

      <p className="text-center text-text-muted text-sm">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="text-primary hover:text-primary-light font-medium transition-colors">
          {t('auth.register')}
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
