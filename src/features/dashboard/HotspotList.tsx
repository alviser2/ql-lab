import { isPast, isToday } from 'date-fns'
import type { Task } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { DeadlineBadge } from '@/components/DeadlineBadge'

export function HotspotList({
  tasks,
  onOpen,
}: {
  tasks: Task[]
  onOpen: (t: Task) => void
}) {
  const hot = tasks
    .filter((t) => {
      if (t.status === 'COMPLETED' || t.status === 'REJECTED') return false
      const d = new Date(t.deadline)
      return isPast(d) && !isToday(d)
    })
    .slice(0, 8)

  if (!hot.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-600">
        Không có việc quá hạn trong phạm vi bạn xem được.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Điểm nóng — quá hạn</h3>
      <ul className="mt-3 divide-y divide-slate-100">
        {hot.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onOpen(t)}
              className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50/80"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{t.title}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <StatusBadge status={t.status} />
                  <DeadlineBadge deadline={t.deadline} />
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
