export const roleRank = {
  'r-director': 4,
  'r-vice-director': 3,
  'r-dept-head': 2,
  'r-staff': 1,
}

export function canAssignByRole(assignerRole, assigneeRole) {
  return (roleRank[assignerRole] ?? 0) >= (roleRank[assigneeRole] ?? 0)
}
