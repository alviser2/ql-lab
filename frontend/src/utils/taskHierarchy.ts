import type { Task, User } from '@/types'

/** Nhân viên không được tạo việc con / tạo việc mới */
export function canCreateTask(user: User | null): boolean {
  if (!user) return false
  return user.role !== 'r-staff'
}

/** Việc cha chỉ chọn từ các task đang giao cho chính mình (Trưởng lab/Thường trực/Leader dự án); Trưởng lab xem toàn bộ */
export function eligibleParentTasks(user: User | null, tasks: Task[]): Task[] {
  if (!user || user.role === 'r-staff') return []
  if (user.role === 'r-director') return tasks
  return tasks.filter((t) => t.assigneeId === user.id)
}

export function childTasksFor(tasks: Task[], parentId: string): Task[] {
  return tasks.filter((x) => x.parentId === parentId)
}

/** Recursive: tất cả descendants phải COMPLETED thì cha mới được COMPLETE */
function _allDescendantsCompleted(taskId: string, tasks: Task[]): boolean {
  const children = childTasksFor(tasks, taskId)
  if (children.length === 0) return true
  return children.every(child => {
    if (child.status !== 'COMPLETED') return false
    return _allDescendantsCompleted(child.id, tasks)
  })
}

export function taskProgress(tasks: Task[], taskId: string): {
  childCount: number
  completedCount: number
  inProgressCount: number
  pendingReportCount: number
} {
  const children = childTasksFor(tasks, taskId)
  return {
    childCount: children.length,
    completedCount: children.filter((c) => c.status === 'COMPLETED').length,
    inProgressCount: children.filter((c) => c.status === 'IN_PROGRESS').length,
    pendingReportCount: children.filter((c) => c.status === 'PENDING_APPROVAL')
      .length,
  }
}

/** Task cha có thể đánh dấu COMPLETED khi TẤT CẢ descendants đều COMPLETED */
export function canMarkTaskComplete(task: Task, tasks: Task[]): boolean {
  if (task.status === 'PENDING_APPROVAL') return false
  if (task.status === 'REJECTED') return false
  if (task.status === 'COMPLETED') return false
  return _allDescendantsCompleted(task.id, tasks)
}
