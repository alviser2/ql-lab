import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, X } from 'lucide-react'
import type { Task, User } from '@/types'
import * as taskService from '@/services/taskService'
import { Modal } from '@/components/Modal'
import { useAuthStore } from '@/store/authStore'
import { DeadlineBadge } from '@/components/DeadlineBadge'
import { PriorityTag } from '@/components/PriorityTag'

export function ApprovalInbox({
  tasks,
  usersById,
}: {
  tasks: Task[]
  usersById: Map<string, User>
}) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [rejecting, setRejecting] = useState<Task | null>(null)
  const [reason, setReason] = useState('')

  const pending = useMemo(() => {
    if (!user) return []
    return tasks.filter(
      (t) =>
        t.status === 'PENDING_APPROVAL' &&
        t.pendingApprovalReviewerId === user.id,
    )
  }, [tasks, user])

  const mut = useMutation({
    mutationFn: async ({
      id,
      approve,
      rejectionReason,
    }: {
      id: string
      approve: boolean
      rejectionReason?: string
    }) => {
      if (!user) throw new Error('NO_USER')
      return taskService.approveTask(id, approve, rejectionReason)
    },
    onSuccess: async (_, v) => {
      if (v.approve) {
        toast.success('Đã duyệt — công việc hoàn thành')
      } else {
        toast.error('Đã từ chối báo cáo — cấp dưới có thể chỉnh sửa và gửi lại')
      }
      await qc.invalidateQueries({ queryKey: ['tasks'] })
      setRejecting(null)
      setReason('')
    },
    onError: (e: Error & { code?: string }) => {
      const code = e.code || e.message
      if (code === 'FORBIDDEN_NOT_REVIEWER') {
        toast.error('Bạn không phải người duyệt của việc này')
      } else toast.error(e.message || 'Thao tác thất bại')
    },
  })

  if (!pending.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-600">
        Không có báo cáo công việc chờ bạn duyệt.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-800">
        Hộp duyệt — báo cáo từ cấp dưới
      </h3>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1180px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Công việc</th>
              <th className="px-3 py-2 text-left font-semibold">Người giao</th>
              <th className="px-3 py-2 text-left font-semibold">Người nhận</th>
              <th className="px-3 py-2 text-left font-semibold">Deadline</th>
              <th className="px-3 py-2 text-left font-semibold">Ưu tiên</th>
              <th className="px-3 py-2 text-left font-semibold">Báo cáo</th>
              <th className="px-3 py-2 text-right font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((t) => {
              const assigneeName = t.assigneeId
                ? usersById.get(t.assigneeId)?.name || '—'
                : '—'
              const assignerName = t.assignedById
                ? usersById.get(t.assignedById)?.name || '—'
                : t.createdById
                  ? usersById.get(t.createdById)?.name || '—'
                  : '—'

              return (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 text-slate-900">
                    <p className="truncate font-medium">{t.title}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{assignerName}</td>
                  <td className="px-3 py-3 text-slate-700">{assigneeName}</td>
                  <td className="px-3 py-3"><DeadlineBadge deadline={t.deadline} /></td>
                  <td className="px-3 py-3"><PriorityTag priority={t.priority} /></td>
                  <td className="px-3 py-3 text-slate-700 max-w-[360px]">
                    <p className="truncate">{t.lastReportSummary || '—'}</p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={mut.isPending}
                        onClick={() => mut.mutate({ id: t.id, approve: true })}
                        className="inline-flex items-center gap-1 rounded-lg bg-medical-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-medical-700 disabled:opacity-50"
                      >
                        <Check className="size-4" />
                        Duyệt
                      </button>
                      <button
                        type="button"
                        disabled={mut.isPending}
                        onClick={() => {
                          setRejecting(t)
                          setReason('')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <X className="size-4" />
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!rejecting}
        onClose={() => {
          setRejecting(null)
          setReason('')
        }}
        title="Từ chối báo cáo"
        size="sm"
      >
        <p className="text-sm text-slate-600">
          Ghi lý do để cấp dưới biết và chỉnh sửa (bắt buộc khuyến nghị).
        </p>
        <textarea
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ví dụ: Bổ sung số liệu theo biểu mẫu 02..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setRejecting(null)
              setReason('')
            }}
            className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Huỷ
          </button>
          <button
            type="button"
            disabled={mut.isPending || !rejecting}
            onClick={() => {
              if (!rejecting) return
              mut.mutate({
                id: rejecting.id,
                approve: false,
                rejectionReason: reason,
              })
            }}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Xác nhận từ chối
          </button>
        </div>
      </Modal>
    </div>
  )
}
