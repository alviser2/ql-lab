import type { Meeting, Role, Task, User } from '@/types'
import { meetingVisibleToUser } from '@/utils/meetingPermissions'

export function tasksVisibleForUser(user: User, tasks: Task[]): Task[] {
  if (user.role === 'director') return tasks

  if (user.role === 'vice_director') {
    const dept = new Set(user.managedDepartmentIds ?? [])
    return tasks.filter(
      (t) =>
        t.overseenByViceDirectorId === user.id ||
        dept.has(t.departmentId),
    )
  }

  if (user.role === 'department_head') {
    if (!user.departmentId) return []
    return tasks.filter((t) => t.departmentId === user.departmentId)
  }

  return tasks.filter((t) => t.assigneeId === user.id)
}

export function canAccessRoute(
  role: Role,
  allowed: readonly Role[] | 'all',
): boolean {
  if (allowed === 'all') return true
  return allowed.includes(role)
}

/** Gốc cây trong tập task đã lọc (cha không nằm trong tập → hiển thị như root) */
export function taskForestRoots(visible: Task[]): Task[] {
  const ids = new Set(visible.map((t) => t.id))
  return visible.filter((t) => !t.parentId || !ids.has(t.parentId))
}

export function meetingsVisibleForUser(
  user: User,
  meetings: Meeting[],
): Meeting[] {
  return meetings.filter((m) => meetingVisibleToUser(user, m))
}
