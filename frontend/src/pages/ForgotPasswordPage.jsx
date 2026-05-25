import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/api/auth';

function useForgotSchema() {
  const { t } = useTranslation();
  return z.object({
    email: z.string().min(1, t('validation.required')).email(t('validation.emailInvalid')),
  });
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const schema = useForgotSchema();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const onSubmit = async ({ email }) => {
    setServerError('');
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setServerError(err.response?.data?.message ?? t('forgotPassword.errorDefault'));
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto">
          <CheckCircle2 size={26} className="text-success" />
        </div>
        <h2 className="font-heading font-bold text-xl text-text">{t('forgotPassword.successTitle')}</h2>
        <p className="text-text-muted text-sm leading-relaxed">{t('forgotPassword.successMsg')}</p>
        <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
          <ArrowLeft size={15} />
          {t('forgotPassword.back')}
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl text-text">{t('forgotPassword.title')}</h2>
        <p className="text-text-muted text-sm mt-1">{t('forgotPassword.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label className="label">{t('forgotPassword.emailLabel')}</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
            <input
              type="email"
              className={`input pl-9 ${errors.email ? '!border-danger/60 focus:!border-danger' : ''}`}
              placeholder="usuario@ejemplo.com"
              {...register('email')}
            />
          </div>
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
          {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
          {t('forgotPassword.submit')}
        </button>
      </form>

      <Link to="/login" className="flex items-center justify-center gap-1.5 text-text-muted text-sm hover:text-text transition-colors">
        <ArrowLeft size={14} />
        {t('forgotPassword.back')}
      </Link>
    </div>
  );
}
