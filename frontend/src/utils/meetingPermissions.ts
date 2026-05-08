import type { Meeting, User } from '@/types'

/** Chỉ Trưởng lab & Thường trực (Key Member) được tạo lịch giao ban */
export function canScheduleMeeting(user: User): boolean {
  return user.role === 'r-director' || user.role === 'r-vice-director'
}

/**
 * Thư ký được sửa toàn bộ biên bản khi chưa duyệt.
 * Backend gửi `attendeeIds` là array sau khi normalize.
 */
export function canEditMeetingDraft(user: User, meeting: Meeting): boolean {
  if (meeting.status !== 'draft') return false
  return user.id === meeting.secretaryId
}

/** Chỉ Trưởng lab duyệt chốt biên bản */
export function canApproveMeeting(user: User, meeting: Meeting): boolean {
  return user.role === 'r-director' && meeting.status === 'draft'
}

/**
 * Ai được xem cuộc họp.
 * - Trưởng lab: xem tất cả
 * - Thường trực: xem họp toàn viện, hoặc dự án mình giám sát, hoặc có trong ds tham dự
 * - TK: xem dự án mình, hoặc có trong ds tham dự
 * - NV: chỉ xem nếu là thư ký / chủ trì / có trong ds tham dự
 */
export function meetingVisibleToUser(user: User, m: Meeting): boolean {
  if (user.role === 'r-director') return true

  const attendeeIds = Array.isArray(m.attendeeIds) ? m.attendeeIds : []

  if (user.role === 'r-vice-director') {
    // Toàn viện
    if (m.departmentId == null) return true
    // Trong dự án Thường trực giám sát
    if (user.managedDepartmentIds?.includes(m.departmentId)) return true
    // Người tham gia
    if (m.createdById === user.id) return true
    if (m.secretaryId === user.id) return true
    if (m.chairId === user.id) return true
    if (attendeeIds.includes(user.id)) return true
    return false
  }

  if (user.role === 'r-dept-head') {
    if (m.departmentId === user.departmentId) return true
    if (m.chairId === user.id) return true
    if (m.secretaryId === user.id) return true
    if (attendeeIds.includes(user.id)) return true
    return false
  }

  // staff
  if (m.secretaryId === user.id) return true
  if (m.chairId === user.id) return true
  if (attendeeIds.includes(user.id)) return true
  return false
}
