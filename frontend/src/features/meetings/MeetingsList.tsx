import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { ChevronRight, Lock, PencilLine } from 'lucide-react'
import type { Meeting, User } from '@/types'

export function MeetingsList({
  meetings,
  usersById,
}: {
  meetings: Meeting[]
  usersById: Map<string, User>
}) {
  if (!meetings.length) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-600">
        Không có lịch giao ban trong phạm vi bạn.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {meetings.map((m) => {
        const chair = usersById.get(m.chairId)
        const secretary = usersById.get(m.secretaryId)
        return (
          <li key={m.id}>
            <Link
              to={`/meetings/${m.id}`}
              className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition hover:border-medical-300 hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{m.title}</p>
                  {m.status === 'approved' ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-teal-900">
                      <Lock className="size-3" />
                      Đã duyệt
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-950">
                      <PencilLine className="size-3" />
                      Nháp
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {format(new Date(m.startAt), "EEEE dd/MM/yyyy HH:mm", {
                    locale: vi,
                  })}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {m.room} · Chủ trì: {chair?.name ?? m.chairId} · Thư ký:{' '}
                  {secretary?.name ?? m.secretaryId}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-slate-400" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
