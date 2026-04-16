import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Department, Task } from '@/types'

export function DepartmentBarChart({
  departments,
  tasks,
}: {
  departments: Department[]
  tasks: Task[]
}) {
  const data = departments.map((d) => {
    const ts = tasks.filter((t) => t.departmentId === d.id)
    const done = ts.filter((t) => t.status === 'COMPLETED').length
    return {
      name: d.code,
      full: d.name,
      total: ts.length,
      done,
      rate: ts.length ? Math.round((done / ts.length) * 100) : 0,
    }
  })

  return (
    <div className="h-[300px] w-full rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">
        Theo khoa — tổng việc & hoàn thành
      </h3>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="total" fill="#94a3b8" name="Tổng" radius={[4, 4, 0, 0]} />
          <Bar dataKey="done" fill="#059669" name="Hoàn thành" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
