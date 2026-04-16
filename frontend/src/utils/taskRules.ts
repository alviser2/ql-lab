import type { Task, TaskStatus, User } from '@/types'

const roleRank: Record<User['role'], number> = {
  'r-director': 4,
  'r-vice-director': 3,
  'r-dept-head': 2,
  'r-staff': 1,
}

/**
 * Cho phép giao việc xuống cấp dưới
 * Hoặc cho phép Trưởng khoa giao việc lên PGĐ/GD (báo cáo/đề xuất)
 */
export function canAssignTo(assigner: User, assignee: User): boolean {
  if (assigner.id === assignee.id) return true
  
  const assignerRank = roleRank[assigner.role]
  const assigneeRank = roleRank[assignee.role]
  
  // Giao xuống cấp dưới (rank cao hơn giao cho rank thấp hơn)
  if (assignerRank > assigneeRank) return true
  
  // Trưởng khoa có thể giao việc lên PGĐ/GD (để báo cáo/lên cấp)
  if (assigner.role === 'r-dept-head' && assigneeRank >= roleRank['r-vice-director']) {
    return true
  }
  
  // PGĐ có thể giao việc lên GĐ
  if (assigner.role === 'r-vice-director' && assignee.role === 'r-director') {
    return true
  }
  
  return false
}

export function deadlineAfterParent(
  deadlineIso: string,
  parentDeadlineIso: string | null,
): boolean {
  if (!parentDeadlineIso) return true
  return new Date(deadlineIso).getTime() <= new Date(parentDeadlineIso).getTime()
}

export function canSetCompletedFromStatus(current: TaskStatus): boolean {
  if (current === 'PENDING_APPROVAL') return false
  if (current === 'REJECTED') return false
  return true
}

export function allChildrenCompletedOrEmpty(
  taskId: string,
  tasks: Task[],
): boolean {
  const children = tasks.filter((t) => t.parentId === taskId)
  if (children.length === 0) return true
  return children.every((c) => c.status === 'COMPLETED')
}

export function canMarkTaskComplete(task: Task, tasks: Task[]): boolean {
  if (!canSetCompletedFromStatus(task.status)) return false
  return allChildrenCompletedOrEmpty(task.id, tasks)
}
