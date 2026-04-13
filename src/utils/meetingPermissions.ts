import type { Meeting, User } from '@/types'

/** Chỉ Giám đốc & Phó Giám đốc được tạo lịch giao ban */
export function canScheduleMeeting(user: User): boolean {
  return user.role === 'director' || user.role === 'vice_director'
}

/** Thư ký được sửa toàn bộ biên bản khi chưa duyệt */
export function canEditMeetingDraft(user: User, meeting: Meeting): boolean {
  if (meeting.status !== 'draft') return false
  return user.id === meeting.secretaryId
}

/** Chỉ Giám đốc duyệt chốt biên bản */
export function canApproveMeeting(user: User, meeting: Meeting): boolean {
  return user.role === 'director' && meeting.status === 'draft'
}

export function meetingVisibleToUser(user: User, m: Meeting): boolean {
  if (user.role === 'director') return true
  if (user.role === 'vice_director') {
    if (m.departmentId == null) return true
    if (user.managedDepartmentIds?.includes(m.departmentId)) return true
    return (
      m.createdById === user.id ||
      m.secretaryId === user.id ||
      m.chairId === user.id ||
      (m.attendeeIds?.includes(user.id) ?? false)
    )
  }
  if (user.role === 'department_head') {
    if (m.departmentId === user.departmentId) return true
    return (
      m.chairId === user.id ||
      m.secretaryId === user.id ||
      (m.attendeeIds?.includes(user.id) ?? false)
    )
  }
  return (
    (m.attendeeIds?.includes(user.id) ?? false) ||
    m.secretaryId === user.id ||
    m.chairId === user.id
  )
}
