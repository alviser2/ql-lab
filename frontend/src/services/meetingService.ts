import api from '@/lib/api'
import type { Meeting, MeetingMinutes, User } from '@/types'
import { canScheduleMeeting } from '@/utils/meetingPermissions'

function normalizeMeeting(m: any): Meeting {
  const parseNum = (val: unknown): number | undefined => {
    if (val == null || val === '') return undefined
    const n = Number(val)
    return Number.isFinite(n) ? n : undefined
  }
  return {
    id: m.id ?? '',
    title: m.title ?? '',
    // New: proper document fields
    documentNumber: m.document_number ?? m.documentNumber ?? undefined,
    documentPlace: m.document_place ?? m.documentPlace ?? undefined,
    documentDay: parseNum(m.document_day ?? m.documentDay),
    documentMonth: parseNum(m.document_month ?? m.documentMonth),
    documentYear: parseNum(m.document_year ?? m.documentYear),
    // New: start/end time
    startAt: m.meeting_date ?? m.startAt ?? '',
    endAt: m.end_time ?? m.endAt ?? null,
    room: m.location ?? m.room ?? '',
    chairId: m.chairperson_id ?? m.chairId ?? '',
    secretaryId: m.secretary_id ?? m.secretaryId ?? '',
    // Attendees
    attendeeIds: Array.isArray(m.attendeeIds)
      ? m.attendeeIds
      : Array.isArray(m.attendee_ids)
        ? m.attendee_ids
        : [],
    departmentId: m.department_id ?? m.departmentId ?? null,
    status: m.status ?? 'draft',
    approvedAt: m.approved_at ?? m.approvedAt ?? null,
    approvedById: m.approved_by_id ?? m.approvedById ?? null,
    createdById: m.created_by_id ?? m.createdById ?? '',
    createdAt: m.created_at ?? m.createdAt ?? new Date().toISOString(),
    updatedAt: m.updated_at ?? m.updatedAt ?? new Date().toISOString(),
    minutes: normalizeMinutes(m.minutes ?? {}),
  }
}

function normalizeMinutes(mm: any): MeetingMinutes {
  if (!mm || typeof mm !== 'object') return {}
  return {
    matter: mm.matter ?? mm.Matter ?? undefined,
    adminTimeStartNote: mm.admin_time_start ?? mm.adminTimeStartNote ?? undefined,
    adminTimeEndNote: mm.admin_time_end ?? mm.adminTimeEndNote ?? undefined,
    adminLocation: mm.admin_location ?? mm.adminLocation ?? undefined,
    adminChairDisplayName: mm.admin_chair_name ?? mm.adminChairDisplayName ?? undefined,
    adminChairPosition: mm.admin_chair_position ?? mm.adminChairPosition ?? undefined,
    adminSecretaryDisplayName: mm.admin_secretary_name ?? mm.adminSecretaryDisplayName ?? undefined,
    adminSecretaryPosition: mm.admin_secretary_position ?? mm.adminSecretaryPosition ?? undefined,
    adminAttendeesNote: mm.admin_attendees ?? mm.adminAttendeesNote ?? undefined,
    adminAbsentNote: mm.admin_absent ?? mm.adminAbsentNote ?? undefined,
    sectionI_leadershipShift: mm.section_I_leadership ?? mm.sectionI_leadershipShift ?? undefined,
    sectionII_shiftComposition: mm.section_II_shift ?? mm.sectionII_shiftComposition ?? undefined,
    sectionII_oldPatientCount: mm.section_II_old_patient ?? mm.sectionII_oldPatientCount ?? undefined,
    sectionII_admittedInShift: mm.section_II_admitted ?? mm.sectionII_admittedInShift ?? undefined,
    sectionII_leftInShift: mm.section_II_left ?? mm.sectionII_leftInShift ?? undefined,
    sectionII_currentPatientCount: mm.section_II_current ?? mm.sectionII_currentPatientCount ?? undefined,
    sectionII_2a_admissions: mm.section_II_2a ?? mm.sectionII_2a_admissions ?? undefined,
    sectionII_2b_deaths: mm.section_II_2b_deaths ?? mm.sectionII_2b_deaths ?? undefined,
    sectionII_2b_transfers: mm.section_II_2b_transfers ?? mm.sectionII_2b_transfers ?? undefined,
    sectionII_2b_discharges: mm.section_II_2b_discharges ?? mm.sectionII_2b_discharges ?? undefined,
    sectionII_2c_abnormal: mm.section_II_2c_abnormal ?? mm.sectionII_2c_abnormal ?? undefined,
    sectionII_2c_suggestions: mm.section_II_2c_suggestions ?? mm.sectionII_2c_suggestions ?? undefined,
    sectionIII_paraclinical: mm.section_III_paraclinical ?? mm.sectionIII_paraclinical ?? undefined,
    sectionIV_adminSecurity: mm.section_IV_admin_security ?? mm.sectionIV_adminSecurity ?? undefined,
    sectionV_unitDiscussion: mm.section_V_unit_discussion ?? mm.sectionV_unitDiscussion ?? undefined,
    chairConclusionProfessional: mm.chair_conclusion_professional ?? mm.chairConclusionProfessional ?? undefined,
    chairConclusionLogistics: mm.chair_conclusion_logistics ?? mm.chairConclusionLogistics ?? undefined,
    chairConclusionLevel1Care: mm.chair_conclusion_level1_care ?? mm.chairConclusionLevel1Care ?? undefined,
    chairConclusionPriorityWork: mm.chair_conclusion_priority ?? mm.chairConclusionPriorityWork ?? undefined,
  }
}

export async function getMeetings(): Promise<Meeting[]> {
  const res = await api.get('/meetings')
  return res.data.map(normalizeMeeting)
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
  const res = await api.get(`/meetings/${id}`)
  return normalizeMeeting(res.data)
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
  if (!canScheduleMeeting(actor)) throw new Error('FORBIDDEN_SCHEDULE')

  const res = await api.post('/meetings', {
    title: input.title,
    document_number: input.documentNumber,
    document_place: input.documentPlace,
    document_day: input.documentDay,
    document_month: input.documentMonth,
    document_year: input.documentYear,
    meeting_date: input.startAt,
    start_time: input.startAt ? input.startAt.split('T')[1]?.slice(0, 5) : null,
    end_time: input.endAt ? input.endAt.split('T')[1]?.slice(0, 5) : null,
    location: input.room,
    chairperson_id: input.chairId,
    secretary_id: input.secretaryId,
    department_id: input.departmentId,
    attendee_ids: input.attendeeIds,
  })

  return normalizeMeeting(res.data)
}

export async function updateMeeting(
  _actor: User,
  id: string,
  patch: Partial<Pick<Meeting,
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
  >> & { minutes?: Partial<MeetingMinutes>; content_raw?: string; conclusion?: string },
): Promise<Meeting> {
  const data: Record<string, unknown> = {}

  if (patch.title !== undefined) data.title = patch.title
  if (patch.documentNumber !== undefined) data.document_number = patch.documentNumber
  if (patch.documentPlace !== undefined) data.document_place = patch.documentPlace
  if (patch.documentDay !== undefined) data.document_day = patch.documentDay
  if (patch.documentMonth !== undefined) data.document_month = patch.documentMonth
  if (patch.documentYear !== undefined) data.document_year = patch.documentYear
  if (patch.startAt !== undefined) data.meeting_date = patch.startAt
  if (patch.endAt !== undefined) {
    data.end_time = patch.endAt
      ? (typeof patch.endAt === 'string' ? patch.endAt.split('T')[1]?.slice(0, 5) : patch.endAt)
      : null
  }
  if (patch.room !== undefined) data.location = patch.room
  if (patch.chairId !== undefined) data.chairperson_id = patch.chairId
  if (patch.secretaryId !== undefined) data.secretary_id = patch.secretaryId
  if (patch.attendeeIds !== undefined) data.attendee_ids = patch.attendeeIds
  if (patch.departmentId !== undefined) data.department_id = patch.departmentId
  if (patch.content_raw !== undefined) data.content_raw = patch.content_raw
  if (patch.conclusion !== undefined) data.conclusion = patch.conclusion
  if (patch.minutes !== undefined) data.minutes = patch.minutes

  const res = await api.patch(`/meetings/${id}`, data)
  return normalizeMeeting(res.data)
}

export async function approveMeeting(actor: User, id: string): Promise<Meeting> {
  if (actor.role !== 'r-director') throw new Error('FORBIDDEN_APPROVE')
  const res = await api.post(`/meetings/${id}/approve`, {})
  return normalizeMeeting(res.data)
}
