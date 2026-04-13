import type { Task, User } from '@/types'

/** Nhân viên không được tạo việc con / tạo việc mới */
export function canCreateTask(user: User | null): boolean {
  if (!user) return false
  return user.role !== 'staff'
}

/** Việc cha chỉ chọn từ các task đang giao cho chính mình (GĐ/PGĐ/Trưởng khoa); GĐ xem toàn bộ */
export function eligibleParentTasks(user: User | null, tasks: Task[]): Task[] {
  if (!user || user.role === 'staff') return []
  if (user.role === 'director') return tasks
  return tasks.filter((t) => t.assigneeId === user.id)
}

export function childTasksFor(tasks: Task[], parentId: string): Task[] {
  return tasks.filter((x) => x.parentId === parentId)
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
