import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CalendarClock } from 'lucide-react'
import { cn } from '@/utils/cn'

export function DeadlineBadge({
  deadline,
  className,
}: {
  deadline: string
  className?: string
}) {
  const d = new Date(deadline)
  const overdue = isPast(d) && !isToday(d)
  const soon = isToday(d) || isTomorrow(d)
  let label = format(d, 'dd/MM/yyyy', { locale: vi })
  if (isToday(d)) label = 'Hôm nay'
  else if (isTomorrow(d)) label = 'Ngày mai'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ring-1 ring-inset',
        overdue && 'bg-red-50 text-red-800 ring-red-200',
        !overdue && soon && 'bg-amber-50 text-amber-900 ring-amber-200',
        !overdue && !soon && 'bg-slate-50 text-slate-700 ring-slate-200',
        className,
      )}
    >
      <CalendarClock className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  )
}
