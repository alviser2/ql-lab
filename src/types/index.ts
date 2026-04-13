export type Role = 'director' | 'vice_director' | 'department_head' | 'staff'

export type TaskStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'COMPLETED'
  | 'REJECTED'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

/** assigner_report: chờ người giao duyệt báo cáo; vice_line: PGĐ */
export type TaskApprovalSource = 'assigner_report' | 'vice_line'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  /** Khoa trực thuộc (null với GĐ) */
  departmentId: string | null
  /** PGĐ: các khoa phụ trách */
  managedDepartmentIds?: string[]
  title?: string
}

export interface Department {
  id: string
  name: string
  code: string
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
  /** PGĐ giám sát / phụ trách nhánh */
  overseenByViceDirectorId: string | null
  createdById: string
  /** Người giao trực tiếp — duyệt báo cáo từ cấp dưới */
  assignedById: string | null
  pendingApprovalReviewerId: string | null
  approvalSource: TaskApprovalSource | null
  lastReportSummary: string | null
  lastRejectionReason: string | null
  deadline: string
  createdAt: string
  updatedAt: string
  /** Thường trực phụ trách (người trực tiếp thực hiện/giám sát tại cấp này) */
  thuongTrucId?: string | null
  /** Bộ phận phối hợp (nhiều khoa cùng thực hiện) */
  boPhanPhoiHopIds?: string[]
  /** Phương pháp thực hiện */
  phuongPhapLam?: string | null
  /** Dự kiến kết quả */
  dukienKetQua?: string | null
}

export type MeetingStatus = 'draft' | 'approved'

/** Nội dung biên bản theo mẫu Bệnh viện (A/B/C) — nhập tự do */
export interface MeetingMinutes {
  /** V/v: */
  matter?: string

  /** A — Hành chính (ghi chú thời gian nếu khác trường lịch hệ thống) */
  adminTimeStartNote?: string
  adminTimeEndNote?: string
  adminLocation?: string
  adminChairDisplayName?: string
  adminChairPosition?: string
  adminSecretaryDisplayName?: string
  adminSecretaryPosition?: string
  adminAttendeesNote?: string
  adminAbsentNote?: string

  /** B — I. Thường trực lãnh đạo */
  sectionI_leadershipShift?: string

  /** B — II. Thường trực chuyên môn */
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

  /** B — III, IV, V */
  sectionIII_paraclinical?: string
  sectionIV_adminSecurity?: string
  sectionV_unitDiscussion?: string

  /** C — Kết luận chủ tọa */
  chairConclusionProfessional?: string
  chairConclusionLogistics?: string
  chairConclusionLevel1Care?: string
  chairConclusionPriorityWork?: string
}

export interface Meeting {
  id: string
  /** Tiêu đề phiên (vd: Biên bản họp giao ban lãnh đạo) */
  title: string
  /** Số: .../BB-GB */
  documentNumber?: string
  /** Địa danh (vd: Thanh Hóa) */
  documentPlace?: string
  documentDay?: number
  documentMonth?: number
  documentYear?: number

  startAt: string
  endAt?: string | null
  room: string

  chairId: string
  /** Thư ký — được sửa biên bản trước khi GĐ duyệt */
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

export interface TaskTreeNode extends Task {
  children?: TaskTreeNode[]
}
