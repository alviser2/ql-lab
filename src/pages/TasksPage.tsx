import { useMemo, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useTasksQuery } from '@/hooks/useTasksQuery'
import { tasksVisibleForUser } from '@/utils/rbac'
import { TaskTreeView } from '@/features/tasks/TaskTree/TaskTreeView'
import { ApprovalInbox } from '@/features/tasks/ApprovalInbox'
import { KanbanBoard } from '@/features/tasks/Kanban/Board'
import { MyTasks } from '@/features/tasks/staff/MyTasks'
import { TaskDetailDrawer } from '@/features/tasks/staff/TaskDetailDrawer'
import type { Task } from '@/types'
import { useUsersQuery } from '@/hooks/useUsersQuery'

export function TasksPage() {
  const user = useAuthStore((s) => s.user)
  const { data: tasks = [] } = useTasksQuery()
  const usersQuery = useUsersQuery()
  const users = usersQuery.data ?? []
  const [detail, setDetail] = useState<Task | null>(null)

  const uMap = useMemo(() => {
    return new Map(users.map((u) => [u.id, u]))
  }, [users])

  const visible = useMemo(
    () => (user ? tasksVisibleForUser(user, tasks) : []),
    [tasks, user],
  )

  if (!user) return null

  if (usersQuery.isLoading) {
    return <p className="text-sm text-slate-500">Đang tải dữ liệu người dùng…</p>
  }

  if (usersQuery.isError) {
    return <p className="text-sm text-red-600">Không tải được danh sách người dùng.</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Công việc</h1>

      {user.role !== 'r-staff' && (
        <ApprovalInbox tasks={visible} usersById={uMap} />
      )}

      {user.role === 'r-staff' && (
        <MyTasks tasks={visible} usersById={uMap} allTasks={tasks} />
      )}

      {user.role === 'r-dept-head' && (
        <>
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
        </>
      )}

      {(user.role === 'r-director' || user.role === 'r-vice-director') && (
        <>
          <TaskTreeView visibleTasks={visible} onSelectTask={setDetail} />
          <TaskDetailDrawer
            open={!!detail}
            task={detail}
            tasks={tasks}
            usersById={uMap}
            onClose={() => setDetail(null)}
          />
        </>
      )}
    </div>
  )
}
