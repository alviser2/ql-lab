import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import * as taskService from '@/services/taskService'
import { Modal } from '@/components/Modal'

function monthLabel(year: number, month: number) {
  return `tháng ${String(month).padStart(2, '0')}/${year}`
}

export function HistoryPurgePanel({
  enabled,
}: {
  enabled: boolean
}) {
  const qc = useQueryClient()
  const now = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [confirmMode, setConfirmMode] = useState<'month' | 'all' | null>(null)

  const purgeMonthMut = useMutation({
    mutationFn: async () => {
      const y = Number(year)
      const m = Number(month)
      return taskService.purgeHistoryByMonth(y, m)
    },
    onSuccess: async (result) => {
      toast.success(`Đã xóa ${result.deletedCount} công việc lịch sử theo tháng`)
      await qc.invalidateQueries({ queryKey: ['tasks'] })
      setConfirmMode(null)
    },
    onError: (e: Error & { code?: string }) => {
      toast.error(e.message || 'Xóa theo tháng thất bại')
    },
  })

  const purgeAllMut = useMutation({
    mutationFn: taskService.purgeAllHistory,
    onSuccess: async (result) => {
      toast.success(`Đã xóa toàn bộ lịch sử (${result.deletedCount} công việc)`)
      await qc.invalidateQueries({ queryKey: ['tasks'] })
      setConfirmMode(null)
    },
    onError: (e: Error & { code?: string }) => {
      toast.error(e.message || 'Xóa toàn bộ thất bại')
    },
  })

  if (!enabled) return null

  const y = Number(year)
  const m = Number(month)
  const monthValid = Number.isInteger(y) && Number.isInteger(m) && m >= 1 && m <= 12

  return (
    <>
      <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
        <h3 className="text-sm font-semibold text-red-900">Dọn dữ liệu lịch sử</h3>
        <p className="mt-1 text-xs text-red-800">
          Chức năng nguy hiểm, chỉ nên dùng khi đã backup DB.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <label className="text-xs text-red-900">
            Tháng
            <input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 w-full rounded-lg border border-red-200 bg-white px-2 py-1.5 text-sm text-slate-900"
            />
          </label>
          <label className="text-xs text-red-900">
            Năm
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="mt-1 w-full rounded-lg border border-red-200 bg-white px-2 py-1.5 text-sm text-slate-900"
            />
          </label>
          <div className="sm:col-span-2 flex flex-col justify-end gap-2 sm:flex-row sm:items-end">
            <button
              type="button"
              disabled={!monthValid || purgeMonthMut.isPending || purgeAllMut.isPending}
              onClick={() => setConfirmMode('month')}
              className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
            >
              Xóa theo tháng
            </button>
            <button
              type="button"
              disabled={purgeMonthMut.isPending || purgeAllMut.isPending}
              onClick={() => setConfirmMode('all')}
              className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 sm:w-auto"
            >
              Xóa toàn bộ lịch sử
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={confirmMode === 'month'}
        onClose={() => setConfirmMode(null)}
        title="Xác nhận xóa lịch sử theo tháng"
        size="sm"
      >
        <p className="text-sm text-slate-700">
          Bạn chắc chắn muốn xóa toàn bộ lịch sử công việc của <strong>{monthLabel(y, m)}</strong>?
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setConfirmMode(null)}
            className="w-full rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 sm:w-auto"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={purgeMonthMut.isPending}
            onClick={() => purgeMonthMut.mutate()}
            className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
          >
            Xóa
          </button>
        </div>
      </Modal>

      <Modal
        open={confirmMode === 'all'}
        onClose={() => setConfirmMode(null)}
        title="Xác nhận xóa toàn bộ lịch sử"
        size="sm"
      >
        <p className="text-sm text-slate-700">
          Hành động này sẽ xóa <strong>toàn bộ công việc đã lưu lịch sử</strong>. Không thể hoàn tác.
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setConfirmMode(null)}
            className="w-full rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 sm:w-auto"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={purgeAllMut.isPending}
            onClick={() => purgeAllMut.mutate()}
            className="w-full rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 sm:w-auto"
          >
            Xóa toàn bộ
          </button>
        </div>
      </Modal>
    </>
  )
}
