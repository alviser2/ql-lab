import type { Task, TaskApprovalSource, TaskPriority, TaskTreeNode } from '@/types'
import { loadDb, mockLatency, saveDb } from '@/services/mockDb'

function genId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

export async function getTasks(): Promise<Task[]> {
  const db = loadDb()
  return mockLatency([...db.tasks])
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db = loadDb()
  const t = db.tasks.find((x) => x.id === id) ?? null
  return mockLatency(t, 180)
}

export async function getTaskTreeRoots(): Promise<Task[]> {
  const db = loadDb()
  const roots = db.tasks.filter((t) => t.parentId === null)
  return mockLatency(roots, 280)
}

export async function getChildTasks(parentId: string): Promise<Task[]> {
  const db = loadDb()
  const children = db.tasks.filter((t) => t.parentId === parentId)
  return mockLatency(children, 400)
}

export async function getTaskTreeFull(): Promise<TaskTreeNode[]> {
  const db = loadDb()
  const map = new Map<string, TaskTreeNode>()
  db.tasks.forEach((t) => map.set(t.id, { ...t, children: [] }))

  const roots: TaskTreeNode[] = []
  map.forEach((node) => {
    if (!node.parentId) {
      roots.push(node)
      return
    }
    const p = map.get(node.parentId)
    if (p) {
      if (!p.children) p.children = []
      p.children.push(node)
    }
  })

  function sortTree(nodes: TaskTreeNode[]) {
    nodes.sort((a, b) => a.title.localeCompare(b.title, 'vi'))
    nodes.forEach((n) => {
      if (n.children?.length) sortTree(n.children)
    })
  }
  sortTree(roots)
  return mockLatency(roots, 350)
}

export async function createTask(input: {
  title: string
  description?: string
  parentId: string | null
  departmentId: string
  assigneeId: string | null
  overseenByViceDirectorId: string | null
  createdById: string
  assignedById: string
  priority: TaskPriority
  deadline: string
  thuongTrucId?: string | null
  boPhanPhoiHopIds?: string[]
  phuongPhapLam?: string | null
  dukienKetQua?: string | null
}): Promise<Task> {
  const db = loadDb()
  const parent = input.parentId
    ? db.tasks.find((t) => t.id === input.parentId)
    : null
  if (parent && new Date(input.deadline) > new Date(parent.deadline)) {
    throw new Error('DEADLINE_AFTER_PARENT')
  }

  const task: Task = {
    id: genId('t'),
    title: input.title,
    description: input.description,
    status: 'NEW',
    priority: input.priority,
    parentId: input.parentId,
    assigneeId: input.assigneeId,
    departmentId: input.departmentId,
    overseenByViceDirectorId: input.overseenByViceDirectorId,
    createdById: input.createdById,
    assignedById: input.assignedById,
    pendingApprovalReviewerId: null,
    approvalSource: null,
    lastReportSummary: null,
    lastRejectionReason: null,
    deadline: input.deadline,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    thuongTrucId: input.thuongTrucId ?? null,
    boPhanPhoiHopIds: input.boPhanPhoiHopIds ?? [],
    phuongPhapLam: input.phuongPhapLam ?? null,
    dukienKetQua: input.dukienKetQua ?? null,
  }
  db.tasks.push(task)
  saveDb(db)
  return mockLatency(task, 400)
}

export async function submitTaskReport(
  taskId: string,
  actorId: string,
  summary: string,
): Promise<Task> {
  const db = loadDb()
  const idx = db.tasks.findIndex((t) => t.id === taskId)
  if (idx === -1) throw new Error('NOT_FOUND')
  const cur = db.tasks[idx]
  if (cur.assigneeId !== actorId) throw new Error('FORBIDDEN_NOT_ASSIGNEE')
  if (cur.status !== 'IN_PROGRESS' && cur.status !== 'NEW') {
    throw new Error('INVALID_FOR_REPORT')
  }
  const reviewer = cur.assignedById ?? cur.createdById
  if (!reviewer) throw new Error('NO_REVIEWER')
  const next: Task = {
    ...cur,
    status: 'PENDING_APPROVAL',
    pendingApprovalReviewerId: reviewer,
    approvalSource: 'assigner_report',
    lastReportSummary: summary.trim() || null,
    lastRejectionReason: null,
    updatedAt: new Date().toISOString(),
  }
  db.tasks[idx] = next
  saveDb(db)
  return mockLatency(next, 400)
}

export async function updateTask(
  id: string,
  patch: Partial<
    Pick<
      Task,
      | 'title'
      | 'description'
      | 'status'
      | 'priority'
      | 'assigneeId'
      | 'deadline'
      | 'parentId'
      | 'thuongTrucId'
      | 'boPhanPhoiHopIds'
      | 'phuongPhapLam'
      | 'dukienKetQua'
    >
  >,
): Promise<Task> {
  const db = loadDb()
  const idx = db.tasks.findIndex((t) => t.id === id)
  if (idx === -1) throw new Error('NOT_FOUND')
  const cur = db.tasks[idx]
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() }

  if (patch.deadline) {
    const parent = next.parentId
      ? db.tasks.find((t) => t.id === next.parentId)
      : null
    if (parent && new Date(next.deadline) > new Date(parent.deadline)) {
      throw new Error('DEADLINE_AFTER_PARENT')
    }
  }

  if (patch.status === 'COMPLETED') {
    if (cur.status === 'PENDING_APPROVAL' || cur.status === 'REJECTED') {
      throw new Error('INVALID_STATUS_FLOW')
    }
    const children = db.tasks.filter((t) => t.parentId === id)
    if (children.some((c) => c.status !== 'COMPLETED')) {
      throw new Error('CHILDREN_NOT_DONE')
    }
  }

  if (patch.status && patch.status !== 'PENDING_APPROVAL') {
    next.pendingApprovalReviewerId = null
    next.approvalSource = null
  }

  db.tasks[idx] = next
  saveDb(db)
  return mockLatency(next, 350)
}

export async function approveTask(
  id: string,
  approve: boolean,
  actorId: string,
  rejectionReason?: string,
): Promise<Task> {
  const db = loadDb()
  const idx = db.tasks.findIndex((t) => t.id === id)
  if (idx === -1) throw new Error('NOT_FOUND')
  const cur = db.tasks[idx]
  if (cur.status !== 'PENDING_APPROVAL') throw new Error('NOT_PENDING')
  if (cur.pendingApprovalReviewerId !== actorId) {
    throw new Error('FORBIDDEN_NOT_REVIEWER')
  }

  const src: TaskApprovalSource = cur.approvalSource ?? 'assigner_report'
  let next: Task

  if (approve) {
    next = {
      ...cur,
      status: 'COMPLETED',
      pendingApprovalReviewerId: null,
      approvalSource: null,
      lastRejectionReason: null,
      updatedAt: new Date().toISOString(),
    }
  } else if (src === 'vice_line') {
    next = {
      ...cur,
      status: 'REJECTED',
      pendingApprovalReviewerId: null,
      approvalSource: null,
      lastRejectionReason: rejectionReason?.trim() || 'Từ chối',
      updatedAt: new Date().toISOString(),
    }
  } else {
    next = {
      ...cur,
      status: 'IN_PROGRESS',
      pendingApprovalReviewerId: null,
      approvalSource: null,
      lastRejectionReason:
        rejectionReason?.trim() || 'Báo cáo bị từ chối — vui lòng chỉnh sửa và gửi lại.',
      updatedAt: new Date().toISOString(),
    }
  }

  db.tasks[idx] = next
  saveDb(db)
  return mockLatency(next, 400)
}

export async function assignTask(
  taskId: string,
  assigneeId: string | null,
  delegatedById?: string | null,
): Promise<Task> {
  const db = loadDb()
  const idx = db.tasks.findIndex((t) => t.id === taskId)
  if (idx === -1) throw new Error('NOT_FOUND')
  const cur = db.tasks[idx]
  db.tasks[idx] = {
    ...cur,
    assigneeId,
    assignedById:
      delegatedById != null && delegatedById !== ''
        ? delegatedById
        : cur.assignedById,
    updatedAt: new Date().toISOString(),
  }
  saveDb(db)
  return mockLatency(db.tasks[idx], 300)
}
