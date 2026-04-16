import { useMemo } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { useTasksQuery } from '@/hooks/useTasksQuery'
import { useFakeRealtime } from '@/hooks/useFakeRealtime'
import { tasksVisibleForUser } from '@/utils/rbac'
import { canCreateTask } from '@/utils/taskHierarchy'
import { CreateTaskModal } from '@/features/tasks/CreateTaskModal'
import { cn } from '@/utils/cn'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList, end: true },
  { to: '/tasks/history', label: 'Lịch sử công việc', icon: ClipboardList },
  { to: '/kpi', label: 'KPI', icon: PieChart },
  { to: '/meetings', label: 'Meetings', icon: Users },
]

export function MainLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const createOpen = useUiStore((s) => s.createTaskOpen)
  const createTaskParentId = useUiStore((s) => s.createTaskParentId)
  const setCreateOpen = useUiStore((s) => s.setCreateTaskOpen)

  const { data: tasks = [] } = useTasksQuery()
  useFakeRealtime(!!user)

  const badge = useMemo(() => {
    if (!user) return 0
    const v = tasksVisibleForUser(user, tasks)
    return v.filter(
      (t) =>
        t.status === 'PENDING_APPROVAL' &&
        t.pendingApprovalReviewerId === user.id,
    ).length
  }, [tasks, user])

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
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Giao ban BV</p>
              <p className="truncate text-xs text-slate-500">Task & KPI</p>
            </div>
          )}
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

      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/50 bg-white/80 px-4 backdrop-blur">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={toggleSidebar}
            aria-label="Menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex flex-1 items-center justify-end gap-2">
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
                + Tạo việc
              </button>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">
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
