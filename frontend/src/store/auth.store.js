import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,        // Memory only — not persisted
      refreshToken: null,
      isLoading: false,

      setUser: (user) => set({ user }),
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      setLoading: (isLoading) => set({ isLoading }),

      login: (user, token, refreshToken) => set({ user, token, refreshToken }),

      logout: () => {
        set({ user: null, token: null, refreshToken: null });
      },

      updateUser: (data) => set((state) => ({ user: { ...state.user, ...data } })),

      isAuthenticated: () => !!get().token && !!get().user,
    }),
    {
      name: 'mkv-session',
      storage: {
        getItem: (key) => {
          const item = sessionStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        },
        setItem: (key, value) => sessionStorage.setItem(key, JSON.stringify(value)),
        removeItem: (key) => sessionStorage.removeItem(key),
      },
      // Only persist refreshToken and user; token is rebuilt on refresh
      partialize: (state) => ({ refreshToken: state.refreshToken, user: state.user }),
    }
  )
);

export default useAuthStore;
