import type { Role } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { canAccessRoute } from '@/utils/rbac'

export function RoleGuard({
  allow,
  fallback,
  children,
}: {
  allow: readonly Role[] | 'all'
  fallback: React.ReactNode
  children: React.ReactNode
}) {
  const role = useAuthStore((s) => s.user?.role)
  if (!role || !canAccessRoute(role, allow)) return <>{fallback}</>
  return <>{children}</>
}
