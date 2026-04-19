import { create } from 'zustand'

export type AppView = 'dashboard' | 'tasks' | 'kpi' | 'meetings'

interface UiState {
  sidebarOpen: boolean
  selectedView: AppView
  createTaskOpen: boolean
  /** Việc cha khi mở modal từ cây (tùy chọn) */
  createTaskParentId: string | null
  setSidebarOpen: (v: boolean) => void
  toggleSidebar: () => void
  setSelectedView: (v: AppView) => void
  setCreateTaskOpen: (open: boolean, parentId?: string | null) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen:
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  selectedView: 'dashboard',
  createTaskOpen: false,
  createTaskParentId: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSelectedView: (selectedView) => set({ selectedView }),
  setCreateTaskOpen: (open, parentId) =>
    set({
      createTaskOpen: open,
      createTaskParentId: open ? (parentId ?? null) : null,
    }),
}))
