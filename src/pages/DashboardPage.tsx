import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useTasksQuery } from '@/hooks/useTasksQuery'
import { tasksVisibleForUser } from '@/utils/rbac'
import { KPIOverview } from '@/features/dashboard/KPIOverview'
import { HotspotList } from '@/features/dashboard/HotspotList'
import { GanttChart } from '@/features/dashboard/GanttChart'
import { DepartmentBarChart } from '@/features/dashboard/DepartmentBarChart'
import { DepartmentKPI } from '@/features/kpi/DepartmentKPI'
import { ApprovalInbox } from '@/features/tasks/ApprovalInbox'
import { KanbanBoard } from '@/features/tasks/Kanban/Board'
import { MyTasks } from '@/features/tasks/staff/MyTasks'
import { TaskDetailDrawer } from '@/features/tasks/staff/TaskDetailDrawer'
import type { Task } from '@/types'
import { useUsersQuery } from '@/hooks/useUsersQuery'
import { useDepartmentsQuery } from '@/hooks/useDepartmentsQuery'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: tasks = [] } = useTasksQuery()
  const usersQuery = useUsersQuery()
  const departmentsQuery = useDepartmentsQuery()
  const users = usersQuery.data ?? []
  const departments = departmentsQuery.data ?? []
  const [detail, setDetail] = useState<Task | null>(null)
  const uMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])

  const visible = useMemo(
    () => (user ? tasksVisibleForUser(user, tasks) : []),
    [tasks, user],
  )

  if (!user) return null

  if (usersQuery.isLoading || departmentsQuery.isLoading) {
    return <p className="text-sm text-slate-500">Đang tải dashboard…</p>
  }

  if (usersQuery.isError || departmentsQuery.isError) {
    return <p className="text-sm text-red-600">Không tải được dữ liệu dashboard.</p>
  }

  if (user.role === 'r-director') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Dashboard Giám đốc
            </h1>
            <p className="text-sm text-slate-600">
              Tổng quan KPI, điểm nóng, drill-down PGĐ / khoa
            </p>
          </div>
          <Link
            to="/tasks"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Mở cây việc đầy đủ
          </Link>
        </div>
        <KPIOverview tasks={tasks} />
        <div className="grid gap-6 xl:grid-cols-2">
          <HotspotList tasks={tasks} onOpen={setDetail} />
          <DepartmentBarChart
            departments={departments}
            tasks={tasks}
          />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <GanttChart tasks={tasks} />
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              Pie KPI theo trạng thái (hệ thống)
            </h3>
            <div className="mt-4">
              <DepartmentKPI
                department={{
                  id: 'all',
                  name: 'Toàn viện',
                  code: 'BV',
                }}
                tasks={tasks}
              />
            </div>
          </div>
        </div>
        <TaskDetailDrawer
          open={!!detail}
          task={detail}
          tasks={tasks}
          usersById={uMap}
          onClose={() => setDetail(null)}
        />
      </div>
    )
  }

  if (user.role === 'r-vice-director') {
    const depts = departments.filter((d) =>
      user.managedDepartmentIds?.includes(d.id),
    )
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Workspace Phó Giám đốc
        </h1>
        <KPIOverview tasks={visible} />
        <ApprovalInbox tasks={visible} usersById={uMap} />
        <div className="grid gap-6 lg:grid-cols-2">
          {depts.map((d) => (
            <DepartmentKPI
              key={d.id}
              department={d}
              tasks={visible.filter((t) => t.departmentId === d.id)}
            />
          ))}
        </div>
        <Link
          to="/tasks"
          className="inline-flex rounded-xl bg-medical-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-medical-700"
        >
          Cây việc & hộp duyệt đầy đủ
        </Link>
      </div>
    )
  }

  if (user.role === 'r-dept-head') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Điều hành khoa
        </h1>
        <KPIOverview tasks={visible} />
        {user.departmentId && (
          <DepartmentKPI
            department={
              departments.find((x) => x.id === user.departmentId)!
            }
            tasks={visible}
          />
        )}
        <KanbanBoard
          tasks={visible}
          usersById={uMap}
          onOpenTask={setDetail}
        />
        <TaskDetailDrawer
          open={!!detail}
          task={detail}
          tasks={tasks}
          usersById={uMap}
          onClose={() => setDetail(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900 px-1">Việc hằng ngày</h1>
      <MyTasks tasks={visible} usersById={uMap} allTasks={tasks} />
    </div>
  )
}
