import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { Task } from '@/types'
import { Modal } from '@/components/Modal'
import * as taskService from '@/services/taskService'
import { useAuthStore } from '@/store/authStore'
import { useTaskStore } from '@/store/taskStore'

export function QuickReportModal({
  open,
  task,
  onClose,
}: {
  open: boolean
  task: Task | null
  onClose: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const fetchTasks = useTaskStore((s) => s.fetchTasks)
  const [note, setNote] = useState('')
  const [fileName, setFileName] = useState('')

  const mut = useMutation({
    mutationFn: async () => {
      if (!task || !user) throw new Error('NO')
      return taskService.submitTaskReport(task.id, user.id, note)
    },
    onSuccess: async () => {
      toast.success(
        'Đã gửi báo cáo — người giao việc sẽ thấy trong hộp duyệt',
      )
      await qc.invalidateQueries({ queryKey: ['tasks'] })
      await fetchTasks()
      setNote('')
      setFileName('')
      onClose()
    },
    onError: (e: Error) => {
      if (e.message === 'FORBIDDEN_NOT_ASSIGNEE') {
        toast.error('Chỉ người được giao mới gửi báo cáo')
      } else if (e.message === 'INVALID_FOR_REPORT') {
        toast.error('Chỉ gửi báo cáo khi việc ở trạng thái Mới / Đang làm')
      } else toast.error(e.message || 'Không gửi được báo cáo')
    },
  })

  if (!task) return null

  const canSubmit =
    task.status === 'NEW' || task.status === 'IN_PROGRESS'

  return (
    <Modal open={open} onClose={onClose} title="Báo cáo công việc" size="md">
      <p className="text-sm text-slate-600">
        Việc: <span className="font-medium text-slate-900">{task.title}</span>
      </p>
      {!canSubmit && (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
          Việc đang chờ duyệt hoặc đã kết thúc — không gửi báo cáo thêm từ đây.
        </p>
      )}
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Nội dung báo cáo / tiến độ
        <textarea
          className="mt-1 min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-medical-500 focus:outline-none focus:ring-2 focus:ring-medical-200"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Mô tả kết quả, khó khăn, đề xuất..."
          disabled={!canSubmit}
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-slate-700">
        Đính kèm (tên file demo)
        <input
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="bao-cao.pdf"
          disabled={!canSubmit}
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Huỷ
        </button>
        <button
          type="button"
          disabled={!canSubmit || mut.isPending || !note.trim()}
          onClick={() => mut.mutate()}
          className="rounded-xl bg-medical-600 px-4 py-2 text-sm font-semibold text-white hover:bg-medical-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Gửi báo cáo lên người giao
        </button>
      </div>
    </Modal>
  )
}
