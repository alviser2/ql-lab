import type { Meeting, MeetingMinutes, User } from '@/types'
import { loadDb, mockLatency, saveDb } from '@/services/mockDb'
import {
  canApproveMeeting,
  canEditMeetingDraft,
  canScheduleMeeting,
} from '@/utils/meetingPermissions'

function genId() {
  return `m-${crypto.randomUUID().slice(0, 10)}`
}

export async function getMeetings(): Promise<Meeting[]> {
  const db = loadDb()
  return mockLatency(
    [...db.meetings].sort(
      (a, b) =>
        new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    ),
  )
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
  const db = loadDb()
  const m = db.meetings.find((x) => x.id === id) ?? null
  return mockLatency(m, 200)
}

export async function createMeeting(
  actor: User,
  input: {
    title: string
    documentNumber?: string
    documentPlace?: string
    documentDay?: number
    documentMonth?: number
    documentYear?: number
    startAt: string
    endAt?: string | null
    room: string
    chairId: string
    secretaryId: string
    attendeeIds: string[]
    departmentId: string | null
  },
): Promise<Meeting> {
  if (!canScheduleMeeting(actor)) {
    throw new Error('FORBIDDEN_SCHEDULE')
  }
  const db = loadDb()
  const now = new Date().toISOString()
  const meeting: Meeting = {
    id: genId(),
    title: input.title.trim(),
    documentNumber: input.documentNumber?.trim() || undefined,
    documentPlace: input.documentPlace?.trim() || undefined,
    documentDay: input.documentDay,
    documentMonth: input.documentMonth,
    documentYear: input.documentYear,
    startAt: input.startAt,
    endAt: input.endAt ?? null,
    room: input.room.trim(),
    chairId: input.chairId,
    secretaryId: input.secretaryId,
    attendeeIds: [...new Set(input.attendeeIds)],
    departmentId: input.departmentId,
    status: 'draft',
    approvedAt: null,
    approvedById: null,
    createdById: actor.id,
    createdAt: now,
    updatedAt: now,
    minutes: {},
  }
  db.meetings.push(meeting)
  saveDb(db)
  return mockLatency(meeting, 400)
}

export async function updateMeeting(
  actor: User,
  id: string,
  patch: Partial<
    Pick<
      Meeting,
      | 'title'
      | 'documentNumber'
      | 'documentPlace'
      | 'documentDay'
      | 'documentMonth'
      | 'documentYear'
      | 'startAt'
      | 'endAt'
      | 'room'
      | 'chairId'
      | 'secretaryId'
      | 'attendeeIds'
      | 'departmentId'
    >
  > & { minutes?: Partial<MeetingMinutes> },
): Promise<Meeting> {
  const db = loadDb()
  const idx = db.meetings.findIndex((x) => x.id === id)
  if (idx === -1) throw new Error('NOT_FOUND')
  const cur = db.meetings[idx]
  if (!canEditMeetingDraft(actor, cur)) {
    throw new Error('FORBIDDEN_EDIT')
  }
  const next: Meeting = {
    ...cur,
    ...patch,
    attendeeIds: patch.attendeeIds
      ? [...new Set(patch.attendeeIds)]
      : cur.attendeeIds,
    minutes: patch.minutes
      ? { ...cur.minutes, ...patch.minutes }
      : cur.minutes,
    updatedAt: new Date().toISOString(),
  }
  db.meetings[idx] = next
  saveDb(db)
  return mockLatency(next, 380)
}

export async function approveMeeting(actor: User, id: string): Promise<Meeting> {
  const db = loadDb()
  const idx = db.meetings.findIndex((x) => x.id === id)
  if (idx === -1) throw new Error('NOT_FOUND')
  const cur = db.meetings[idx]
  if (!canApproveMeeting(actor, cur)) {
    throw new Error('FORBIDDEN_APPROVE')
  }
  const next: Meeting = {
    ...cur,
    status: 'approved',
    approvedAt: new Date().toISOString(),
    approvedById: actor.id,
    updatedAt: new Date().toISOString(),
  }
  db.meetings[idx] = next
  saveDb(db)
  return mockLatency(next, 400)
}
