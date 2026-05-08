import { useMemo, useState } from 'react'
import type { ApiError } from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  changeAdminUserPassword,
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUserActive,
  updateAdminUserRole,
} from '@/services/adminService'
import { useDepartmentsQuery } from '@/hooks/useDepartmentsQuery'
import { createDepartment, deleteDepartment } from '@/services/departmentService'
import { useAuthStore } from '@/store/authStore'
import type { Role } from '@/types'
import { Modal } from '@/components/Modal'
import type { AdminUser } from '@/types/admin'
import { sortAdminUsersByRoleThenName } from '@/utils/userSort'

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'r-director', label: 'Trưởng lab' },
  { value: 'r-vice-director', label: 'Thường trực (Key Member)' },
  { value: 'r-dept-head', label: 'Leader dự án' },
  { value: 'r-staff', label: 'Nhân viên' },
]

function parseErrorMessage(err: any): string {
  return err?.message || 'Có lỗi xảy ra'
}

export function AdminPage() {
  const me = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
    staleTime: 15_000,
  })

  const departmentsQuery = useDepartmentsQuery()
  const departments = departmentsQuery.data ?? []

  const [createOpen, setCreateOpen] = useState(false)
  const [createDepartmentOpen, setCreateDepartmentOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState<AdminUser | null>(null)
  const [roleOpen, setRoleOpen] = useState<AdminUser | null>(null)

  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState<Role>('r-staff')
  const [deptId, setDeptId] = useState<string>('')
  const [managedDeptIds, setManagedDeptIds] = useState<string[]>([])

  const [newPassword, setNewPassword] = useState('')

  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [newDepartmentCode, setNewDepartmentCode] = useState('')
  const [newDepartmentType, setNewDepartmentType] = useState<'LAM_SANG' | 'CAN_LAM_SANG' | 'HANH_CHINH'>('LAM_SANG')

  const [editRoleId, setEditRoleId] = useState<Role>('r-staff')
  const [editDeptId, setEditDeptId] = useState<string>('')
  const [editManagedDeptIds, setEditManagedDeptIds] = useState<string[]>([])

  const isDirector = me?.role === 'r-director'

  const refreshAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['admin-users'] }),
      qc.invalidateQueries({ queryKey: ['users'] }),
      qc.invalidateQueries({ queryKey: ['departments'] }),
    ])
  }

  const createMut = useMutation({
    mutationFn: createAdminUser,
    onSuccess: async () => {
      toast.success('Đã tạo tài khoản')
      setCreateOpen(false)
      setUsername('')
      setFullName('')
      setPassword('')
      setRoleId('r-staff')
      setDeptId('')
      setManagedDeptIds([])
      await refreshAll()
    },
    onError: (e) => toast.error(parseErrorMessage(e)),
  })

  const pwMut = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      changeAdminUserPassword(userId, password),
    onSuccess: async () => {
      toast.success('Đã đổi mật khẩu')
      setPasswordOpen(null)
      setNewPassword('')
      await refreshAll()
    },
    onError: (e) => toast.error(parseErrorMessage(e)),
  })

  const roleMut = useMutation({
    mutationFn: ({
      userId,
      role_id,
      dept_id,
      managed_department_ids,
    }: {
      userId: string
      role_id: Role
      dept_id?: string | null
      managed_department_ids?: string[]
    }) => updateAdminUserRole(userId, { role_id, dept_id, managed_department_ids }),
    onSuccess: async () => {
      toast.success('Đã cập nhật phân quyền')
      setRoleOpen(null)
      await refreshAll()
    },
    onError: (e) => toast.error(parseErrorMessage(e)),
  })

  const activeMut = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateAdminUserActive(userId, isActive),
    onSuccess: async (_, vars) => {
      toast.success(vars.isActive ? 'Đã mở tài khoản' : 'Đã khóa tài khoản')
      await refreshAll()
    },
    onError: (e) => toast.error(parseErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: ({ userId, force }: { userId: string; force?: boolean }) =>
      deleteAdminUser(userId, { force }),
  })

  const createDepartmentMut = useMutation({
    mutationFn: createDepartment,
    onSuccess: async () => {
      toast.success('Đã tạo dự án mới')
      setCreateDepartmentOpen(false)
      setNewDepartmentName('')
      setNewDepartmentCode('')
      setNewDepartmentType('LAM_SANG')
      await refreshAll()
    },
    onError: (e) => toast.error(parseErrorMessage(e)),
  })

  const deleteDepartmentMut = useMutation({
    mutationFn: ({ departmentId }: { departmentId: string }) => deleteDepartment(departmentId),
    onSuccess: async () => {
      toast.success('Đã xóa dự án')
      await refreshAll()
    },
    onError: (e) => toast.error(parseErrorMessage(e)),
  })

  const users = useMemo(
    () =>
      sortAdminUsersByRoleThenName(
        (usersQuery.data ?? []).filter((u) => {
          const uname = u.username.trim().toLowerCase()
          if (uname === 'admin') return false
          if (uname.includes('__deleted_')) return false
          return true
        }),
      ),
    [usersQuery.data],
  )

  if (!isDirector) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        Chỉ Trưởng lab mới có quyền vào trang quản trị tài khoản.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Quản trị tài khoản & phân quyền</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCreateDepartmentOpen(true)}
            className="rounded-xl border border-medical-300 bg-white px-4 py-2 text-sm font-semibold text-medical-700 hover:bg-medical-50"
          >
            + Tạo dự án
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-xl bg-medical-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-medical-700"
          >
            + Tạo tài khoản
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-600">
        Trang này cho phép tạo/xóa dự án, tạo user, đổi mật khẩu, đổi role/phân cấp, khóa/mở và xóa tài khoản.
      </p>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Quản lý dự án</h2>
          <span className="text-xs text-slate-500">Tổng: {departments.length} dự án</span>
        </div>

        {departmentsQuery.isLoading ? (
          <p className="text-sm text-slate-500">Đang tải danh sách dự án…</p>
        ) : departmentsQuery.isError ? (
          <p className="text-sm text-red-600">Không tải được danh sách dự án.</p>
        ) : departments.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có dự án nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Tên dự án</th>
                  <th className="px-3 py-2 text-left font-semibold">Mã dự án</th>
                  <th className="px-3 py-2 text-left font-semibold">Loại</th>
                  <th className="px-3 py-2 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-900">{d.name}</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{d.code}</td>
                    <td className="px-3 py-2 text-slate-700">{d.type || '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          onClick={() => {
                            const ok = window.confirm(`Xóa dự án ${d.name}?`)
                            if (!ok) return
                            deleteDepartmentMut.mutate({ departmentId: d.id })
                          }}
                          disabled={deleteDepartmentMut.isPending}
                        >
                          Xóa dự án
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {usersQuery.isLoading ? (
        <p className="text-sm text-slate-500">Đang tải danh sách tài khoản…</p>
      ) : usersQuery.isError ? (
        <p className="text-sm text-red-600">Không tải được danh sách tài khoản.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Username</th>
                <th className="px-3 py-2 text-left font-semibold">Họ tên</th>
                <th className="px-3 py-2 text-left font-semibold">Role</th>
                <th className="px-3 py-2 text-left font-semibold">Dự án</th>
                <th className="px-3 py-2 text-left font-semibold">Dự án phụ trách (Thường trực)</th>
                <th className="px-3 py-2 text-left font-semibold">Trạng thái</th>
                <th className="px-3 py-2 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-mono text-slate-800">{u.username}</td>
                  <td className="px-3 py-3 text-slate-900">{u.full_name}</td>
                  <td className="px-3 py-3 text-slate-700">{u.role_name || u.role_id}</td>
                  <td className="px-3 py-3 text-slate-700">{u.dept_name || '—'}</td>
                  <td className="px-3 py-3 text-slate-700">
                    {u.managed_department_ids?.length
                      ? u.managed_department_ids
                          .map((id) => departments.find((d) => d.id === id)?.name || id)
                          .join(', ')
                      : '—'}
                  </td>
                  <td className="px-3 py-3">
                    {u.is_active ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setRoleOpen(u)
                          setEditRoleId(u.role_id)
                          setEditDeptId(u.dept_id ?? '')
                          setEditManagedDeptIds(u.managed_department_ids ?? [])
                        }}
                      >
                        Phân quyền
                      </button>

                      <button
                        type="button"
                        className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                        onClick={() => {
                          setPasswordOpen(u)
                          setNewPassword('')
                        }}
                      >
                        Đổi mật khẩu
                      </button>

                      <button
                        type="button"
                        className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                        onClick={() =>
                          activeMut.mutate({
                            userId: u.id,
                            isActive: !u.is_active,
                          })
                        }
                        disabled={activeMut.isPending}
                      >
                        {u.is_active ? 'Khóa' : 'Mở'}
                      </button>

                      <button
                        type="button"
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        onClick={async () => {
                          const ok = window.confirm(
                            `Xóa tài khoản ${u.username}? (soft delete)`
                          )
                          if (!ok) return

                          try {
                            await deleteMut.mutateAsync({ userId: u.id })
                            toast.success('Đã xóa tài khoản')
                            await refreshAll()
                          } catch (err) {
                            const apiErr = err as ApiError
                            if (apiErr?.code === 'USER_HAS_ASSIGNED_TASKS') {
                              const taskCount = Number((apiErr.details as any)?.activeAssignedTaskCount || 0)
                              const proceed = window.confirm(
                                `Tài khoản này đang được giao ${taskCount} công việc chưa lưu trữ. Bạn có muốn tiếp tục xóa không?`,
                              )
                              if (!proceed) return

                              try {
                                await deleteMut.mutateAsync({ userId: u.id, force: true })
                                toast.success('Đã xóa tài khoản')
                                await refreshAll()
                              } catch (forceErr) {
                                toast.error(parseErrorMessage(forceErr))
                              }
                              return
                            }

                            toast.error(parseErrorMessage(apiErr))
                          }
                        }}
                        disabled={deleteMut.isPending || u.id === me?.id}
                        title={u.id === me?.id ? 'Không thể tự xóa tài khoản đang đăng nhập' : undefined}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createDepartmentOpen} onClose={() => setCreateDepartmentOpen(false)} title="Tạo dự án mới" size="md">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            createDepartmentMut.mutate({
              name: newDepartmentName.trim(),
              code: newDepartmentCode.trim().toUpperCase(),
              type: newDepartmentType,
            })
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Tên dự án</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Mã dự án</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 uppercase"
              value={newDepartmentCode}
              onChange={(e) => setNewDepartmentCode(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Loại dự án</span>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={newDepartmentType}
              onChange={(e) => setNewDepartmentType(e.target.value as 'LAM_SANG' | 'CAN_LAM_SANG' | 'HANH_CHINH')}
            >
              <option value="LAM_SANG">Lâm sàng</option>
              <option value="CAN_LAM_SANG">Cận lâm sàng</option>
              <option value="HANH_CHINH">Hành chính</option>
            </select>
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              onClick={() => setCreateDepartmentOpen(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-medical-600 px-4 py-2 text-sm font-semibold text-white hover:bg-medical-700 disabled:opacity-50"
              disabled={createDepartmentMut.isPending}
            >
              {createDepartmentMut.isPending ? 'Đang tạo...' : 'Tạo dự án'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo tài khoản" size="md">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            createMut.mutate({
              username: username.trim(),
              full_name: fullName.trim(),
              password,
              role_id: roleId,
              dept_id: roleId === 'r-dept-head' || roleId === 'r-staff' ? deptId || null : null,
              managed_department_ids: roleId === 'r-vice-director' ? managedDeptIds : [],
              is_active: true,
            })
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Username</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Họ tên</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Mật khẩu</span>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Role</span>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={roleId}
              onChange={(e) => {
                const v = e.target.value as Role
                setRoleId(v)
                if (v !== 'r-vice-director') setManagedDeptIds([])
                if (v !== 'r-dept-head' && v !== 'r-staff') setDeptId('')
              }}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {(roleId === 'r-dept-head' || roleId === 'r-staff') && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Dự án</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                required
              >
                <option value="">-- Chọn dự án --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {roleId === 'r-vice-director' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Dự án phụ trách</p>
              <div className="grid gap-2 md:grid-cols-2">
                {departments.map((d) => {
                  const checked = managedDeptIds.includes(d.id)
                  return (
                    <label key={d.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setManagedDeptIds((prev) => Array.from(new Set([...prev, d.id])))
                          } else {
                            setManagedDeptIds((prev) => prev.filter((id) => id !== d.id))
                          }
                        }}
                      />
                      <span>{d.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              onClick={() => setCreateOpen(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-medical-600 px-4 py-2 text-sm font-semibold text-white hover:bg-medical-700 disabled:opacity-50"
              disabled={createMut.isPending}
            >
              {createMut.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!passwordOpen}
        onClose={() => setPasswordOpen(null)}
        title={`Đổi mật khẩu: ${passwordOpen?.username ?? ''}`}
        size="sm"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!passwordOpen) return
            pwMut.mutate({ userId: passwordOpen.id, password: newPassword })
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Mật khẩu mới</span>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              onClick={() => setPasswordOpen(null)}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              disabled={pwMut.isPending}
            >
              {pwMut.isPending ? 'Đang lưu...' : 'Lưu mật khẩu'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!roleOpen}
        onClose={() => setRoleOpen(null)}
        title={`Phân quyền: ${roleOpen?.username ?? ''}`}
        size="md"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!roleOpen) return
            roleMut.mutate({
              userId: roleOpen.id,
              role_id: editRoleId,
              dept_id: editRoleId === 'r-dept-head' || editRoleId === 'r-staff' ? editDeptId || null : null,
              managed_department_ids: editRoleId === 'r-vice-director' ? editManagedDeptIds : [],
            })
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Role</span>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={editRoleId}
              onChange={(e) => {
                const v = e.target.value as Role
                setEditRoleId(v)
                if (v !== 'r-vice-director') setEditManagedDeptIds([])
                if (v !== 'r-dept-head' && v !== 'r-staff') setEditDeptId('')
              }}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {(editRoleId === 'r-dept-head' || editRoleId === 'r-staff') && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Dự án</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                value={editDeptId}
                onChange={(e) => setEditDeptId(e.target.value)}
                required
              >
                <option value="">-- Chọn dự án --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {editRoleId === 'r-vice-director' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Dự án phụ trách</p>
              <div className="grid gap-2 md:grid-cols-2">
                {departments.map((d) => {
                  const checked = editManagedDeptIds.includes(d.id)
                  return (
                    <label key={d.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditManagedDeptIds((prev) => Array.from(new Set([...prev, d.id])))
                          } else {
                            setEditManagedDeptIds((prev) => prev.filter((id) => id !== d.id))
                          }
                        }}
                      />
                      <span>{d.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              onClick={() => setRoleOpen(null)}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={roleMut.isPending}
            >
              {roleMut.isPending ? 'Đang lưu...' : 'Lưu phân quyền'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
