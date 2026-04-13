import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Lock, Save, ShieldCheck } from 'lucide-react'
import { loadDb } from '@/services/mockDb'
import * as meetingService from '@/services/meetingService'
import { useAuthStore } from '@/store/authStore'
import {
  canApproveMeeting,
  canEditMeetingDraft,
  meetingVisibleToUser,
} from '@/utils/meetingPermissions'
import { MINUTE_FIELD_GROUPS } from '@/features/meetings/minuteFieldConfig'
import type { Meeting, MeetingMinutes, User } from '@/types'

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function MeetingDetailPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const db = loadDb()

  const q = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => meetingService.getMeetingById(meetingId!),
    enabled: !!meetingId,
  })

  const [draft, setDraft] = useState<Meeting | null>(null)

  useEffect(() => {
    if (q.data) setDraft(q.data)
  }, [q.data])

  const canEdit = useMemo(
    () => (user && draft ? canEditMeetingDraft(user, draft) : false),
    [draft, user],
  )

  const canApprove = useMemo(
    () => (user && draft ? canApproveMeeting(user, draft) : false),
    [draft, user],
  )

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!user || !draft) throw new Error('NO')
      return meetingService.updateMeeting(user, draft.id, {
        title: draft.title,
        documentNumber: draft.documentNumber,
        documentPlace: draft.documentPlace,
        documentDay: draft.documentDay,
        documentMonth: draft.documentMonth,
        documentYear: draft.documentYear,
        startAt: draft.startAt,
        endAt: draft.endAt,
        room: draft.room,
        chairId: draft.chairId,
        secretaryId: draft.secretaryId,
        attendeeIds: draft.attendeeIds,
        departmentId: draft.departmentId,
        minutes: draft.minutes,
      })
    },
    onSuccess: async () => {
      toast.success('Đã lưu biên bản')
      await qc.invalidateQueries({ queryKey: ['meetings'] })
      await qc.invalidateQueries({ queryKey: ['meeting', meetingId] })
    },
    onError: (e: Error) => {
      if (e.message === 'FORBIDDEN_EDIT') {
        toast.error('Chỉ thư ký được sửa khi biên bản chưa duyệt')
      } else toast.error('Không lưu được')
    },
  })

  const approveMut = useMutation({
    mutationFn: async () => {
      if (!user || !draft) throw new Error('NO')
      return meetingService.approveMeeting(user, draft.id)
    },
    onSuccess: async () => {
      toast.success('Đã duyệt — biên bản đã khóa chỉnh sửa')
      await qc.invalidateQueries({ queryKey: ['meetings'] })
      await qc.invalidateQueries({ queryKey: ['meeting', meetingId] })
    },
    onError: (e: Error) => {
      if (e.message === 'FORBIDDEN_APPROVE') {
        toast.error('Chỉ Giám đốc được duyệt chốt biên bản')
      } else toast.error('Không duyệt được')
    },
  })

  function setMinute<K extends keyof MeetingMinutes>(key: K, value: string) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            minutes: { ...prev.minutes, [key]: value },
          }
        : prev,
    )
  }

  if (!meetingId || !user) return null

  if (q.isLoading) {
    return <p className="text-sm text-slate-500">Đang tải biên bản…</p>
  }

  if (q.data == null) {
    return <Navigate to="/meetings" replace />
  }

  if (!meetingVisibleToUser(user, q.data)) {
    return <Navigate to="/meetings" replace />
  }

  if (!draft) {
    return <p className="text-sm text-slate-500">Đang tải biên bản…</p>
  }

  const dis = !canEdit

  const uMap = new Map(db.users.map((u: User) => [u.id, u]))

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/meetings"
          className="inline-flex items-center gap-1 text-sm font-medium text-medical-700 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Danh sách
        </Link>
        {draft.status === 'approved' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-900">
            <Lock className="size-3.5" />
            Đã duyệt — không chỉnh sửa
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950">
            Nháp — chờ thư ký hoàn thiện & Giám đốc duyệt
          </span>
        )}
      </div>

      <header className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <p className="text-center text-xs uppercase tracking-wide text-slate-500">
          SỞ Y TẾ HÀ NỘI · BV ĐA KHOA ĐỨC GIANG
        </p>
        <p className="text-center text-xs text-slate-500">
          Cộng hòa XHCN Việt Nam — Độc lập — Tự do — Hạnh phúc
        </p>
        <h1 className="mt-3 text-center text-lg font-bold uppercase text-slate-900">
          {draft.title}
        </h1>
        <p className="mt-1 text-center text-sm text-slate-600">
          (V/v: {draft.minutes.matter?.trim() || '…'})
        </p>
        <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-slate-600">
          <span>
            Số:{' '}
            <input
              disabled={dis}
              className="w-36 rounded border border-slate-200 px-1 py-0.5 disabled:bg-slate-50"
              value={draft.documentNumber ?? ''}
              onChange={(e) =>
                setDraft((p) => (p ? { ...p, documentNumber: e.target.value } : p))
              }
            />
          </span>
          <span className="flex flex-wrap items-center gap-1">
            {draft.documentPlace ?? '…'}, ngày
            <input
              type="number"
              disabled={dis}
              className="w-12 rounded border border-slate-200 px-1 py-0.5 disabled:bg-slate-50"
              value={draft.documentDay ?? ''}
              onChange={(e) =>
                setDraft((p) =>
                  p
                    ? { ...p, documentDay: Number(e.target.value) || undefined }
                    : p,
                )
              }
            />
            tháng
            <input
              type="number"
              disabled={dis}
              className="w-12 rounded border border-slate-200 px-1 py-0.5 disabled:bg-slate-50"
              value={draft.documentMonth ?? ''}
              onChange={(e) =>
                setDraft((p) =>
                  p
                    ? {
                        ...p,
                        documentMonth: Number(e.target.value) || undefined,
                      }
                    : p,
                )
              }
            />
            năm
            <input
              type="number"
              disabled={dis}
              className="w-16 rounded border border-slate-200 px-1 py-0.5 disabled:bg-slate-50"
              value={draft.documentYear ?? ''}
              onChange={(e) =>
                setDraft((p) =>
                  p
                    ? {
                        ...p,
                        documentYear: Number(e.target.value) || undefined,
                      }
                    : p,
                )
              }
            />
          </span>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Thông tin lịch họp</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Bắt đầu (hệ thống)
            <input
              type="datetime-local"
              disabled={dis}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:bg-slate-50"
              value={toLocalInput(draft.startAt)}
              onChange={(e) =>
                setDraft((p) =>
                  p
                    ? { ...p, startAt: new Date(e.target.value).toISOString() }
                    : p,
                )
              }
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Địa điểm
            <input
              disabled={dis}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:bg-slate-50"
              value={draft.room}
              onChange={(e) =>
                setDraft((p) => (p ? { ...p, room: e.target.value } : p))
              }
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Chủ tọa
            <select
              disabled={dis}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:bg-slate-50"
              value={draft.chairId}
              onChange={(e) =>
                setDraft((p) => (p ? { ...p, chairId: e.target.value } : p))
              }
            >
              {db.users
                .filter((u) =>
                  ['director', 'vice_director', 'department_head'].includes(
                    u.role,
                  ),
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Thư ký
            <select
              disabled={dis}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:bg-slate-50"
              value={draft.secretaryId}
              onChange={(e) =>
                setDraft((p) => (p ? { ...p, secretaryId: e.target.value } : p))
              }
            >
              {db.users
                .filter(
                  (u) =>
                    u.role === 'staff' || u.role === 'department_head',
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Thư ký:{' '}
          <strong>{uMap.get(draft.secretaryId)?.name}</strong> — có quyền sửa
          khi trạng thái <em>nháp</em>.
        </p>
      </section>

      {MINUTE_FIELD_GROUPS.map((group) => (
        <section
          key={group.heading}
          className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm"
        >
          <h2 className="text-sm font-bold text-medical-800">{group.heading}</h2>
          <div className="mt-4 space-y-4">
            {group.fields.map((f) => (
              <label key={f.key} className="block text-sm">
                <span className="font-medium text-slate-800">{f.label}</span>
                <textarea
                  disabled={dis}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50"
                  value={draft.minutes[f.key] ?? ''}
                  onChange={(e) => setMinute(f.key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      {draft.status === 'approved' && draft.approvedAt && (
        <p className="text-center text-xs text-slate-500">
          Duyệt lúc {new Date(draft.approvedAt).toLocaleString('vi-VN')} bởi{' '}
          {uMap.get(draft.approvedById ?? '')?.name ?? 'Giám đốc'}
        </p>
      )}

      <div className="sticky bottom-2 z-20 mt-8 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        {canEdit && (
          <button
            type="button"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate()}
            className="inline-flex items-center gap-2 rounded-xl bg-medical-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-medical-700 disabled:opacity-50"
          >
            <Save className="size-4" />
            Lưu biên bản
          </button>
        )}
        {canApprove && (
          <button
            type="button"
            disabled={approveMut.isPending}
            onClick={() => {
              if (
                window.confirm(
                  'Duyệt chốt biên bản? Sau khi duyệt không thể chỉnh sửa.',
                )
              ) {
                approveMut.mutate()
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-teal-900 disabled:opacity-50"
          >
            <ShieldCheck className="size-4" />
            Giám đốc duyệt & khóa
          </button>
        )}
      </div>
    </div>
  )
}
