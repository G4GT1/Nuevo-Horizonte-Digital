import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store global de estado de UI (Zustand + persist).
 * Gestiona sidebar, chatbot, notificaciones no leidas, tema y toasts.
 * Solo persiste sidebarCollapsed y theme entre sesiones de navegador.
 */
export const useUiStore = create(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      chatbotOpen: false,
      unreadNotifications: 0,
      theme: 'light',
      pageSubtitle: null,

      /**
       * Establece el subtitulo de la pagina actual.
       * Usado por StationDetailPage para mostrar el nombre de la estacion en el header.
       * @param {string|null} s
       */
      setPageSubtitle: (s) => set({ pageSubtitle: s }),

      /** Alterna el estado expandido/colapsado del sidebar. */
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      /**
       * @param {boolean} v - true para colapsar, false para expandir.
       */
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      /** Alterna la visibilidad del widget chatbot. */
      toggleChatbot: () =>
        set((state) => ({ chatbotOpen: !state.chatbotOpen })),

      /**
       * @param {boolean} v - true para abrir, false para cerrar.
       */
      setChatbotOpen: (v) => set({ chatbotOpen: v }),

      /**
       * Reemplaza el contador de notificaciones no leidas.
       * @param {number} n
       */
      setUnreadNotifications: (n) => set({ unreadNotifications: n }),

      /** Incrementa en 1 el contador (llamado desde useSocket al llegar evento). */
      incrementUnread: () =>
        set((state) => ({ unreadNotifications: state.unreadNotifications + 1 })),

      /** Alterna entre tema oscuro y claro. */
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      /**
       * @param {'dark'|'light'} theme
       */
      setTheme: (theme) => set({ theme }),

      toast: null,

      /**
       * Muestra un toast global. El id basado en Date.now() permite
       * re-mostrar el mismo mensaje consecutivo sin que AnimatePresence lo ignore.
       * @param {string} message
       * @param {'info'|'success'|'error'|'warn'} [type='info']
       */
      showToast: (message, type = 'info') => {
        set({ toast: { message, type, id: Date.now() } });
      },

      /** Oculta el toast activo. */
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'ui-storage',
      /* Solo persiste preferencias visuales que deben sobrevivir recarga */
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);
