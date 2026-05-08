import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
import { tasksVisibleForUser } from '@/utils/rbac'
import { canCreateTask } from '@/utils/taskHierarchy'
import { CreateTaskModal } from '@/features/tasks/CreateTaskModal'
import { cn } from '@/utils/cn'
import * as meetingService from '@/services/meetingService'

const navBase = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/meetings', label: 'Giao ban', icon: Users },
  { to: '/tasks', label: 'Công việc', icon: ClipboardList, end: true },
  { to: '/tasks/history', label: 'Lịch sử công việc', icon: ClipboardList },
  { to: '/kpi', label: 'KPI', icon: PieChart },
]

type NotifyKind =
  | 'meeting-invite'
  | 'assigned'
  | 'pending-approval'
  | 'due-soon'
  | 'overdue'

type NotificationItem = {
  id: string
  kind: NotifyKind
  title: string
  message: string
  sortTs: number
  taskId?: string
  meetingId?: string
}

const notifyPriority: Record<NotifyKind, number> = {
  'meeting-invite': 5,
  overdue: 4,
  'pending-approval': 3,
  'due-soon': 2,
  assigned: 1,
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'không xác định'
  return date.toLocaleString('vi-VN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
  const [notifyOpen, setNotifyOpen] = useState(false)
  const notifyRef = useRef<HTMLDivElement | null>(null)

  const { data: tasks = [] } = useTasksQuery()
  const meetingsQuery = useQuery({
    queryKey: ['meetings'],
    queryFn: meetingService.getMeetings,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchInterval: 45_000,
    refetchIntervalInBackground: true,
  })
  const meetings = meetingsQuery.data ?? []

  const nav = useMemo(() => {
    if (user?.role === 'r-director') {
      return [
        ...navBase,
        { to: '/admin', label: 'Quản trị', icon: Shield },
      ]
    }
    return navBase
  }, [user?.role])

  const notifications = useMemo(() => {
    if (!user) return [] as NotificationItem[]

    const visibleTasks = tasksVisibleForUser(user, tasks)
    const now = Date.now()
    const dueSoonMs = 48 * 60 * 60 * 1000
    const items: NotificationItem[] = []

    for (const meeting of meetings) {
      if (!Array.isArray(meeting.attendeeIds) || !meeting.attendeeIds.includes(user.id)) continue
      if (meeting.createdById === user.id) continue

      const meetingTs = Date.parse(meeting.startAt)
      const createdTs = Date.parse(meeting.createdAt)
      items.push({
        id: `meeting-invite:${meeting.id}`,
        meetingId: meeting.id,
        kind: 'meeting-invite',
        title: 'Bạn được mời tham gia lịch họp/biên bản',
        message: `${meeting.title || '(không có tiêu đề)'} · ${formatDateTime(meeting.startAt)}`,
        sortTs: Number.isNaN(meetingTs) ? (Number.isNaN(createdTs) ? now : createdTs) : meetingTs,
      })
    }

    for (const task of visibleTasks) {
      const deadlineTs = Date.parse(task.deadline)
      const canReadDeadline = !Number.isNaN(deadlineTs)
      const taskTitle = task.title || '(không có tiêu đề)'

      if (
        task.status === 'PENDING_APPROVAL' &&
        task.pendingApprovalReviewerId === user.id
      ) {
        items.push({
          id: `pending-approval:${task.id}`,
          taskId: task.id,
          kind: 'pending-approval',
          title: 'Có báo cáo chờ bạn duyệt',
          message: taskTitle,
          sortTs: Date.parse(task.updatedAt) || now,
        })
      }

      if (task.assigneeId === user.id && task.status === 'NEW') {
        items.push({
          id: `assigned:${task.id}`,
          taskId: task.id,
          kind: 'assigned',
          title: 'Bạn vừa được giao việc',
          message: taskTitle,
          sortTs: Date.parse(task.updatedAt) || now,
        })
      }

      if (
        task.assigneeId === user.id &&
        task.status !== 'COMPLETED' &&
        canReadDeadline
      ) {
        const remain = deadlineTs - now
        if (remain < 0) {
          items.push({
            id: `overdue:${task.id}`,
            taskId: task.id,
            kind: 'overdue',
            title: 'Việc của bạn đã quá hạn',
            message: `${taskTitle} · hạn ${formatDateTime(task.deadline)}`,
            sortTs: deadlineTs,
          })
        } else if (remain <= dueSoonMs) {
          items.push({
            id: `due-soon:${task.id}`,
            taskId: task.id,
            kind: 'due-soon',
            title: 'Việc của bạn sắp tới hạn',
            message: `${taskTitle} · hạn ${formatDateTime(task.deadline)}`,
            sortTs: deadlineTs,
          })
        }
      }
    }

    return items.sort((a, b) => {
      const p = notifyPriority[b.kind] - notifyPriority[a.kind]
      if (p !== 0) return p
      return b.sortTs - a.sortTs
    })
  }, [tasks, meetings, user])

  const badge = notifications.length

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

  useEffect(() => {
    if (!notifyOpen) return

    const onDocClick = (event: MouseEvent) => {
      if (!notifyRef.current) return
      const target = event.target as Node
      if (!notifyRef.current.contains(target)) {
        setNotifyOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [notifyOpen])

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  const openNotification = (item: NotificationItem) => {
    setNotifyOpen(false)
    if (item.taskId) {
      navigate(`/tasks?task=${encodeURIComponent(item.taskId)}`)
      return
    }
    if (item.meetingId) {
      navigate(`/meetings/${encodeURIComponent(item.meetingId)}`)
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
              <p className="truncate text-sm font-semibold">Quản lý Lab</p>
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
            <div className="relative" ref={notifyRef}>
              <button
                type="button"
                onClick={() => setNotifyOpen((v) => !v)}
                className="relative inline-flex rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                aria-label="Thông báo"
              >
                <Bell className="size-5" />
                {badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>

              {notifyOpen && (
                <div className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">Thông báo cá nhân</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Nhấn vào từng thông báo để mở đúng màn hình liên quan
                    </p>
                  </div>

                  <div className="max-h-96 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <p className="rounded-xl px-3 py-4 text-center text-sm text-slate-500">
                        Chưa có thông báo mới.
                      </p>
                    ) : (
                      notifications.map((item) => {
                        const tone =
                          item.kind === 'overdue'
                            ? 'border-red-200 bg-red-50/80 text-red-900'
                            : item.kind === 'pending-approval'
                              ? 'border-amber-200 bg-amber-50/80 text-amber-900'
                              : item.kind === 'due-soon'
                                ? 'border-orange-200 bg-orange-50/70 text-orange-900'
                                : item.kind === 'meeting-invite'
                                  ? 'border-blue-200 bg-blue-50/80 text-blue-900'
                                  : 'border-slate-200 bg-slate-50 text-slate-800'

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openNotification(item)}
                            className={cn(
                              'mb-2 w-full rounded-xl border px-3 py-2 text-left transition hover:opacity-90',
                              tone,
                            )}
                          >
                            <p className="text-sm font-semibold">{item.title}</p>
                            <p className="mt-1 text-sm opacity-90">{item.message}</p>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
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
