import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { loadDb } from '@/services/mockDb'

interface AuthState {
  userId: string | null
  user: User | null
  setUserById: (id: string | null) => void
  logout: () => void
}

function resolveUser(id: string | null): User | null {
  if (!id) return null
  const db = loadDb()
  return db.users.find((u) => u.id === id) ?? null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      user: null,
      setUserById: (id) =>
        set({
          userId: id,
          user: resolveUser(id),
        }),
      logout: () => set({ userId: null, user: null }),
    }),
    {
      name: 'giao-ban-auth',
      partialize: (s) => ({ userId: s.userId }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AuthState>
        const id = p.userId ?? null
        return {
          ...current,
          userId: id,
          user: resolveUser(id),
        }
      },
    },
  ),
)
