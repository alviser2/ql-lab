import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, FileDown, Lock, Save, ShieldCheck } from 'lucide-react'
import * as meetingService from '@/services/meetingService'
import { useAuthStore } from '@/store/authStore'
import {
  canApproveMeeting,
  canEditMeetingDraft,
  meetingVisibleToUser,
} from '@/utils/meetingPermissions'
import { MINUTE_FIELD_GROUPS } from '@/features/meetings/minuteFieldConfig'
import type { Meeting, MeetingMinutes, User } from '@/types'
import { useUsersQuery } from '@/hooks/useUsersQuery'
import { sortUsersByRoleThenName } from '@/utils/userSort'

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function escapeHtml(raw: string) {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatBlock(value?: string | null) {
  const v = (value ?? '').trim()
  const safe = v.length > 0 ? v : '................................................................................'
  return escapeHtml(safe).replace(/\n/g, '<br/>')
}

function exportMeetingPdf(draft: Meeting, usersById: Map<string, User>) {
  const now = new Date(draft.startAt || Date.now())
  const place = draft.documentPlace?.trim() || 'Hà Nội'
  const docDay = draft.documentDay ?? now.getDate()
  const docMonth = draft.documentMonth ?? now.getMonth() + 1
  const docYear = draft.documentYear ?? now.getFullYear()

  const chairName =
    draft.minutes.adminChairDisplayName?.trim() ||
    usersById.get(draft.chairId)?.name ||
    '................................'
  const secretaryName =
    draft.minutes.adminSecretaryDisplayName?.trim() ||
    usersById.get(draft.secretaryId)?.name ||
    '................................'

  const attendees =
    draft.minutes.adminAttendeesNote?.trim() ||
    draft.attendeeIds
      .map((id) => usersById.get(id)?.name)
      .filter((name): name is string => !!name)
      .join('; ') ||
    '................................................................................'

  const timeStart =
    draft.minutes.adminTimeStartNote?.trim() ||
    now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const meetingDate = `${String(now.getDate()).padStart(2, '0')}/${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}/${now.getFullYear()}`

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(draft.title)} - PDF</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    body { font-family: "Times New Roman", Times, serif; color: #111; font-size: 14px; line-height: 1.45; }
    .wrap { max-width: 190mm; margin: 0 auto; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .upper { text-transform: uppercase; }
    .mt8 { margin-top: 8px; }
    .mt12 { margin-top: 12px; }
    .mt16 { margin-top: 16px; }
    .indent { margin-left: 18px; }
    .indent2 { margin-left: 36px; }
    .line { margin: 6px 0; }
    .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; }
    .sign .col { text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">
    <div style="display:flex;justify-content:space-between;gap:24px">
      <div class="center" style="flex:1">
        <div class="bold upper">SỞ Y TẾ HÀ NỘI</div>
        <div class="bold upper">BV ĐA KHOA ĐỨC GIANG</div>
        <div class="mt8">Số: ${escapeHtml(draft.documentNumber ?? '....../BB-GB')}</div>
      </div>
      <div class="center" style="flex:1">
        <div class="bold upper">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class="bold">Độc lập - Tự do - Hạnh phúc</div>
        <div class="mt8">${escapeHtml(place)}, ngày ${docDay} tháng ${docMonth} năm ${docYear}</div>
      </div>
    </div>

    <div class="center mt16">
      <div class="bold upper" style="font-size:18px">BIÊN BẢN HỌP GIAO BAN LÃNH ĐẠO</div>
      <div class="mt8">(V/v: ${formatBlock(draft.minutes.matter)})</div>
    </div>

    <div class="mt16 bold upper">A. PHẦN HÀNH CHÍNH</div>
    <div class="line">- <span class="bold">Thời gian:</span> Bắt đầu lúc ${escapeHtml(timeStart)} ngày ${escapeHtml(meetingDate)}.</div>
    <div class="line">- <span class="bold">Địa điểm:</span> ${formatBlock(draft.minutes.adminLocation || draft.room)}</div>
    <div class="line">- <span class="bold">Chủ tọa:</span> ${formatBlock(chairName)} ${draft.minutes.adminChairPosition ? `- ${formatBlock(draft.minutes.adminChairPosition)}` : ''}</div>
    <div class="line">- <span class="bold">Thư ký:</span> ${formatBlock(secretaryName)} ${draft.minutes.adminSecretaryPosition ? `- ${formatBlock(draft.minutes.adminSecretaryPosition)}` : ''}</div>
    <div class="line">- <span class="bold">Thành phần tham dự:</span> ${formatBlock(attendees)}</div>
    <div class="line">- <span class="bold">Vắng mặt:</span> ${formatBlock(draft.minutes.adminAbsentNote)}</div>

    <div class="mt16 bold upper">B. NỘI DUNG BÁO CÁO</div>

    <div class="line bold">I. Báo cáo Thường trực Lãnh đạo</div>
    <div class="indent line">${formatBlock(draft.minutes.sectionI_leadershipShift)}</div>

    <div class="line bold">II. Báo cáo Thường trực Chuyên môn</div>
    <div class="indent line bold">1. Tình hình chung</div>
    <div class="indent2 line">- Thành phần phiên trực: ${formatBlock(draft.minutes.sectionII_shiftComposition)}</div>
    <div class="indent2 line">- Số người bệnh cũ: ${formatBlock(draft.minutes.sectionII_oldPatientCount)}</div>
    <div class="indent2 line">- Số người bệnh vào trong phiên trực: ${formatBlock(draft.minutes.sectionII_admittedInShift)}</div>
    <div class="indent2 line">- Số người bệnh ra trong phiên trực: ${formatBlock(draft.minutes.sectionII_leftInShift)}</div>
    <div class="indent2 line">- Số người bệnh hiện có: ${formatBlock(draft.minutes.sectionII_currentPatientCount)}</div>

    <div class="indent line bold">2. Nội dung cụ thể</div>
    <div class="indent2 line"><span class="bold">a) Người bệnh vào viện:</span> ${formatBlock(draft.minutes.sectionII_2a_admissions)}</div>
    <div class="indent2 line"><span class="bold">b) Người bệnh ra viện/chuyển viện/tử vong:</span></div>
    <div class="indent2 line">- Số tử vong: ${formatBlock(draft.minutes.sectionII_2b_deaths)}</div>
    <div class="indent2 line">- Số chuyển viện: ${formatBlock(draft.minutes.sectionII_2b_transfers)}</div>
    <div class="indent2 line">- Số ra viện: ${formatBlock(draft.minutes.sectionII_2b_discharges)}</div>
    <div class="indent2 line"><span class="bold">c) Diễn biến bất thường:</span> ${formatBlock(draft.minutes.sectionII_2c_abnormal)}</div>
    <div class="indent2 line">- Ý kiến đề xuất chuyên môn: ${formatBlock(draft.minutes.sectionII_2c_suggestions)}</div>

    <div class="line bold">III. Báo cáo Thường trực Cận lâm sàng</div>
    <div class="indent line">${formatBlock(draft.minutes.sectionIII_paraclinical)}</div>

    <div class="line bold">IV. Báo cáo Thường trực Hành chính - Bảo vệ</div>
    <div class="indent line">${formatBlock(draft.minutes.sectionIV_adminSecurity)}</div>

    <div class="line bold">V. Ý kiến thảo luận của các Lãnh đạo đơn vị</div>
    <div class="indent line">${formatBlock(draft.minutes.sectionV_unitDiscussion)}</div>

    <div class="mt16 bold upper">C. KẾT LUẬN CỦA CHỦ TỌA (Trưởng lab)</div>
    <div class="line">1. Về chuyên môn: ${formatBlock(draft.minutes.chairConclusionProfessional)}</div>
    <div class="line">2. Về hậu cần, hành chính: ${formatBlock(draft.minutes.chairConclusionLogistics)}</div>
    <div class="line">3. Lưu ý theo dõi người bệnh nặng (Chăm sóc cấp I): ${formatBlock(draft.minutes.chairConclusionLevel1Care)}</div>
    <div class="line">4. Các công việc trọng tâm trong ngày/tuần: ${formatBlock(draft.minutes.chairConclusionPriorityWork)}</div>

    <div class="line mt12">Cuộc họp kết thúc. Nội dung biên bản đã được thông qua và nhất trí.</div>

    <div class="sign">
      <div class="col">
        <div class="bold upper">THƯ KÝ</div>
        <div class="mt12">(Ký và ghi rõ họ tên)</div>
        <div class="mt16">${formatBlock(secretaryName)}</div>
      </div>
      <div class="col">
        <div class="bold upper">CHỦ TỌA</div>
        <div class="mt12">(Ký, đóng dấu và ghi rõ họ tên)</div>
        <div class="mt16">${formatBlock(chairName)}</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = () => {
      window.focus();
      setTimeout(() => window.print(), 150);
    };
  </script>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!printWindow) return false
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}

export function MeetingDetailPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const usersQuery = useUsersQuery()
  const users = useMemo(
    () => sortUsersByRoleThenName(usersQuery.data ?? []),
    [usersQuery.data],
  )

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
    onError: (e: Error & { code?: string }) => {
      const code = e.code || e.message
      if (code === 'FORBIDDEN_EDIT') {
        toast.error('Chỉ thư ký được sửa khi biên bản chưa duyệt')
      } else if (code === 'MEETING_ALREADY_APPROVED') {
        toast.error('Biên bản đã duyệt nên không thể chỉnh sửa')
      } else {
        toast.error(e.message || 'Không lưu được')
      }
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
    onError: (e: Error & { code?: string }) => {
      const code = e.code || e.message
      if (code === 'FORBIDDEN_APPROVE') {
        toast.error('Chỉ Trưởng lab được duyệt chốt biên bản')
      } else if (code === 'MEETING_ALREADY_APPROVED') {
        toast.error('Biên bản đã duyệt trước đó')
      } else {
        toast.error(e.message || 'Không duyệt được')
      }
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

  if (q.isLoading || usersQuery.isLoading) {
    return <p className="text-sm text-slate-500">Đang tải biên bản…</p>
  }

  if (q.isError || usersQuery.isError) {
    return <p className="text-sm text-red-600">Không tải được dữ liệu biên bản.</p>
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

  const uMap = new Map(users.map((u: User) => [u.id, u]))

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
            Nháp — chờ thư ký hoàn thiện & Trưởng lab duyệt
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
              {users
                .filter((u) =>
                  ['r-director', 'r-vice-director', 'r-dept-head'].includes(
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
              {users
                .filter(
                  (u) =>
                    u.role === 'r-staff' || u.role === 'r-dept-head',
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
          {uMap.get(draft.approvedById ?? '')?.name ?? 'Trưởng lab'}
        </p>
      )}

      <div className="sticky bottom-2 z-20 mt-8 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={() => {
            const ok = exportMeetingPdf(draft, uMap)
            if (!ok) {
              toast.error('Trình duyệt chặn popup. Hãy cho phép popup để in/xuất PDF.')
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow hover:bg-slate-50"
        >
          <FileDown className="size-4" />
          Xuất PDF (mẫu biên bản)
        </button>

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
            Trưởng lab duyệt & khóa
          </button>
        )}
      </div>
    </div>
  )
}
