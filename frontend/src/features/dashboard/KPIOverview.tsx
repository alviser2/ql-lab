import { isPast, isToday } from 'date-fns'
import type { Task } from '@/types'
import { CheckCircle2, ClockAlert, ListTodo, TrendingUp } from 'lucide-react'

export function KPIOverview({ tasks }: { tasks: Task[] }) {
  const total = tasks.length
  const done = tasks.filter((t) => t.status === 'COMPLETED').length
  const pct = total ? Math.round((done / total) * 100) : 0
  const overdue = tasks.filter((t) => {
    if (t.status === 'COMPLETED' || t.status === 'REJECTED') return false
    const d = new Date(t.deadline)
    return isPast(d) && !isToday(d)
  }).length

  const cards = [
    {
      label: 'Hoàn thành',
      value: `${pct}%`,
      hint: `${done}/${total} việc`,
      icon: TrendingUp,
      tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    },
    {
      label: 'Quá hạn',
      value: String(overdue),
      hint: 'Cần xử lý',
      icon: ClockAlert,
      tone: 'bg-red-50 text-red-800 ring-red-200',
    },
    {
      label: 'Đang chạy',
      value: String(
        tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      ),
      hint: 'IN_PROGRESS',
      icon: ListTodo,
      tone: 'bg-sky-50 text-sky-900 ring-sky-200',
    },
    {
      label: 'Hoàn tất gần đây',
      value: String(done),
      hint: 'Tổng đã xong',
      icon: CheckCircle2,
      tone: 'bg-teal-50 text-teal-900 ring-teal-200',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-2xl p-4 shadow-sm ring-1 ring-inset ${c.tone}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-80">
                {c.label}
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{c.value}</p>
              <p className="mt-1 text-xs opacity-80">{c.hint}</p>
            </div>
            <c.icon className="size-9 shrink-0 opacity-90" aria-hidden />
          </div>
        </div>
      ))}
    </div>
  )
}
