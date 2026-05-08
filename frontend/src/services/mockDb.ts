import type { Department, Meeting, Task, User } from '@/types'

const STORAGE_KEY = 'ql-lab-mock-db-v1'

export interface MockDatabase {
  users: User[]
  departments: Department[]
  tasks: Task[]
  meetings: Meeting[]
}

const now = new Date()
const iso = (d: Date) => d.toISOString()
const daysFromNow = (n: number) => {
  const d = new Date(now)
  d.setDate(d.getDate() + n)
  return iso(d)
}
const daysAgo = (n: number) => {
  const d = new Date(now)
  d.setDate(d.getDate() - n)
  return iso(d)
}

export const SEED_DEPARTMENTS: Department[] = [
  { id: 'dept-noi', name: 'Dự án Nội tổng hợp', code: 'NOI' },
  { id: 'dept-ngoai', name: 'Dự án Ngoại chấn thương', code: 'NGOAI' },
  { id: 'dept-hscc', name: 'Dự án Hồi sức cấp cứu', code: 'HSCC' },
]

export const SEED_USERS: User[] = [
  {
    id: 'u-director',
    name: 'BS. Nguyễn Minh Đức',
    email: 'giamdoc@bv.mock',
    role: 'r-director',
    departmentId: null,
    title: 'Trưởng lab',
  },
  {
    id: 'u-vicedir',
    name: 'BS. Trần Thu Hà',
    email: 'pho.gd@bv.mock',
    role: 'r-vice-director',
    departmentId: null,
    managedDepartmentIds: ['dept-noi', 'dept-ngoai'],
    title: 'Thường trực (Key Member)',
  },
  {
    id: 'u-head-noi',
    name: 'BS. Lê Quang Huy',
    email: 'truongkhoa.noi@bv.mock',
    role: 'r-dept-head',
    departmentId: 'dept-noi',
    title: 'Leader dự án Nội',
  },
  {
    id: 'u-head-ngoai',
    name: 'BS. Phạm Đức An',
    email: 'truongkhoa.ngoai@bv.mock',
    role: 'r-dept-head',
    departmentId: 'dept-ngoai',
    title: 'Leader dự án Ngoại',
  },
  {
    id: 'u-staff-1',
    name: 'Điều dưỡng Mai Lan',
    email: 'dd.lan@bv.mock',
    role: 'r-staff',
    departmentId: 'dept-noi',
    title: 'Điều dưỡng',
  },
  {
    id: 'u-staff-2',
    name: 'NV. Hoàng Nam',
    email: 'nv.nam@bv.mock',
    role: 'r-staff',
    departmentId: 'dept-noi',
    title: 'Nhân viên hành chính',
  },
  {
    id: 'u-staff-3',
    name: 'KTV. Văn Thắng',
    email: 'ktv.thang@bv.mock',
    role: 'r-staff',
    departmentId: 'dept-ngoai',
    title: 'Kỹ thuật viên',
  },
]

export const SEED_TASKS: Task[] = [
  {
    id: 't-root-1',
    title: 'Chương trình cải tiến chất lượng Bệnh viện Q2',
    description: 'Theo chỉ đạo Bộ — phân rã theo dự án',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    parentId: null,
    assigneeId: 'u-vicedir',
    departmentId: 'dept-noi',
    overseenByViceDirectorId: 'u-vicedir',
    createdById: 'u-director',
    assignedById: 'u-director',
    pendingApprovalReviewerId: null,
    approvalSource: null,
    lastReportSummary: null,
    lastRejectionReason: null,
    deadline: daysFromNow(45),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
  },
  {
    id: 't-child-1',
    title: 'Rà soát quy trình tiếp nhận bệnh nhân nội trú',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    parentId: 't-root-1',
    assigneeId: 'u-head-noi',
    departmentId: 'dept-noi',
    overseenByViceDirectorId: 'u-vicedir',
    createdById: 'u-director',
    assignedById: 'u-vicedir',
    pendingApprovalReviewerId: null,
    approvalSource: null,
    lastReportSummary: null,
    lastRejectionReason: null,
    deadline: daysFromNow(20),
    createdAt: daysAgo(8),
    updatedAt: daysAgo(1),
  },
  {
    id: 't-child-2',
    title: 'Hoàn thiện biểu mẫu theo dõi giường bệnh',
    status: 'NEW',
    priority: 'MEDIUM',
    parentId: 't-child-1',
    assigneeId: 'u-staff-1',
    departmentId: 'dept-noi',
    overseenByViceDirectorId: 'u-vicedir',
    createdById: 'u-head-noi',
    assignedById: 'u-head-noi',
    pendingApprovalReviewerId: null,
    approvalSource: null,
    lastReportSummary: null,
    lastRejectionReason: null,
    deadline: daysFromNow(12),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: 't-child-3',
    title: 'Báo cáo KPI an toàn người bệnh tháng 4',
    status: 'PENDING_APPROVAL',
    priority: 'HIGH',
    parentId: 't-child-1',
    assigneeId: 'u-staff-2',
    departmentId: 'dept-noi',
    overseenByViceDirectorId: 'u-vicedir',
    createdById: 'u-head-noi',
    assignedById: 'u-head-noi',
    pendingApprovalReviewerId: 'u-head-noi',
    approvalSource: 'assigner_report',
    lastReportSummary:
      'Báo cáo KPI tháng 4: sự cố 0, tuân thủ checklist 98% — đề nghị duyệt.',
    lastRejectionReason: null,
    deadline: daysFromNow(5),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(0),
  },
  {
    id: 't-ngoai-1',
    title: 'Chuẩn bị phòng mổ ngày lễ',
    status: 'NEW',
    priority: 'URGENT',
    parentId: null,
    assigneeId: 'u-head-ngoai',
    departmentId: 'dept-ngoai',
    overseenByViceDirectorId: 'u-vicedir',
    createdById: 'u-vicedir',
    assignedById: 'u-vicedir',
    pendingApprovalReviewerId: null,
    approvalSource: null,
    lastReportSummary: null,
    lastRejectionReason: null,
    deadline: daysFromNow(7),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: 't-ngoai-2',
    title: 'Kiểm kê vật tư phẫu thuật',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    parentId: 't-ngoai-1',
    assigneeId: 'u-staff-3',
    departmentId: 'dept-ngoai',
    overseenByViceDirectorId: 'u-vicedir',
    createdById: 'u-head-ngoai',
    assignedById: 'u-head-ngoai',
    pendingApprovalReviewerId: null,
    approvalSource: null,
    lastReportSummary: null,
    lastRejectionReason: null,
    deadline: daysFromNow(4),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0),
  },
  {
    id: 't-done-1',
    title: 'Cập nhật danh mục thuốc dự án Nội',
    status: 'COMPLETED',
    priority: 'LOW',
    parentId: 't-child-1',
    assigneeId: 'u-staff-1',
    departmentId: 'dept-noi',
    overseenByViceDirectorId: 'u-vicedir',
    createdById: 'u-head-noi',
    assignedById: 'u-head-noi',
    pendingApprovalReviewerId: null,
    approvalSource: null,
    lastReportSummary: null,
    lastRejectionReason: null,
    deadline: daysAgo(2),
    createdAt: daysAgo(20),
    updatedAt: daysAgo(1),
  },
  {
    id: 't-reject-1',
    title: 'Đề xuất mua thiết bị monitoring',
    status: 'REJECTED',
    priority: 'MEDIUM',
    parentId: 't-root-1',
    assigneeId: 'u-head-noi',
    departmentId: 'dept-noi',
    overseenByViceDirectorId: 'u-vicedir',
    createdById: 'u-vicedir',
    assignedById: 'u-vicedir',
    pendingApprovalReviewerId: null,
    approvalSource: null,
    lastReportSummary: null,
    lastRejectionReason: null,
    deadline: daysFromNow(30),
    createdAt: daysAgo(15),
    updatedAt: daysAgo(4),
  },
  {
    id: 't-overdue-1',
    title: 'Hoàn tất hồ sơ thanh toán BHYT (quá hạn demo)',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    parentId: null,
    assigneeId: 'u-staff-2',
    departmentId: 'dept-noi',
    overseenByViceDirectorId: 'u-vicedir',
    createdById: 'u-head-noi',
    assignedById: 'u-head-noi',
    pendingApprovalReviewerId: null,
    approvalSource: null,
    lastReportSummary: null,
    lastRejectionReason: null,
    deadline: daysAgo(3),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },
  {
    id: 't-vice-pending-1',
    title: 'Hồ sơ trình Thường trực — mua sắm tập trung Q2',
    status: 'PENDING_APPROVAL',
    priority: 'HIGH',
    parentId: null,
    assigneeId: 'u-head-noi',
    departmentId: 'dept-noi',
    overseenByViceDirectorId: 'u-vicedir',
    createdById: 'u-head-noi',
    assignedById: 'u-head-noi',
    pendingApprovalReviewerId: 'u-vicedir',
    approvalSource: 'vice_line',
    lastReportSummary: 'Trình Thường trực phê duyệt phương án mua sắm.',
    lastRejectionReason: null,
    deadline: daysFromNow(10),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(0),
  },
]

export const SEED_MEETINGS: Meeting[] = [
  {
    id: 'm-1',
    title: 'Biên bản họp giao ban lãnh đạo',
    documentNumber: '....../BB-GB',
    documentPlace: 'Hà Nội',
    documentDay: 12,
    documentMonth: 4,
    documentYear: 2026,
    startAt: daysFromNow(1),
    endAt: null,
    room: 'Phòng họp Hội đồng – BV Đa khoa Đức Giang',
    chairId: 'u-director',
    secretaryId: 'u-staff-2',
    attendeeIds: ['u-vicedir', 'u-head-noi', 'u-head-ngoai'],
    departmentId: null,
    status: 'draft',
    approvedAt: null,
    approvedById: null,
    createdById: 'u-director',
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0),
    minutes: {
      matter:
        'Đánh giá hoạt động chuyên môn và triển khai công tác điều hành',
      adminAttendeesNote:
        'Ban Trưởng lab. Lãnh đạo các Dự án, Phòng, Đơn vị (có danh sách điểm danh kèm theo).',
      sectionI_leadershipShift:
        '(Thư ký nhập — Thường trực lãnh đạo: tình hình ANTT, phát sinh ca trực...)',
    },
  },
  {
    id: 'm-2',
    title: 'Biên bản họp dự án Nội',
    documentNumber: '....../BB-KNOI',
    documentPlace: 'Hà Nội',
    documentDay: 5,
    documentMonth: 4,
    documentYear: 2026,
    startAt: daysFromNow(2),
    endAt: null,
    room: 'Phòng họp dự án Nội',
    chairId: 'u-head-noi',
    secretaryId: 'u-staff-1',
    attendeeIds: ['u-staff-1', 'u-staff-2'],
    departmentId: 'dept-noi',
    status: 'approved',
    approvedAt: daysAgo(2),
    approvedById: 'u-director',
    createdById: 'u-head-noi',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(2),
    minutes: {
      matter: 'Sơ kết tuần — kế hoạch tuần tới',
      sectionII_currentPatientCount: '120',
      chairConclusionProfessional: 'Tiếp tục rà soát quy trình.',
    },
  },
]

function migrateTask(raw: unknown): Task {
  const t = raw as Partial<Task> & Record<string, unknown>
  const createdById = String(t.createdById ?? '')
  const assignedById =
    typeof t.assignedById === 'string' ? t.assignedById : createdById
  let pendingApprovalReviewerId: string | null = null
  let approvalSource: Task['approvalSource'] = null
  if (t.status === 'PENDING_APPROVAL') {
    pendingApprovalReviewerId =
      typeof t.pendingApprovalReviewerId === 'string'
        ? t.pendingApprovalReviewerId
        : 'u-vicedir'
    approvalSource =
      (t.approvalSource as Task['approvalSource']) ?? 'vice_line'
  }
  return {
    ...(t as Task),
    assignedById,
    pendingApprovalReviewerId,
    approvalSource,
    lastReportSummary:
      typeof t.lastReportSummary === 'string' ? t.lastReportSummary : null,
    lastRejectionReason:
      typeof t.lastRejectionReason === 'string' ? t.lastRejectionReason : null,
    thuongTrucId:
      typeof t.thuongTrucId === 'string' ? t.thuongTrucId : null,
    boPhanPhoiHopIds: Array.isArray(t.boPhanPhoiHopIds)
      ? (t.boPhanPhoiHopIds as string[])
      : [],
    phuongPhapLam:
      typeof t.phuongPhapLam === 'string' ? t.phuongPhapLam : null,
    dukienKetQua:
      typeof t.dukienKetQua === 'string' ? t.dukienKetQua : null,
  }
}

function migrateMeeting(raw: Record<string, unknown>): Meeting {
  if (
    raw.minutes &&
    typeof raw.minutes === 'object' &&
    typeof raw.secretaryId === 'string' &&
    (raw.status === 'draft' || raw.status === 'approved')
  ) {
    return raw as unknown as Meeting
  }
  const now = new Date().toISOString()
  const id = String(raw.id ?? '')
  return {
    id,
    title: String(raw.title ?? 'Giao ban'),
    documentPlace: 'Hà Nội',
    startAt: String(raw.startAt ?? now),
    endAt: null,
    room: String(raw.room ?? ''),
    chairId: String(raw.chairId ?? ''),
    secretaryId: 'u-staff-2',
    attendeeIds: Array.isArray(raw.attendeeIds)
      ? (raw.attendeeIds as string[])
      : [],
    departmentId: (raw.departmentId as string | null) ?? null,
    status: 'draft',
    approvedAt: null,
    approvedById: null,
    createdById: String(raw.chairId ?? 'u-director'),
    createdAt: now,
    updatedAt: now,
    minutes: {},
  }
}

function defaultDb(): MockDatabase {
  return {
    users: structuredClone(SEED_USERS),
    departments: structuredClone(SEED_DEPARTMENTS),
    tasks: structuredClone(SEED_TASKS),
    meetings: structuredClone(SEED_MEETINGS),
  }
}

export function loadDb(): MockDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const db = defaultDb()
      saveDb(db)
      return db
    }
    const parsed = JSON.parse(raw) as MockDatabase
    let migrated = false
    parsed.meetings = (parsed.meetings ?? []).map((m) => {
      const obj = m as unknown as Record<string, unknown>
      if (
        typeof obj.secretaryId !== 'string' ||
        typeof obj.minutes !== 'object' ||
        obj.minutes === null ||
        (obj.status !== 'draft' && obj.status !== 'approved')
      ) {
        migrated = true
        return migrateMeeting(obj)
      }
      return m as Meeting
    })
    parsed.tasks = (parsed.tasks ?? []).map((t) => {
      migrated = true
      return migrateTask(t)
    })
    if (migrated) saveDb(parsed)
    return parsed
  } catch {
    const db = defaultDb()
    saveDb(db)
    return db
  }
}

export function saveDb(db: MockDatabase) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function resetDb() {
  localStorage.removeItem(STORAGE_KEY)
  return loadDb()
}

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export async function mockLatency<T>(value: T, ms = 320): Promise<T> {
  return delay(ms, value)
}
