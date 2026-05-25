import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@features/auth/api/auth.api';

/**
 * Hook que crea el schema de validacion del formulario de nueva contrasena.
 * Incluye refinamiento para verificar que los dos campos coinciden.
 * @returns {import('zod').ZodEffects} Schema con password y confirm
 */
function useResetSchema() {
  const { t } = useTranslation();
  return z.object({
    password: z.string().min(8, t('validation.passwordMin')),
    confirm:  z.string().min(1, t('validation.required')),
  }).refine((d) => d.password === d.confirm, {
    message: t('validation.passwordConfirm'),
    path: ['confirm'],
  });
}

/**
 * Muestra un mensaje de error de validacion con animacion.
 * @component
 * @param {Object} props
 * @param {string} [props.msg] - Texto del error. Si es undefined no renderiza nada.
 * @returns {JSX.Element|null}
 */
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

/**
 * Pagina para restablecer la contrasena mediante un token recibido por email.
 * Lee el token del query string (?token=...) y lo envia junto con la nueva contrasena.
 * Si el token esta ausente muestra un mensaje de error y un enlace para pedir uno nuevo.
 * @component
 * @returns {JSX.Element}
 */
export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  /* El token llega como query param en el enlace del email */
  const token = params.get('token') ?? '';
  const schema = useResetSchema();

  const [showPass, setShowPass] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  /**
   * Envia el token y la nueva contrasena al backend.
   * @param {{ password: string, confirm: string }} data - Campos validados por zod
   */
  const onSubmit = async ({ password }) => {
    setServerError('');
    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setServerError(err.response?.data?.message ?? 'Error al restablecer la contraseña');
    }
  };

  /* Pantalla de exito: redirige al login */
  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto">
          <CheckCircle2 size={26} className="text-success" />
        </div>
        <h2 className="font-heading font-bold text-xl text-text">Contraseña actualizada</h2>
        <p className="text-text-muted text-sm">Ya puedes iniciar sesión con tu nueva contraseña.</p>
        <button onClick={() => navigate('/login')} className="btn-primary w-full py-2.5">
          Ir al inicio de sesión
        </button>
      </motion.div>
    );
  }

  /* Si no hay token en la URL, el enlace es invalido o ha expirado */
  if (!token) {
    return (
      <div className="text-center space-y-4">
        <AlertCircle size={32} className="text-danger mx-auto" />
        <p className="text-text-muted">Enlace inválido o expirado.</p>
        <Link to="/forgot-password" className="btn-primary block py-2.5">Solicitar nuevo enlace</Link>
      </div>
    );
  }

  /**
   * Devuelve clases CSS del input segun si tiene o no error.
   * @param {string} field - Nombre del campo
   * @returns {string}
   */
  const fieldCls = (field) =>
    `input ${errors[field] ? '!border-danger/60 focus:!border-danger' : ''}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-2xl text-text">Restablecer contraseña</h2>
        <p className="text-text-muted text-sm mt-1">Introduce tu nueva contraseña.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label className="label">Nueva contraseña</label>
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

        <div>
          <label className="label">Confirmar contraseña</label>
          <input
            type={showPass ? 'text' : 'password'}
            className={fieldCls('confirm')}
            placeholder="••••••••"
            {...register('confirm')}
          />
          <FieldError msg={errors.confirm?.message} />
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
          {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
          Restablecer contraseña
        </button>
      </form>
    </div>
  );
}
