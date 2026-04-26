import type { Meeting, Role, Task, User } from '@/types'
import { meetingVisibleToUser } from '@/utils/meetingPermissions'

export function tasksVisibleForUser(
  user: User,
  tasks: Task[],
  options?: { includeArchived?: boolean },
): Task[] {
  const scopedTasks = options?.includeArchived
    ? tasks
    : tasks.filter((t) => !t.archived)

  // Director and Vice-director can see all scoped tasks
  if (user.role === 'r-director' || user.role === 'r-vice-director') {
    return scopedTasks
  }

  if (user.role === 'r-dept-head') {
    return scopedTasks.filter(
      (t) =>
        (user.departmentId ? t.departmentId === user.departmentId : false) ||
        t.assigneeId === user.id ||
        t.createdById === user.id,
    )
  }

  return scopedTasks.filter((t) => t.assigneeId === user.id)
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
