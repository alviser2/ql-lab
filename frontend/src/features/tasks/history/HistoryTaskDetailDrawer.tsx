import { Drawer } from '@/components/Drawer'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityTag } from '@/components/PriorityTag'
import { DeadlineBadge } from '@/components/DeadlineBadge'
import type { Task, User } from '@/types'

function formatDateTime(input?: string | null) {
  if (!input) return '—'
  const dt = new Date(input)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleString('vi-VN')
}

function UserLine({ label, userName }: { label: string; userName?: string | null }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{userName || '—'}</p>
    </div>
  )
}

export function HistoryTaskDetailDrawer({
  open,
  task,
  usersById,
  onClose,
}: {
  open: boolean
  task: Task | null
  usersById: Map<string, User>
  onClose: () => void
}) {
  if (!task) return null

  const creatorName = task.createdById
    ? usersById.get(task.createdById)?.name || task.creatorName || task.createdById
    : '—'
  const assigneeName = task.assigneeId
    ? usersById.get(task.assigneeId)?.name || task.assigneeName || task.assigneeId
    : '—'
  const archivedByName = task.archivedById
    ? usersById.get(task.archivedById)?.name || task.archivedById
    : '—'

  return (
    <Drawer open={open} onClose={onClose} title="Chi tiết công việc lịch sử">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
          {task.description && (
            <p className="mt-1 text-sm text-slate-600">{task.description}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge status={task.status} />
          <PriorityTag priority={task.priority} />
          <DeadlineBadge deadline={task.deadline} />
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-2">
          <UserLine label="Người tạo" userName={creatorName} />
          <UserLine label="Người nhận việc" userName={assigneeName} />
          <UserLine label="Dự án" userName={task.departmentName || task.departmentId || '—'} />
          <UserLine label="Cuộc họp" userName={task.meetingTitle || '—'} />
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-800">Mốc thời gian</p>
          <ul className="mt-2 grid gap-x-3 gap-y-1 text-sm text-slate-700 sm:grid-cols-2">
            <li className="sm:col-span-2">Ngày tạo: <strong>{formatDateTime(task.createdAt)}</strong></li>
            <li>Bắt đầu: <strong>{formatDateTime(task.started_at)}</strong></li>
            <li>Hoàn thành: <strong>{formatDateTime(task.completed_at)}</strong></li>
            <li>Lưu lịch sử: <strong>{formatDateTime(task.archivedAt)}</strong></li>
            <li className="sm:col-span-2">Người chốt lịch sử: <strong>{archivedByName}</strong></li>
          </ul>
        </div>

        {task.result_note && (
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">Ghi chú mở rộng</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{task.result_note}</p>
          </div>
        )}

        {task.lastReportSummary && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <p className="text-sm font-semibold text-amber-900">Báo cáo cuối cùng</p>
            <p className="mt-1 text-sm text-amber-900">{task.lastReportSummary}</p>
          </div>
        )}

        {task.lastRejectionReason && (
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-3">
            <p className="text-sm font-semibold text-red-800">Lý do từ chối gần nhất</p>
            <p className="mt-1 text-sm text-red-800">{task.lastRejectionReason}</p>
          </div>
        )}
      </div>
    </Drawer>
  )
}
