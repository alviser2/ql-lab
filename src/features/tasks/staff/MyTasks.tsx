import { useState } from 'react'
import { ClipboardCheck, FileText } from 'lucide-react'
import type { Task, User } from '@/types'
import { TaskCard } from '@/components/TaskCard'
import { TaskDetailDrawer } from '@/features/tasks/staff/TaskDetailDrawer'
import { QuickReportModal } from '@/features/tasks/staff/QuickReportModal'

export function MyTasks({
  tasks,
  usersById,
  allTasks,
}: {
  tasks: Task[]
  usersById: Map<string, User>
  allTasks: Task[]
}) {
  const [detail, setDetail] = useState<Task | null>(null)
  const [reportTask, setReportTask] = useState<Task | null>(null)

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <header className="flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
        <span className="flex size-10 items-center justify-center rounded-xl bg-medical-600 text-white shadow">
          <ClipboardCheck className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Việc của tôi</h2>
          <p className="text-xs text-slate-500">Tối ưu mobile — thao tác nhanh</p>
        </div>
      </header>

      <ul className="space-y-3">
        {tasks.map((t) => {
          const canReport =
            t.status === 'NEW' || t.status === 'IN_PROGRESS'
          return (
            <li
              key={t.id}
              className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm"
            >
              <TaskCard
                task={t}
                assignee={
                  t.assigneeId ? usersById.get(t.assigneeId) ?? null : null
                }
                onClick={() => setDetail(t)}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!canReport}
                  title={
                    canReport
                      ? 'Gửi báo cáo cho người giao duyệt'
                      : 'Chỉ báo cáo khi việc Mới hoặc Đang làm'
                  }
                  onClick={() => setReportTask(t)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileText className="size-3.5" />
                  Báo cáo công việc
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {tasks.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-8 text-center text-sm text-slate-600">
          Không có việc được giao.
        </p>
      )}

      <TaskDetailDrawer
        open={!!detail}
        task={detail}
        tasks={allTasks}
        usersById={usersById}
        onClose={() => setDetail(null)}
      />
      <QuickReportModal
        open={!!reportTask}
        task={reportTask}
        onClose={() => setReportTask(null)}
      />
    </div>
  )
}
