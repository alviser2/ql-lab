export type Role = 'r-director' | 'r-vice-director' | 'r-dept-head' | 'r-staff'

export type TaskStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'COMPLETED'
  | 'REJECTED'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type TaskApprovalSource = 'assigner_report' | 'vice_line'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  roleName?: string
  departmentId: string | null
  managedDepartmentIds?: string[]
  title?: string
}

export interface Department {
  id: string
  name: string
  code: string
  type?: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  parentId: string | null
  assigneeId: string | null
  departmentId: string
  overseenByViceDirectorId: string | null
  createdById: string
  assignedById: string | null
  pendingApprovalReviewerId: string | null
  approvalSource: TaskApprovalSource | null
  lastReportSummary: string | null
  lastRejectionReason: string | null
  deadline: string
  createdAt: string
  updatedAt: string
  started_at?: string | null
  completed_at?: string | null
  archived?: boolean
  archivedAt?: string | null
  archivedById?: string | null
  meeting_id?: string | null
  parent_task_id?: string | null
  monitor_id?: string | null
  result_note?: string | null

  // Enriched from backend
  creatorName?: string
  assigneeName?: string
  monitorName?: string
  overseerName?: string
  reviewerName?: string
  departmentName?: string
  meetingTitle?: string

  // Legacy frontend fields
  thuongTrucId?: string | null
  boPhanPhoiHopIds?: string[]
  phuongPhapLam?: string | null
  dukienKetQua?: string | null
}

export interface TaskTreeNode extends Task {
  children?: TaskTreeNode[]
}

export type MeetingStatus = 'draft' | 'approved'

export interface MeetingMinutes {
  matter?: string
  adminTimeStartNote?: string
  adminTimeEndNote?: string
  adminLocation?: string
  adminChairDisplayName?: string
  adminChairPosition?: string
  adminSecretaryDisplayName?: string
  adminSecretaryPosition?: string
  adminAttendeesNote?: string
  adminAbsentNote?: string
  sectionI_leadershipShift?: string
  sectionII_shiftComposition?: string
  sectionII_oldPatientCount?: string
  sectionII_admittedInShift?: string
  sectionII_leftInShift?: string
  sectionII_currentPatientCount?: string
  sectionII_2a_admissions?: string
  sectionII_2b_deaths?: string
  sectionII_2b_transfers?: string
  sectionII_2b_discharges?: string
  sectionII_2c_abnormal?: string
  sectionII_2c_suggestions?: string
  sectionIII_paraclinical?: string
  sectionIV_adminSecurity?: string
  sectionV_unitDiscussion?: string
  chairConclusionProfessional?: string
  chairConclusionLogistics?: string
  chairConclusionLevel1Care?: string
  chairConclusionPriorityWork?: string
}

export interface Meeting {
  id: string
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
  status: MeetingStatus
  approvedAt?: string | null
  approvedById?: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  minutes: MeetingMinutes
}
