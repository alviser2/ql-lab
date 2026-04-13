import { useMemo, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useTasksQuery } from '@/hooks/useTasksQuery'
import { loadDb } from '@/services/mockDb'
import { tasksVisibleForUser } from '@/utils/rbac'
import { TaskTreeView } from '@/features/tasks/TaskTree/TaskTreeView'
import { ApprovalInbox } from '@/features/tasks/ApprovalInbox'
import { KanbanBoard } from '@/features/tasks/Kanban/Board'
import { MyTasks } from '@/features/tasks/staff/MyTasks'
import { TaskDetailDrawer } from '@/features/tasks/staff/TaskDetailDrawer'
import type { Task } from '@/types'

export function TasksPage() {
  const user = useAuthStore((s) => s.user)
  const { data: tasks = [] } = useTasksQuery()
  const [detail, setDetail] = useState<Task | null>(null)

  const uMap = useMemo(() => {
    const db = loadDb()
    return new Map(db.users.map((u) => [u.id, u]))
  }, [])

  const visible = useMemo(
    () => (user ? tasksVisibleForUser(user, tasks) : []),
    [tasks, user],
  )

  if (!user) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Công việc</h1>

      {user.role !== 'staff' && (
        <ApprovalInbox tasks={visible} usersById={uMap} />
      )}

      {user.role === 'staff' && (
        <MyTasks tasks={visible} usersById={uMap} allTasks={tasks} />
      )}

      {user.role === 'department_head' && (
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

      {(user.role === 'director' || user.role === 'vice_director') && (
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
