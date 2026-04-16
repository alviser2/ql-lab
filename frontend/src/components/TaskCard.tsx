import type { Task, User } from '@/types'
import { DeadlineBadge } from '@/components/DeadlineBadge'
import { PriorityTag } from '@/components/PriorityTag'
import { StatusBadge } from '@/components/StatusBadge'
import { UserAvatar } from '@/components/UserAvatar'
import { cn } from '@/utils/cn'

export function TaskCard({
  task,
  assignee,
  onClick,
  compact,
  className,
}: {
  task: Task
  assignee?: User | null
  onClick?: () => void
  compact?: boolean
  className?: string
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 font-medium text-slate-900">{task.title}</p>
        {assignee && <UserAvatar name={assignee.name} size="sm" />}
      </div>
      <div
        className={cn(
          'mt-2 flex flex-wrap items-center gap-2',
          compact && 'mt-1.5',
        )}
      >
        <DeadlineBadge deadline={task.deadline} />
        {!compact && (
          <>
            <StatusBadge status={task.status} />
            <PriorityTag priority={task.priority} />
          </>
        )}
      </div>
      {compact && (
        <div className="mt-1.5 flex flex-wrap gap-2">
          <StatusBadge status={task.status} />
          <PriorityTag priority={task.priority} />
        </div>
      )}
    </>
  )

  const shell = cn(
    'w-full rounded-xl border border-slate-200/80 bg-white/90 p-3 text-left shadow-sm transition hover:border-medical-300 hover:shadow-md',
    onClick && 'cursor-pointer',
    className,
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shell}>
        {body}
      </button>
    )
  }

  return <div className={shell}>{body}</div>
}
