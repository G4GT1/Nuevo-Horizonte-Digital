/**
 * Instancia de Axios preconfigurada con interceptores de autenticacion.
 * Inyecta el Bearer token en cada peticion saliente y gestiona la renovacion
 * automatica del access token cuando el servidor responde 401.
 */

import axios from 'axios';
import { getToken } from '@shared/lib/tokenStore';
import { useAuthStore } from '@shared/store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/* Adjunta el Bearer token a cada peticion saliente */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Flag que indica si ya hay una renovacion de token en curso. */
let isRefreshing = false;

/**
 * Cola de peticiones que llegaron con 401 mientras se renovaba el token.
 * Se resuelven o rechazan en bloque al terminar la renovacion.
 * @type {Array<{resolve: Function, reject: Function}>}
 */
let failedQueue = [];

/**
 * Resuelve o rechaza todas las peticiones encoladas.
 * @param {Error|null} error - Error si la renovacion fallo; null si tuvo exito.
 * @param {string|null} [token=null] - Nuevo token si la renovacion tuvo exito.
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh-token') &&
      !original.url?.includes('/auth/login')
    ) {
      /* Si ya hay renovacion en curso, encola esta peticion hasta que termine */
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh-token');
        const newToken = data.data.accessToken;

        useAuthStore.getState().setToken(newToken);

        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        /* Sesion caducada sin posibilidad de renovar: fuerza logout */
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
