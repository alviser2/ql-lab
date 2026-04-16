import { Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import type { Department, Task } from '@/types'

const COLORS = ['#059669', '#0ea5e9', '#f59e0b', '#ef4444', '#64748b']

export function DepartmentKPI({
  department,
  tasks,
}: {
  department: Department
  tasks: Task[]
}) {
  const byStatus = tasks.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const pieData = Object.entries(byStatus).map(([name, value]) => ({
    name,
    value,
  }))

  const total = tasks.length
  const done = byStatus.COMPLETED ?? 0
  const rate = total ? Math.round((done / total) * 100) : 0

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            KPI — {department.name}
          </h3>
          <p className="text-xs text-slate-500">Mã {department.code}</p>
        </div>
        <div className="rounded-xl bg-medical-50 px-3 py-2 text-sm font-semibold text-medical-800 ring-1 ring-medical-200">
          Tỷ lệ hoàn thành: {rate}%
        </div>
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
