import type { TaskPriority } from '@/types'
import { cn } from '@/utils/cn'
import { AlertTriangle, ArrowDown, ArrowUp, Zap } from 'lucide-react'

const cfg: Record<
  TaskPriority,
  { label: string; className: string; icon: typeof Zap }
> = {
  LOW: {
    label: 'Thấp',
    className: 'bg-slate-100 text-slate-700',
    icon: ArrowDown,
  },
  MEDIUM: {
    label: 'TB',
    className: 'bg-sky-100 text-sky-900',
    icon: ArrowUp,
  },
  HIGH: {
    label: 'Cao',
    className: 'bg-orange-100 text-orange-900',
    icon: AlertTriangle,
  },
  URGENT: {
    label: 'Khẩn',
    className: 'bg-red-100 text-red-900',
    icon: Zap,
  },
}

export function PriorityTag({ priority }: { priority: TaskPriority }) {
  const c = cfg[priority]
  const Icon = c.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
        c.className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {c.label}
    </span>
  )
}
