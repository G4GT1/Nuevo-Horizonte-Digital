import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, Leaf } from 'lucide-react';
import { authApi } from '@features/auth/api/auth.api';

/**
 * Pagina de verificacion de email.
 * Lee el token de la URL (/verify/:token), lo envia al backend en el montaje del componente
 * y muestra el resultado: cargando, exito o error.
 * @component
 * @returns {JSX.Element}
 */
export default function VerifyEmailPage() {
  const { token } = useParams();
  /* status puede ser: 'loading' | 'success' | 'error' */
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  /* Se ejecuta una vez al montar. El array de dependencias tiene token para
     re-verificar si el token cambia (aunque en la practica eso no ocurre) */
  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Token no proporcionado'); return; }
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message ?? 'El enlace no es válido o ha expirado');
      });
  }, [token]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-5"
    >
      {/* Logo de la plataforma visible mientras se procesa el token */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Leaf size={16} className="text-primary" />
        </div>
        <span className="font-heading font-bold text-text">Horizonte Verde Digital</span>
      </div>

      {/* Estado: cargando */}
      {status === 'loading' && (
        <>
          <Loader2 size={32} className="text-primary animate-spin mx-auto" />
          <p className="text-text-muted">Verificando tu email...</p>
        </>
      )}

      {/* Estado: exito */}
      {status === 'success' && (
        <>
          <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto">
            <CheckCircle2 size={26} className="text-success" />
          </div>
          <h2 className="font-heading font-bold text-xl text-text">¡Email verificado!</h2>
          <p className="text-text-muted text-sm">Tu cuenta ha sido activada correctamente. Ya puedes iniciar sesión.</p>
          <Link to="/login" className="btn-primary block py-2.5">Iniciar sesión</Link>
        </>
      )}

      {/* Estado: error (token invalido, expirado o no proporcionado) */}
      {status === 'error' && (
        <>
          <div className="w-14 h-14 rounded-full bg-danger/15 border border-danger/30 flex items-center justify-center mx-auto">
            <AlertCircle size={26} className="text-danger" />
          </div>
          <h2 className="font-heading font-bold text-xl text-text">Error de verificación</h2>
          <p className="text-text-muted text-sm">{message || 'El enlace no es válido o ha expirado.'}</p>
          <Link to="/login" className="btn-secondary block py-2.5">Volver al inicio de sesión</Link>
        </>
      )}
    </motion.div>
  );
}
