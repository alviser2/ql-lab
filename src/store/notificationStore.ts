import { create } from 'zustand'

interface NotificationState {
  inboxCount: number
  bump: () => void
  setCount: (n: number) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  inboxCount: 2,
  bump: () => set((s) => ({ inboxCount: s.inboxCount + 1 })),
  setCount: (inboxCount) => set({ inboxCount }),
}))
