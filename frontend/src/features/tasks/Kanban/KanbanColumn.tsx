import { useDroppable } from '@dnd-kit/core'
import type { Task, TaskStatus, User } from '@/types'
import { KanbanCard } from '@/features/tasks/Kanban/KanbanCard'
import { cn } from '@/utils/cn'

export function KanbanColumn({
  id,
  title,
  tasks,
  usersById,
  onOpenTask,
}: {
  id: TaskStatus | 'DONE'
  title: string
  tasks: Task[]
  usersById: Map<string, User>
  onOpenTask: (t: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[320px] flex-1 flex-col rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 shadow-inner',
        isOver && 'ring-2 ring-medical-400 ring-offset-2',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {tasks.map((t) => (
          <KanbanCard
            key={t.id}
            task={t}
            assignee={
              t.assigneeId ? usersById.get(t.assigneeId) ?? null : null
            }
            onOpen={() => onOpenTask(t)}
          />
        ))}
      </div>
    </div>
  )
}
