import { useMemo, useState } from 'react'
import { useTasksQuery } from '@/hooks/useTasksQuery'
import { useUsersQuery } from '@/hooks/useUsersQuery'
import { HistoryTaskTree } from '@/features/tasks/TaskTree/HistoryTaskTree'
import { HistoryTaskDetailDrawer } from '@/features/tasks/history/HistoryTaskDetailDrawer'
import { HistoryPurgePanel } from '@/features/tasks/history/HistoryPurgePanel'
import { useAuthStore } from '@/store/authStore'
import { tasksVisibleForUser } from '@/utils/rbac'
import type { Task } from '@/types'

export function TaskHistoryPage() {
  const user = useAuthStore((s) => s.user)
  const tasksQuery = useTasksQuery({ onlyArchived: true })
  const usersQuery = useUsersQuery()
  const tasks = tasksQuery.data ?? []
  const users = usersQuery.data ?? []
  const [detail, setDetail] = useState<Task | null>(null)

  const visibleHistory = useMemo(() => {
    if (!user) return []
    return tasksVisibleForUser(user, tasks, { includeArchived: true })
  }, [tasks, user])

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])

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

      <HistoryPurgePanel enabled={user?.role === 'r-director'} />

      <HistoryTaskTree
        tasks={visibleHistory}
        onSelectTask={(task) => setDetail(task)}
        canDelete={user?.role === 'r-director'}
      />

      <HistoryTaskDetailDrawer
        open={!!detail}
        task={detail}
        usersById={usersById}
        onClose={() => setDetail(null)}
      />
    </div>
  )
}
