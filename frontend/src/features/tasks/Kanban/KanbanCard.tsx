import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ExternalLink } from 'lucide-react'
import type { Task, User } from '@/types'
import { TaskCard } from '@/components/TaskCard'
import { cn } from '@/utils/cn'

export function KanbanCard({
  task,
  assignee,
  onOpen,
}: {
  task: Task
  assignee?: User | null
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('rounded-xl', isDragging && 'z-20 opacity-90')}
    >
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing"
      >
        <TaskCard task={task} assignee={assignee} compact />
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-medical-700 hover:bg-medical-50"
      >
        <ExternalLink className="size-3.5" />
        Chi tiết
      </button>
    </div>
  )
}
