import { useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useTasksQuery } from '@/hooks/useTasksQuery'
import { tasksVisibleForUser } from '@/utils/rbac'
import { DepartmentKPI } from '@/features/kpi/DepartmentKPI'
import { DepartmentBarChart } from '@/features/dashboard/DepartmentBarChart'
import { KPIOverview } from '@/features/dashboard/KPIOverview'
import { useDepartmentsQuery } from '@/hooks/useDepartmentsQuery'

export function KPIPage() {
  const user = useAuthStore((s) => s.user)
  const { data: tasks = [] } = useTasksQuery({ includeArchived: true })
  const departmentsQuery = useDepartmentsQuery()
  const departments = departmentsQuery.data ?? []

  const visible = useMemo(
    () =>
      user
        ? tasksVisibleForUser(user, tasks, { includeArchived: true })
        : [],
    [tasks, user],
  )

  if (!user) return null

  if (departmentsQuery.isLoading) {
    return <p className="text-sm text-slate-500">Đang tải dữ liệu KPI…</p>
  }

  if (departmentsQuery.isError) {
    return <p className="text-sm text-red-600">Không tải được dữ liệu dự án.</p>
  }

  if (user.role === 'r-staff') {
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

  if (user.role === 'r-dept-head' && user.departmentId) {
    const dept = departments.find((d) => d.id === user.departmentId)
    if (!dept) {
      return <p className="text-sm text-red-600">Không tìm thấy dự án của tài khoản hiện tại.</p>
    }
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">KPI dự án</h1>
        <KPIOverview tasks={visible} />
        <DepartmentKPI department={dept} tasks={visible} />
      </div>
    )
  }

  if (user.role === 'r-vice-director') {
    const depts = departments.filter((d) =>
      user.managedDepartmentIds?.includes(d.id),
    )
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">KPI dự án phụ trách</h1>
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
      <DepartmentBarChart departments={departments} tasks={tasks} />
      <div className="grid gap-6 lg:grid-cols-3">
        {departments.map((d) => (
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
