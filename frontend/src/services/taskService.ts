import api from '@/lib/api'
import type { Task, TaskPriority, TaskTreeNode } from '@/types'

export type TaskHistoryPurgeResult = {
  ok: boolean
  mode: 'single' | 'month' | 'all'
  deletedCount: number
  rootTaskId?: string
  year?: number
  month?: number
}

// ── Normalizers ─────────────────────────────────────────────

function normalizeTask(t: any): Task {
  return {
    id: t.id ?? '',
    title: t.title ?? '',
    description: t.description ?? undefined,
    status: t.status ?? 'NEW',
    priority: t.priority ?? 'MEDIUM',
    // Support both backend snake_case and frontend camelCase
    parentId: t.parent_task_id ?? t.parentId ?? null,
    assigneeId: t.assignee_id ?? t.assigneeId ?? null,
    departmentId: t.department_id ?? t.departmentId ?? '',
    overseenByViceDirectorId: t.overseen_by_vice_director_id ?? t.overseenByViceDirectorId ?? null,
    createdById: t.creator_id ?? t.createdById ?? '',
    assignedById: t.assigned_by_id ?? t.assignedById ?? null,
    pendingApprovalReviewerId: t.pending_approval_reviewer_id ?? t.pendingApprovalReviewerId ?? null,
    approvalSource: t.approval_source ?? t.approvalSource ?? null,
    // report_summary and extended_note are SEPARATE fields now
    lastReportSummary: t.report_summary ?? t.lastReportSummary ?? null,
    lastRejectionReason: t.last_rejection_reason ?? t.lastRejectionReason ?? null,
    deadline: t.deadline ?? '',
    createdAt: t.created_at ?? t.createdAt ?? new Date().toISOString(),
    updatedAt: t.updated_at ?? t.updatedAt ?? new Date().toISOString(),
    started_at: t.started_at ?? t.started_at ?? null,
    completed_at: t.completed_at ?? t.completed_at ?? null,
    archived: Number(t.archived ?? 0) === 1 || t.archived === true,
    archivedAt: t.archived_at ?? t.archivedAt ?? null,
    archivedById: t.archived_by_id ?? t.archivedById ?? null,
    meeting_id: t.meeting_id ?? t.meetingId ?? null,
    parent_task_id: t.parent_task_id ?? t.parentId ?? null,
    monitor_id: t.monitor_id ?? t.monitorId ?? null,
    // extended_note stores: thuong_truc + bo_phan_phoi + phuong_phap + dukien
    result_note: t.extended_note ?? t.result_note ?? null,
    // Enriched names
    creatorName: t.creatorName ?? t.creator_name ?? null,
    assigneeName: t.assigneeName ?? t.assignee_name ?? null,
    monitorName: t.monitorName ?? t.monitor_name ?? null,
    overseerName: t.overseerName ?? t.overseer_name ?? null,
    reviewerName: t.reviewerName ?? t.reviewer_name ?? null,
    departmentName: t.departmentName ?? t.department_name ?? null,
    meetingTitle: t.meetingTitle ?? t.meeting_title ?? null,
    // Legacy extended fields (parsed from extended_note if present as single string)
    thuongTrucId: t.thuongTrucId ?? null,
    boPhanPhoiHopIds: t.boPhanPhoiHopIds ?? [],
    phuongPhapLam: t.phuongPhapLam ?? null,
    dukienKetQua: t.dukienKetQua ?? null,
  }
}

function normalizeTree(t: any): TaskTreeNode {
  return {
    ...normalizeTask(t),
    children: (t.children ?? []).map(normalizeTree),
  }
}

// ── API functions ───────────────────────────────────────────

export async function getTasks(options?: {
  includeArchived?: boolean
  onlyArchived?: boolean
}): Promise<Task[]> {
  const params: Record<string, string> = {}
  if (options?.includeArchived) params.include_archived = '1'
  if (options?.onlyArchived) params.only_archived = '1'
  const res = await api.get('/tasks', { params })
  return res.data.map(normalizeTask)
}

export async function getTaskById(id: string): Promise<Task | null> {
  const res = await api.get(`/tasks/${id}`)
  return normalizeTask(res.data)
}

export async function getTaskTreeFull(): Promise<TaskTreeNode[]> {
  const res = await api.get('/tasks/tree')
  return res.data.map(normalizeTree)
}

export async function getTaskHistory(): Promise<Task[]> {
  const res = await api.get('/tasks/history')
  return res.data.map(normalizeTask)
}

export async function createTask(
  input: {
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
  },
  options?: { idempotencyKey?: string },
): Promise<Task> {
  const res = await api.post(
    '/tasks',
    {
      title: input.title,
      description: input.description,
      meeting_id: null,
      parent_task_id: input.parentId,
      department_id: input.departmentId,
      priority: input.priority,
      assignee_id: input.assigneeId,
      monitor_id: input.thuongTrucId || null,
      deadline: input.deadline,
      thuong_truc_id: input.thuongTrucId,
      bo_phan_phoi_hop_ids: input.boPhanPhoiHopIds,
      phuong_phap_lam: input.phuongPhapLam,
      dukien_ket_qua: input.dukienKetQua,
    },
    {
      headers: options?.idempotencyKey
        ? { 'x-idempotency-key': options.idempotencyKey }
        : undefined,
    },
  )
  return normalizeTask(res.data)
}

export async function submitTaskReport(
  taskId: string,
  summary: string,
): Promise<Task> {
  const res = await api.post(`/tasks/${taskId}/report`, { summary })
  return normalizeTask(res.data)
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'deadline' | 'parentId'>>,
): Promise<Task> {
  const data: Record<string, unknown> = {}
  if (patch.title !== undefined) data.title = patch.title
  if (patch.description !== undefined) data.description = patch.description
  if (patch.status !== undefined) data.status = patch.status
  if (patch.priority !== undefined) data.priority = patch.priority
  if (patch.deadline !== undefined) data.deadline = patch.deadline
  if (patch.parentId !== undefined) data.parent_task_id = patch.parentId

  const res = await api.patch(`/tasks/${id}`, data)
  return normalizeTask(res.data)
}

export async function approveTask(
  id: string,
  approve: boolean,
  rejectionReason?: string,
): Promise<Task> {
  const res = await api.post(`/tasks/${id}/approve`, {
    approve,
    rejection_reason: rejectionReason,
  })
  return normalizeTask(res.data)
}

export async function assignTask(
  taskId: string,
  assigneeId: string | null,
): Promise<Task> {
  const res = await api.post(`/tasks/${taskId}/assign`, {
    assignee_id: assigneeId,
  })
  return normalizeTask(res.data)
}

export async function deleteHistoryTask(taskId: string): Promise<TaskHistoryPurgeResult> {
  const res = await api.delete(`/tasks/history/${taskId}`)
  return res.data as TaskHistoryPurgeResult
}

export async function purgeHistoryByMonth(
  year: number,
  month: number,
): Promise<TaskHistoryPurgeResult> {
  const res = await api.delete('/tasks/history', {
    params: {
      mode: 'month',
      year,
      month,
    },
  })
  return res.data as TaskHistoryPurgeResult
}

export async function purgeAllHistory(): Promise<TaskHistoryPurgeResult> {
  const res = await api.delete('/tasks/history', {
    params: {
      mode: 'all',
    },
  })
  return res.data as TaskHistoryPurgeResult
}
