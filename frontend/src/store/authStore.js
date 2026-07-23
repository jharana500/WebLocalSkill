import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: true,
      authError: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),

      login: (user, token) => set({ user, token, isAuthenticated: true, authError: null }),

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        localStorage.removeItem('auth-storage')
      },

      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),

      setLoading: (isLoading) => set({ isLoading }),
      clearAuthError: () => set({ authError: null }),

      // Validates the persisted token against the backend once on app boot.
      // Must run to completion (and flip isInitializing false) before any
      // protected/guest route makes a redirect decision, so a stale or
      // expired token doesn't briefly render as a valid session.
      initializeAuth: async () => {
        const { token } = get()
        if (!token) {
          set({ isInitializing: false })
          return
        }
        try {
          const { authService } = await import('@/services/authService')
          const data = await authService.getMe()
          set({ user: data.user, isAuthenticated: true, isInitializing: false })
        } catch {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isInitializing: false,
          })
          localStorage.removeItem('auth-storage')
        }
      },

      refreshCurrentUser: async () => {
        const { authService } = await import('@/services/authService')
        const data = await authService.getMe()
        set({ user: data.user })
        return data.user
      },

      getRole: () => get().user?.role,
      isJobSeeker: () => get().user?.role === 'job_seeker',
      isCompany: () => get().user?.role === 'company',
      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)

export default useAuthStore
