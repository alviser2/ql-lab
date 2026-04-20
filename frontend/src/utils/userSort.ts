import type { Role, User } from '@/types'
import type { AdminUser } from '@/types/admin'

const ROLE_ORDER: Record<Role, number> = {
  'r-director': 0,
  'r-vice-director': 1,
  'r-dept-head': 2,
  'r-staff': 3,
}

const collator = new Intl.Collator('vi', {
  sensitivity: 'base',
  numeric: true,
})

function compareRoleThenName(
  aRole: Role,
  aName: string,
  bRole: Role,
  bName: string,
) {
  const roleDiff = ROLE_ORDER[aRole] - ROLE_ORDER[bRole]
  if (roleDiff !== 0) return roleDiff
  return collator.compare(aName, bName)
}

export function sortUsersByRoleThenName(users: User[]): User[] {
  return [...users].sort((a, b) =>
    compareRoleThenName(a.role, a.name || '', b.role, b.name || ''),
  )
}

export function sortAdminUsersByRoleThenName(users: AdminUser[]): AdminUser[] {
  return [...users].sort((a, b) =>
    compareRoleThenName(
      a.role_id,
      a.full_name || a.username || '',
      b.role_id,
      b.full_name || b.username || '',
    ),
  )
}
