import { useMemo } from 'react'
import { useTasksQuery } from '@/hooks/useTasksQuery'
import { useUsersQuery } from '@/hooks/useUsersQuery'
import { TaskCard } from '@/components/TaskCard'

export function TaskHistoryPage() {
  const tasksQuery = useTasksQuery({ onlyArchived: true })
  const usersQuery = useUsersQuery()
  const tasks = tasksQuery.data ?? []
  const users = usersQuery.data ?? []

  const usersById = useMemo(() => {
    return new Map(users.map((u) => [u.id, u]))
  }, [users])

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
          Các cây việc đã được Giám đốc chốt cuối cùng. Dữ liệu vẫn giữ để tính KPI.
        </p>
      </header>

      {tasks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-600">
          Chưa có công việc nào được chuyển vào lịch sử.
        </p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((t) => (
            <li key={t.id}>
              <TaskCard
                task={t}
                assignee={t.assigneeId ? usersById.get(t.assigneeId) ?? null : null}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
