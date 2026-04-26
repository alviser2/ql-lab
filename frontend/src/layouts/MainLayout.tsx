import { useEffect, useMemo } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Users,
  Shield,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { useTasksQuery } from '@/hooks/useTasksQuery'
import { useFakeRealtime } from '@/hooks/useFakeRealtime'
import { tasksVisibleForUser } from '@/utils/rbac'
import { canCreateTask } from '@/utils/taskHierarchy'
import { CreateTaskModal } from '@/features/tasks/CreateTaskModal'
import { cn } from '@/utils/cn'

const navBase = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/meetings', label: 'Giao ban', icon: Users },
  { to: '/tasks', label: 'Công việc', icon: ClipboardList, end: true },
  { to: '/tasks/history', label: 'Lịch sử công việc', icon: ClipboardList },
  { to: '/kpi', label: 'KPI', icon: PieChart },
]

export function MainLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const createOpen = useUiStore((s) => s.createTaskOpen)
  const createTaskParentId = useUiStore((s) => s.createTaskParentId)
  const setCreateOpen = useUiStore((s) => s.setCreateTaskOpen)

  const { data: tasks = [] } = useTasksQuery()
  useFakeRealtime(!!user)

  const nav = useMemo(() => {
    if (user?.role === 'r-director') {
      return [
        ...navBase,
        { to: '/admin', label: 'Quản trị', icon: Shield },
      ]
    }
    return navBase
  }, [user?.role])

  const badge = useMemo(() => {
    if (!user) return 0
    const v = tasksVisibleForUser(user, tasks)
    return v.filter(
      (t) =>
        t.status === 'PENDING_APPROVAL' &&
        t.pendingApprovalReviewerId === user.id,
    ).length
  }, [tasks, user])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(min-width: 1024px)')
    const syncSidebarByViewport = () => setSidebarOpen(media.matches)

    syncSidebarByViewport()

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', syncSidebarByViewport)
      return () => media.removeEventListener('change', syncSidebarByViewport)
    }

    media.addListener(syncSidebarByViewport)
    return () => media.removeListener(syncSidebarByViewport)
  }, [setSidebarOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [location.pathname, setSidebarOpen])

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className="flex min-h-screen text-slate-900">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r border-white/40 bg-white/90 shadow-lg backdrop-blur-md transition-transform lg:static lg:translate-x-0',
          !sidebarOpen && '-translate-x-full lg:translate-x-0 lg:w-20',
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-medical-600 font-bold text-white shadow">
            GB
          </span>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Giao ban BV</p>
              <p className="truncate text-xs text-slate-500">Công việc & KPI</p>
            </div>
          )}
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng menu"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-medical-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100',
                )
              }
              onClick={closeSidebarOnMobile}
            >
              <item.icon className="size-5 shrink-0" />
              {sidebarOpen && item.label}
            </NavLink>
          ))}
        </nav>
        {user && sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-slate-100 p-3">
            <p className="truncate text-xs font-semibold text-slate-800">
              {user.name}
            </p>
            <p className="text-[10px] uppercase text-slate-500">{user.role}</p>
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="size-4" />
              Đăng xuất
            </button>
          </div>
        )}
      </aside>

      <button
        type="button"
        aria-label="Đóng menu"
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'fixed inset-0 z-30 bg-slate-900/30 transition-opacity lg:hidden',
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/50 bg-white/80 px-4 backdrop-blur">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={toggleSidebar}
            aria-label="Menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span className="relative inline-flex rounded-xl bg-slate-100 p-2 text-slate-600">
              <Bell className="size-5" />
              {badge > 0 && (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </span>
            {canCreateTask(user ?? null) && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="rounded-xl bg-medical-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-medical-700"
              >
                <span className="hidden sm:inline">+ Tạo việc</span>
                <span className="sm:hidden">+ Việc</span>
              </button>
            )}
          </div>
        </header>
        <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <CreateTaskModal
        open={createOpen}
        defaultParentId={createTaskParentId ?? undefined}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}
