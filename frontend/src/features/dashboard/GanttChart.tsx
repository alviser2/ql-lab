import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Task } from '@/types'

export function GanttChart({ tasks }: { tasks: Task[] }) {
  const data = tasks.slice(0, 8).map((t) => {
    const start = new Date(t.createdAt).getTime()
    const end = new Date(t.deadline).getTime()
    const span = Math.max(1, end - start)
    return {
      id: t.id,
      name:
        t.title.length > 28 ? `${t.title.slice(0, 28)}…` : t.title,
      start,
      spanDays: span / (86400 * 1000),
      status: t.status,
    }
  })

  if (!data.length) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-600">
        Chưa có dữ liệu timeline.
      </p>
    )
  }

  return (
    <div className="h-[320px] w-full rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">
        Gantt đơn giản (span tạo → hạn)
      </h3>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
          <XAxis
            type="number"
            tickFormatter={(v) => `${Math.round(v)}d`}
            className="text-xs"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 11 }}
          />
          <Tooltip />
          <Bar dataKey="spanDays" fill="#059669" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
