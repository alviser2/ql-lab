import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Modal } from '@/components/Modal'
import * as meetingService from '@/services/meetingService'
import type { User } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { useUsersQuery } from '@/hooks/useUsersQuery'
import { useDepartmentsQuery } from '@/hooks/useDepartmentsQuery'
import { sortUsersByRoleThenName } from '@/utils/userSort'

export function CreateMeetingModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const usersQuery = useUsersQuery()
  const departmentsQuery = useDepartmentsQuery()
  const users = useMemo(
    () => sortUsersByRoleThenName(usersQuery.data ?? []),
    [usersQuery.data],
  )
  const departments = departmentsQuery.data ?? []

  const [title, setTitle] = useState(
    'Biên bản họp công việc lab',
  )
  const [documentNumber, setDocumentNumber] = useState('')
  const [documentPlace, setDocumentPlace] = useState('Hà Nội')
  const [room, setRoom] = useState(
    'lab iBME - C7 814',
  )
  const [startAt, setStartAt] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(7, 30, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [chairId, setChairId] = useState('')
  const [secretaryId, setSecretaryId] = useState('')
  const [departmentId, setDepartmentId] = useState<string | ''>('')
  const [attendeeIds, setAttendeeIds] = useState<string[]>([])

  const secretaryCandidates = useMemo(
    () =>
      users.filter(
        (u) => u.role === 'r-staff' || u.role === 'r-dept-head',
      ),
    [users],
  )

  const mut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('NO_USER')
      if (!secretaryId) throw new Error('NO_SECRETARY')
      return meetingService.createMeeting(user, {
        title,
        documentNumber: documentNumber || undefined,
        documentPlace: documentPlace || undefined,
        documentDay: new Date(startAt).getDate(),
        documentMonth: new Date(startAt).getMonth() + 1,
        documentYear: new Date(startAt).getFullYear(),
        startAt: new Date(startAt).toISOString(),
        endAt: null,
        room,
        chairId,
        secretaryId,
        attendeeIds,
        departmentId: departmentId || null,
      })
    },
    onSuccess: async (m) => {
      toast.success('Đã tạo lịch giao ban (nháp)')
      await qc.invalidateQueries({ queryKey: ['meetings'] })
      onClose()
      navigate(`/meetings/${m.id}`)
    },
    onError: (e: Error & { code?: string }) => {
      const code = e.code || e.message
      if (code === 'FORBIDDEN_SCHEDULE') {
        toast.error('Chỉ Trưởng lab / Thường trực (Key Member) được tạo lịch')
      } else if (code === 'NO_SECRETARY') {
        toast.error('Chọn thư ký phiên họp')
      } else toast.error(e.message || 'Không tạo được lịch')
    },
  })

  function toggleAttendee(id: string) {
    setAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  if (!user) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo lịch giao ban"
      size="lg"
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <label className="block text-sm font-medium text-slate-700">
          Tiêu đề biên bản
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Số biên bản (vd: ..../BB-GB)
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="....../BB-GB"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Địa danh (đầu trang)
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={documentPlace}
              onChange={(e) => setDocumentPlace(e.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Thời gian bắt đầu
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Địa điểm
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Chủ tọa
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={chairId}
              onChange={(e) => setChairId(e.target.value)}
            >
              {users
                .filter((u) =>
                  ['r-director', 'r-vice-director', 'r-dept-head'].includes(
                    u.role,
                  ),
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.title})
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Thư ký (được sửa biên bản trước khi Trưởng lab duyệt)
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={secretaryId}
              onChange={(e) => setSecretaryId(e.target.value)}
            >
              <option value="">— Chọn thư ký —</option>
              {secretaryCandidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.title})
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Phạm vi
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">Toàn bệnh viện</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="rounded-xl border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">
            Thành phần tham dự
          </legend>
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
            {users.map((u: User) => (
              <li key={u.id} className="flex items-center gap-2">
                <input
                  id={`att-${u.id}`}
                  type="checkbox"
                  checked={attendeeIds.includes(u.id)}
                  onChange={() => toggleAttendee(u.id)}
                  className="rounded border-slate-300"
                />
                <label htmlFor={`att-${u.id}`} className="text-sm">
                  {u.name}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Huỷ
          </button>
          <button
            type="button"
            disabled={mut.isPending || !title.trim()}
            onClick={() => mut.mutate()}
            className="rounded-xl bg-medical-600 px-4 py-2 text-sm font-semibold text-white hover:bg-medical-700 disabled:opacity-50"
          >
            Tạo lịch
          </button>
        </div>
      </div>
    </Modal>
  )
}
