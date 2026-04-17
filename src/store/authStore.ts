import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  userId: string | null
  user: User | null
  token: string | null
  loading: boolean
  bootstrap: () => Promise<void>
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      user: null,
      token: null,
      loading: true,

      bootstrap: async () => {
        const token = localStorage.getItem('giao-ban-token')
        if (!token) {
          set({ loading: false })
          return
        }
        try {
          const res = await api.get('/auth/me')
          const user = res.data
          set({
            userId: user.id,
            user,
            token,
            loading: false,
          })
        } catch {
          localStorage.removeItem('giao-ban-token')
          set({ loading: false })
        }
      },

      setUser: (user) =>
        set({ userId: user.id, user, loading: false }),

      logout: () => {
        localStorage.removeItem('giao-ban-token')
        set({ userId: null, user: null, token: null, loading: false })
      },
    }),
    {
      name: 'giao-ban-auth',
      partialize: (s) => ({ userId: s.userId }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AuthState>
        return { ...current, userId: p.userId ?? null }
      },
    }
  )
)
