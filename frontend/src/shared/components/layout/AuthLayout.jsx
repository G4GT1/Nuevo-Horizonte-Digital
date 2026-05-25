import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Meteors from '@shared/components/ui/Meteors';

/** SVG inline de la bandera de Espana para el selector de idioma. */
function SpainFlag() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" className="rounded-sm">
      <rect width="20" height="14" fill="#c60b1e" />
      <rect y="3.5" width="20" height="7" fill="#ffc400" />
    </svg>
  );
}

/** SVG inline de la bandera del Reino Unido para el selector de idioma. */
function UKFlag() {
  return (
    <svg width="20" height="14" viewBox="0 0 60 40" className="rounded-sm">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="white" strokeWidth="10" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="5" />
      <path d="M30,0 V40 M0,20 H60" stroke="white" strokeWidth="13" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="8" />
    </svg>
  );
}

/**
 * Botonera de cambio de idioma superpuesta en la esquina de las paginas de auth.
 * @component
 * @returns {JSX.Element}
 */
function AuthControls() {
  const { i18n } = useTranslation();

  const switchLang = (next) => {
    if (i18n.language !== next) i18n.changeLanguage(next);
  };

  return (
    <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
      <button
        onClick={() => switchLang('es')}
        title="Español"
        className={`p-1 rounded-md transition-all duration-150 ${
          i18n.language === 'es'
            ? 'ring-1 ring-primary ring-offset-1 ring-offset-bg'
            : 'opacity-50 hover:opacity-100'
        }`}
      >
        <SpainFlag />
      </button>
      <button
        onClick={() => switchLang('en')}
        title="English"
        className={`p-1 rounded-md transition-all duration-150 ${
          i18n.language === 'en'
            ? 'ring-1 ring-primary ring-offset-1 ring-offset-bg'
            : 'opacity-50 hover:opacity-100'
        }`}
      >
        <UKFlag />
      </button>
    </div>
  );
}

/**
 * Layout de las paginas de autenticacion (login, registro, recuperacion...).
 * Panel izquierdo con branding (solo lg+) y panel derecho con el formulario.
 * Fuerza el tema oscuro en las paginas auth; AppLayout restaura la preferencia del usuario.
 * @component
 * @returns {JSX.Element}
 */
export default function AuthLayout() {
  const { t } = useTranslation();

  /* Auth pages always dark — AppLayout restores user's preference on app entry */
  useEffect(() => {
    document.documentElement.classList.remove('light');
  }, []);

  return (
    <div className="min-h-screen bg-bg flex overflow-hidden">
      {/* Left panel - branding */}
      <div className="hidden lg:flex w-[45%] relative flex-col items-center justify-center bg-bg border-r border-border overflow-hidden">
        {/* Meteors background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Meteors number={30} />
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="relative z-10 flex flex-col items-center justify-center gap-6 px-10 text-center"
        >
          <h1 className="font-heading font-bold text-5xl bg-gradient-to-b from-black to-gray-300/80 dark:from-white dark:to-slate-400/80 bg-clip-text text-transparent leading-tight">
            Horizonte Verde Digital
          </h1>

          <img
            src="/jardinero.gif"
            alt="Jardinero"
            className="w-[120px] h-[120px] object-contain"
          />

          <p className="text-text-subtle text-sm">
            {t('auth.leftSubtitle')}
          </p>
        </motion.div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <AuthControls />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Leaf size={15} className="text-primary" />
            </div>
            <span className="font-heading font-bold text-text">Horizonte Verde Digital</span>
          </div>

          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
