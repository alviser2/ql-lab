import { useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useTasksQuery } from '@/hooks/useTasksQuery'
import { loadDb } from '@/services/mockDb'
import { tasksVisibleForUser } from '@/utils/rbac'
import { DepartmentKPI } from '@/features/kpi/DepartmentKPI'
import { DepartmentBarChart } from '@/features/dashboard/DepartmentBarChart'
import { KPIOverview } from '@/features/dashboard/KPIOverview'

export function KPIPage() {
  const user = useAuthStore((s) => s.user)
  const { data: tasks = [] } = useTasksQuery()

  const visible = useMemo(
    () => (user ? tasksVisibleForUser(user, tasks) : []),
    [tasks, user],
  )

  if (!user) return null

  const db = loadDb()

  if (user.role === 'staff') {
    const done = visible.filter((t) => t.status === 'COMPLETED').length
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">KPI cá nhân</h1>
        <p className="text-sm text-slate-600">
          Việc được giao:{' '}
          <span className="font-semibold text-slate-900">
            {visible.length}
          </span>
        </p>
        <p className="text-sm text-slate-600">
          Đã hoàn thành:{' '}
          <span className="font-semibold text-teal-800">{done}</span>
        </p>
      </div>
    )
  }

  if (user.role === 'department_head' && user.departmentId) {
    const dept = db.departments.find((d) => d.id === user.departmentId)!
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">KPI khoa</h1>
        <KPIOverview tasks={visible} />
        <DepartmentKPI department={dept} tasks={visible} />
      </div>
    )
  }

  if (user.role === 'vice_director') {
    const depts = db.departments.filter((d) =>
      user.managedDepartmentIds?.includes(d.id),
    )
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">KPI khoa phụ trách</h1>
        <KPIOverview tasks={visible} />
        <div className="grid gap-6 lg:grid-cols-2">
          {depts.map((d) => (
            <DepartmentKPI
              key={d.id}
              department={d}
              tasks={visible.filter((t) => t.departmentId === d.id)}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">KPI toàn hệ thống</h1>
      <KPIOverview tasks={tasks} />
      <DepartmentBarChart departments={db.departments} tasks={tasks} />
      <div className="grid gap-6 lg:grid-cols-3">
        {db.departments.map((d) => (
          <DepartmentKPI
            key={d.id}
            department={d}
            tasks={tasks.filter((t) => t.departmentId === d.id)}
          />
        ))}
      </div>
    </div>
  )
}
