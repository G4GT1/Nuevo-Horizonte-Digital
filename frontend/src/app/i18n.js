import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from '@/i18n/es';
import en from '@/i18n/en';

/* Lee el idioma guardado en el store de auth antes de inicializar i18n. */
const savedLang = (() => {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const { state } = JSON.parse(raw);
      return state?.user?.preferences?.language ?? 'es';
    }
  } catch {}
  return 'es';
})();

i18n.use(initReactI18next).init({
  resources: { es, en },
  lng: savedLang,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export default i18n;
