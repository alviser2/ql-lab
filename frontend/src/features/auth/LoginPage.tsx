import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Building2, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Nhập username và password')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', { username, password })
      const { token, user: userData } = res.data
      localStorage.setItem('giao-ban-token', token)
      setUser(userData)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-medical-50 to-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-medical-600 text-white shadow-lg">
            <Building2 className="size-7" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Giao ban Bệnh viện</h1>
            <p className="text-sm text-slate-600">Đăng nhập để tiếp tục</p>
          </div>
        </div>

        <form onSubmit={e => void handleSubmit(e)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="director, vicedir, tk_noi..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 shadow-sm focus:border-medical-500 focus:outline-none focus:ring-2 focus:ring-medical-200"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 shadow-sm focus:border-medical-500 focus:outline-none focus:ring-2 focus:ring-medical-200"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-medical-600 py-3 text-base font-semibold text-white shadow hover:bg-medical-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="size-5 animate-spin" />}
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>

          <p className="text-center text-xs text-slate-500">
            Quên mật khẩu? Liên hệ quản trị viên
          </p>
        </form>

      </div>
    </div>
  )
}
