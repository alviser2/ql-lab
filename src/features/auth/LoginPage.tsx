import { Navigate, useNavigate } from 'react-router-dom'
import { Building2, ChevronRight } from 'lucide-react'
import { loadDb } from '@/services/mockDb'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'
import { UserAvatar } from '@/components/UserAvatar'

const roleLabel: Record<User['role'], string> = {
  director: 'Giám đốc',
  vice_director: 'Phó Giám đốc',
  department_head: 'Trưởng khoa',
  staff: 'Nhân viên',
}

export function LoginPage() {
  const navigate = useNavigate()
  const setUserById = useAuthStore((s) => s.setUserById)
  const user = useAuthStore((s) => s.user)
  const db = loadDb()

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/60 bg-white/80 p-8 shadow-xl backdrop-blur-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-medical-600 text-white shadow-lg">
            <Building2 className="size-7" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Giao ban & Công việc
            </h1>
            <p className="text-sm text-slate-600">
              Chọn tài khoản demo để xem UI theo vai trò (RBAC)
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {db.users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => {
                  setUserById(u.id)
                  navigate('/', { replace: true })
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-medical-400 hover:shadow-md"
              >
                <UserAvatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    {u.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {roleLabel[u.role]} · {u.email}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-slate-400" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
