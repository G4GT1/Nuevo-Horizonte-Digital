import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUiStore = create(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      chatbotOpen: false,
      unreadNotifications: 0,
      theme: 'light',
      pageSubtitle: null,

      setPageSubtitle: (s) => set({ pageSubtitle: s }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      toggleChatbot: () =>
        set((state) => ({ chatbotOpen: !state.chatbotOpen })),

      setChatbotOpen: (v) => set({ chatbotOpen: v }),

      setUnreadNotifications: (n) => set({ unreadNotifications: n }),

      incrementUnread: () =>
        set((state) => ({ unreadNotifications: state.unreadNotifications + 1 })),

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      setTheme: (theme) => set({ theme }),

      toast: null,
      showToast: (message, type = 'info') => {
        set({ toast: { message, type, id: Date.now() } });
      },
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);
