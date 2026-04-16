import { useMemo } from 'react'
import { useTasksQuery } from '@/hooks/useTasksQuery'
import { useUsersQuery } from '@/hooks/useUsersQuery'
import { HistoryTaskTree } from '@/features/tasks/TaskTree/HistoryTaskTree'
import { useAuthStore } from '@/store/authStore'
import { tasksVisibleForUser } from '@/utils/rbac'

export function TaskHistoryPage() {
  const user = useAuthStore((s) => s.user)
  const tasksQuery = useTasksQuery({ onlyArchived: true })
  const usersQuery = useUsersQuery()
  const tasks = tasksQuery.data ?? []

  const visibleHistory = useMemo(() => {
    if (!user) return []
    return tasksVisibleForUser(user, tasks, { includeArchived: true })
  }, [tasks, user])

  if (tasksQuery.isLoading || usersQuery.isLoading) {
    return <p className="text-sm text-slate-500">Đang tải lịch sử công việc…</p>
  }

  if (tasksQuery.isError || usersQuery.isError) {
    return <p className="text-sm text-red-600">Không tải được lịch sử công việc.</p>
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Lịch sử công việc</h1>
        <p className="text-sm text-slate-600">
          Cây việc đã được Giám đốc chốt cuối cùng. Dữ liệu vẫn giữ để tính KPI.
        </p>
      </header>

      <HistoryTaskTree tasks={visibleHistory} />
    </div>
  )
}
