import type { TaskStatus } from '@/types'
import { cn } from '@/utils/cn'

const styles: Record<TaskStatus, string> = {
  NEW: 'bg-slate-200 text-slate-800 ring-slate-300',
  IN_PROGRESS: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-950 ring-amber-300',
  COMPLETED: 'bg-teal-800 text-white ring-teal-950',
  REJECTED: 'bg-red-100 text-red-900 ring-red-300',
}

const labels: Record<TaskStatus, string> = {
  NEW: 'Mới',
  IN_PROGRESS: 'Đang làm',
  PENDING_APPROVAL: 'Chờ duyệt',
  COMPLETED: 'Hoàn thành',
  REJECTED: 'Từ chối',
}

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        styles[status],
        className,
      )}
    >
      {labels[status]}
    </span>
  )
}
