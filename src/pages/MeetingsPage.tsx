import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { meetingsVisibleForUser } from '@/utils/rbac'
import { canScheduleMeeting } from '@/utils/meetingPermissions'
import * as meetingService from '@/services/meetingService'
import { loadDb } from '@/services/mockDb'
import { MeetingsList } from '@/features/meetings/MeetingsList'
import { CreateMeetingModal } from '@/features/meetings/CreateMeetingModal'
import type { User } from '@/types'

export function MeetingsPage() {
  const user = useAuthStore((s) => s.user)
  const [createOpen, setCreateOpen] = useState(false)
  const q = useQuery({
    queryKey: ['meetings'],
    queryFn: meetingService.getMeetings,
  })

  const uMap = useMemo(() => {
    const db = loadDb()
    return new Map(db.users.map((u) => [u.id, u]))
  }, [])

  const list = useMemo(() => {
    if (!user || !q.data) return []
    return meetingsVisibleForUser(user, q.data)
  }, [q.data, user])

  if (!user) return null

  const canCreate = canScheduleMeeting(user)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          Lịch & biên bản giao ban
        </h1>
        {canCreate && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-xl bg-medical-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-medical-700"
          >
            + Tạo lịch giao ban
          </button>
        )}
      </div>
      <p className="text-sm text-slate-600">
        Chỉ <strong>Giám đốc</strong> và <strong>Phó Giám đốc</strong> tạo lịch.
        <strong> Thư ký</strong> được sửa biên bản khi trạng thái{' '}
        <em>nháp</em>; sau khi <strong>Giám đốc duyệt</strong> thì khóa chỉnh
        sửa.
      </p>
      {q.isLoading && (
        <p className="text-sm text-slate-500">Đang tải lịch…</p>
      )}
      {q.data && (
        <MeetingsList meetings={list} usersById={uMap as Map<string, User>} />
      )}
      <CreateMeetingModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
