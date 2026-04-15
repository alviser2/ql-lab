import { useMemo, useState } from 'react'
import { ClipboardCheck, FileText } from 'lucide-react'
import type { Task, User } from '@/types'
import { TaskDetailDrawer } from '@/features/tasks/staff/TaskDetailDrawer'
import { QuickReportModal } from '@/features/tasks/staff/QuickReportModal'
import { DeadlineBadge } from '@/components/DeadlineBadge'
import { PriorityTag } from '@/components/PriorityTag'
import { StatusBadge } from '@/components/StatusBadge'

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

  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.archived),
    [tasks],
  )

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
        <span className="flex size-10 items-center justify-center rounded-xl bg-medical-600 text-white shadow">
          <ClipboardCheck className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Việc của tôi</h2>
          <p className="text-xs text-slate-500">Giao diện web (mỗi việc 1 dòng)</p>
        </div>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1050px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Công việc</th>
              <th className="px-3 py-2 text-left font-semibold">Người phụ trách</th>
              <th className="px-3 py-2 text-left font-semibold">Trạng thái</th>
              <th className="px-3 py-2 text-left font-semibold">Ưu tiên</th>
              <th className="px-3 py-2 text-left font-semibold">Deadline</th>
              <th className="px-3 py-2 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {activeTasks.map((t) => {
              const canReport = t.status === 'NEW' || t.status === 'IN_PROGRESS'
              const assigneeName = t.assigneeId
                ? usersById.get(t.assigneeId)?.name || '—'
                : '—'

              return (
                <tr
                  key={t.id}
                  className="border-t border-slate-100 hover:bg-slate-50/60"
                >
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="text-left font-medium text-slate-900 hover:text-medical-700"
                      onClick={() => setDetail(t)}
                    >
                      {t.title}
                    </button>
                    {t.lastRejectionReason && (
                      <p className="mt-1 text-xs text-red-600">
                        Lý do từ chối: {t.lastRejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{assigneeName}</td>
                  <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-3 py-3"><PriorityTag priority={t.priority} /></td>
                  <td className="px-3 py-3"><DeadlineBadge deadline={t.deadline} /></td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      {canReport ? (
                        <button
                          type="button"
                          onClick={() => setReportTask(t)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          <FileText className="size-3.5" />
                          Báo cáo
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {activeTasks.length === 0 && (
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
