import type { Task, TaskStatus, User } from '@/types'

const roleRank: Record<User['role'], number> = {
  director: 4,
  vice_director: 3,
  department_head: 2,
  staff: 1,
}

export function canAssignTo(assigner: User, assignee: User): boolean {
  if (assigner.id === assignee.id) return true
  return roleRank[assigner.role] >= roleRank[assignee.role]
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
