import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { updateToken, clearToken } from '@shared/lib/tokenStore';

/**
 * Store global de autenticacion (Zustand + persist).
 * Mantiene el usuario, el access token y el flag de sesion activa.
 * Al hidratarse desde localStorage sincroniza el tokenStore en memoria
 * para que axios tenga el token disponible desde el primer render.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      /**
       * Establece la sesion activa tras login o aceptacion de invitacion.
       * @param {Object} user - Datos del usuario autenticado.
       * @param {string} accessToken - JWT de acceso.
       */
      setAuth: (user, accessToken) => {
        updateToken(accessToken);
        set({ user, accessToken, isAuthenticated: true });
      },

      /**
       * Actualiza solo el access token (tras renovacion silenciosa).
       * @param {string} accessToken - Nuevo JWT.
       */
      setToken: (accessToken) => {
        updateToken(accessToken);
        set((state) => ({ ...state, accessToken }));
      },

      /**
       * Aplica un parche parcial al objeto usuario sin reemplazarlo entero.
       * @param {Partial<Object>} partial - Campos a actualizar.
       */
      updateUser: (partial) =>
        set((state) => ({ user: { ...state.user, ...partial } })),

      /** Cierra la sesion: limpia el token en memoria y resetea el estado. */
      logout: () => {
        clearToken();
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      /* Solo persiste los campos necesarios para restaurar la sesion */
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      /* Sincroniza tokenStore al rehidratarse desde localStorage */
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) updateToken(state.accessToken);
        else clearToken();
      },
    }
  )
);
