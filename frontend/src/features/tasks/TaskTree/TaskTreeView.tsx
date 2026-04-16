import type { Task } from '@/types'
import { TaskTree } from '@/features/tasks/TaskTree/TaskTree'
import { taskForestRoots } from '@/utils/rbac'

export function TaskTreeView({
  visibleTasks,
  onSelectTask,
}: {
  visibleTasks: Task[]
  onSelectTask: (t: Task) => void
}) {
  const roots = taskForestRoots(visibleTasks)
  if (!roots.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-6 text-center text-sm text-slate-600">
        Không có công việc để hiển thị trong cây.
      </p>
    )
  }
  return <TaskTree tasks={roots} onSelectTask={onSelectTask} />
}
