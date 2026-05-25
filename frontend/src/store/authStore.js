import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { updateToken, clearToken } from '../lib/tokenStore';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) => {
        updateToken(accessToken);
        set({ user, accessToken, isAuthenticated: true });
      },

      setToken: (accessToken) => {
        updateToken(accessToken);
        set((state) => ({ ...state, accessToken }));
      },

      updateUser: (partial) =>
        set((state) => ({ user: { ...state.user, ...partial } })),

      logout: () => {
        clearToken();
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Keep tokenStore in sync after Zustand restores state from localStorage
        if (state?.accessToken) updateToken(state.accessToken);
        else clearToken();
      },
    }
  )
);
