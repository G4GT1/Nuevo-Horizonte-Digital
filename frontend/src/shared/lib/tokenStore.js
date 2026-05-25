/**
 * Almacen de token de acceso en memoria.
 * Se inicializa leyendo localStorage para tener el token disponible
 * antes de que Zustand termine de hidratarse (evita peticiones sin auth
 * en el primer render).
 */

let _token = null;

/* Lectura inicial sincrona: permite que axios.interceptors tenga el token
   disponible incluso antes de que useAuthStore se hidrate desde localStorage. */
try {
  const raw = localStorage.getItem('auth-storage');
  if (raw) {
    const parsed = JSON.parse(raw);
    _token = parsed?.state?.accessToken ?? null;
  }
} catch {
  _token = null;
}

/**
 * Devuelve el token de acceso actual guardado en memoria.
 * @returns {string|null} Token JWT o null si no hay sesion activa.
 */
export const getToken = () => _token;

/**
 * Actualiza el token en memoria (llamado tras login o renovacion).
 * @param {string|null} token - Nuevo JWT. Pasa null para borrarlo.
 */
export const updateToken = (token) => { _token = token ?? null; };

/** Elimina el token de memoria (cierre de sesion). */
export const clearToken = () => { _token = null; };
