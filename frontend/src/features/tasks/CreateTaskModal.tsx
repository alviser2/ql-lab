import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { TaskPriority, User } from '@/types'
import { Modal } from '@/components/Modal'
import { useAuthStore } from '@/store/authStore'
import { useUsersQuery } from '@/hooks/useUsersQuery'
import { useDepartmentsQuery } from '@/hooks/useDepartmentsQuery'
import { useTasksQuery } from '@/hooks/useTasksQuery'
import { canAssignTo, deadlineAfterParent } from '@/utils/taskRules'
import { canCreateTask } from '@/utils/taskHierarchy'
import { cn } from '@/utils/cn'
import * as taskService from '@/services/taskService'
import { sortUsersByRoleThenName } from '@/utils/userSort'

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 mb-2 text-xs font-semibold uppercase tracking-wider text-medical-700">
      {children}
    </p>
  )
}

function FieldLabel({
  label,
  children,
  required,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
      <div className="mt-1">{children}</div>
    </label>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-medical-500 focus:outline-none focus:ring-2 focus:ring-medical-200'

const selectCls =
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-medical-500 focus:outline-none focus:ring-2 focus:ring-medical-200'

const textareaCls =
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-medical-500 focus:outline-none focus:ring-2 focus:ring-medical-200 resize-none'

// ──────────────────────────────────────────────────────────
// Main modal
// ──────────────────────────────────────────────────────────

export function CreateTaskModal({
  open,
  onClose,
  defaultParentId,
}: {
  open: boolean
  onClose: () => void
  defaultParentId?: string | null
}) {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const tasksQuery = useTasksQuery()
  const tasks = tasksQuery.data ?? []
  const usersQuery = useUsersQuery()
  const departmentsQuery = useDepartmentsQuery()
  const users = usersQuery.data ?? []
  const departments = departmentsQuery.data ?? []

  // ── core fields ──────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [parentId, setParentId] = useState<string | null>(
    defaultParentId ?? null,
  )
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [deadline, setDeadline] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })

  // ── hierarchy fields ─────────────────────────────────────
  /** Khoa chính phụ trách */
  const [departmentId, setDepartmentId] = useState(user?.departmentId ?? '')
  /** Người được giao (PGĐ / Trưởng khoa / NV) */
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  /** Thường trực phụ trách */
  const [thuongTrucId, setThuongTrucId] = useState<string | null>(null)
  /** Bộ phận phối hợp (multi-select) */
  const [boPhanPhoiHopIds, setBoPhanPhoiHopIds] = useState<string[]>([])
  /** Phương pháp làm */
  const [phuongPhapLam, setPhuongPhapLam] = useState('')
  /** Dự kiến kết quả */
  const [dukienKetQua, setDukienKetQua] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── reset on open ────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setParentId(defaultParentId ?? null)
    setTitle('')
    setAssigneeId(null)
    setThuongTrucId(null)
    setBoPhanPhoiHopIds([])
    setPhuongPhapLam('')
    setDukienKetQua('')
    setIsSubmitting(false)
    setPriority('MEDIUM')
    const d = new Date()
    d.setDate(d.getDate() + 14)
    setDeadline(d.toISOString().slice(0, 10))

    const defaultDept = user?.departmentId ?? departments[0]?.id ?? ''
    setDepartmentId(defaultDept)
  }, [open, defaultParentId, user?.departmentId, departments])

  // ── derived ──────────────────────────────────────────────
  const parentOptions = useMemo(() => {
    if (!user || user.role === 'r-staff') return []
    if (user.role === 'r-director') return tasks
    if (user.role === 'r-vice-director') {
      // PGĐ thấy: việc được giao cho mình, việc trong khoa mình giám sát, hoặc việc mình giám sát
      const managedDepts = new Set(user.managedDepartmentIds ?? [])
      return tasks.filter(
        (t) =>
          t.assigneeId === user.id ||
          t.overseenByViceDirectorId === user.id ||
          (t.departmentId && managedDepts.has(t.departmentId)),
      )
    }
    // Trưởng khoa: thấy việc trong khoa mình
    return tasks.filter((t) => t.departmentId === user.departmentId)
  }, [tasks, user])

  const parent = useMemo(
    () => (parentId ? tasks.find((t) => t.id === parentId) : null),
    [parentId, tasks],
  )

  /** Candidates user có thể giao việc (1 cấp dưới) */
  const assignCandidates = useMemo<User[]>(() => {
    if (!user) return []
    return sortUsersByRoleThenName(
      users.filter((u) => u.id !== user.id && canAssignTo(user, u)),
    )
  }, [users, user])


  const assignee = assignCandidates.find((u) => u.id === assigneeId) ?? null
  const assignBlocked =
    assigneeId && assignee && user ? !canAssignTo(user, assignee) : false

  const deadlineInvalid =
    parent &&
    deadline &&
    !deadlineAfterParent(new Date(deadline).toISOString(), parent.deadline)

  // ── toggle bộ phận phối hợp ──────────────────────────────
  function toggleDept(deptId: string) {
    setBoPhanPhoiHopIds((prev) =>
      prev.includes(deptId) ? prev.filter((d) => d !== deptId) : [...prev, deptId],
    )
  }

  // ── submit ───────────────────────────────────────────────
  async function submit() {
    if (isSubmitting) return

    if (!user || !title.trim()) {
      toast.error('Nhập tiêu đề công việc')
      return
    }
    if (assignBlocked) {
      toast.error('Không được giao việc vượt cấp')
      return
    }
    if (deadlineInvalid) {
      toast.error('Hạn không được sau hạn công việc cha')
      return
    }

    setIsSubmitting(true)
    try {
      const idemKey =
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`

      await taskService.createTask(
        {
          title: title.trim(),
          parentId,
          departmentId,
          assigneeId,
          overseenByViceDirectorId: null,
          createdById: user.id,
          assignedById: user.id,
          priority,
          deadline: new Date(deadline).toISOString(),
          thuongTrucId: thuongTrucId || null,
          boPhanPhoiHopIds,
          phuongPhapLam: phuongPhapLam.trim() || null,
          dukienKetQua: dukienKetQua.trim() || null,
        },
        { idempotencyKey: idemKey },
      )
      await qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Đã tạo công việc')
      onClose()
    } catch (e) {
      const err = e as Error & { code?: string }
      const code = err.code || err.message
      if (code === 'DEADLINE_AFTER_PARENT') {
        toast.error('Hạn không được sau hạn công việc cha')
      } else {
        toast.error(err.message || 'Lỗi tạo việc')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── guard: staff không tạo việc ─────────────────────────
  if (open && user && !canCreateTask(user)) {
    return (
      <Modal open={open} onClose={onClose} title="Không thể tạo việc" size="sm">
        <p className="text-sm text-slate-600">
          <strong>Nhân viên</strong> không được tạo công việc con hoặc tạo việc
          mới — chỉ thực hiện và báo cáo việc được giao.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-slate-900 py-2 text-sm font-medium text-white"
        >
          Đóng
        </button>
      </Modal>
    )
  }

  // ── role label ───────────────────────────────────────────
  const assigneeLabel = (() => {
    if (!user) return 'Giao cho'
    if (user.role === 'r-director') return 'PGĐ phụ trách'
    if (user.role === 'r-vice-director') return 'Trưởng khoa nhận việc'
    return 'Nhân viên phụ trách'
  })()

  if (usersQuery.isLoading || departmentsQuery.isLoading) {
    return (
      <Modal open={open} onClose={onClose} title="Tạo công việc" size="sm">
        <p className="text-sm text-slate-600">Đang tải dữ liệu tạo công việc…</p>
      </Modal>
    )
  }

  if (usersQuery.isError || departmentsQuery.isError) {
    return (
      <Modal open={open} onClose={onClose} title="Tạo công việc" size="sm">
        <p className="text-sm text-red-600">Không tải được dữ liệu người dùng/khoa phòng.</p>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Tạo công việc" size="lg">
      <div className="space-y-5">
        {/* Info banner */}
        <p className="rounded-lg bg-medical-50 p-2.5 text-xs text-medical-900 ring-1 ring-medical-100">
          Việc cha chỉ chọn từ các công việc{' '}
          <strong>đang giao cho bạn</strong>{' '}
          (trừ Giám đốc: xem toàn bộ). Bạn đang tạo với vai trò{' '}
          <strong>
            {user?.title ??
              (user?.role === 'r-director'
                ? 'Giám đốc'
                : user?.role === 'r-vice-director'
                  ? 'Phó Giám đốc'
                  : user?.role === 'r-dept-head'
                    ? 'Trưởng khoa'
                    : 'Nhân viên')}
          </strong>
          .
        </p>

        {/* ── PHẦN A: Thông tin chung ── */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-4">
          <SectionTitle>A. Thông tin chung</SectionTitle>

          <FieldLabel label="Tiêu đề / Nội dung công việc" required>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Cắt bỏ thủ tục hành chính tại phòng khám"
            />
          </FieldLabel>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="Việc cha (tuỳ chọn)">
              <select
                className={selectCls}
                value={parentId ?? ''}
                onChange={(e) => setParentId(e.target.value || null)}
              >
                <option value="">— Không (việc gốc) —</option>
                {parentOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title.slice(0, 52)}
                  </option>
                ))}
              </select>
            </FieldLabel>

            <FieldLabel label="Ưu tiên">
              <select
                className={selectCls}
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn</option>
              </select>
            </FieldLabel>
          </div>

          <FieldLabel label="Hạn hoàn thành" required>
            <input
              type="date"
              className={cn(
                inputCls,
                deadlineInvalid
                  ? 'border-amber-400 ring-2 ring-amber-100'
                  : '',
              )}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            {parent && (
              <span className="mt-1 block text-xs text-slate-500">
                Hạn cha:{' '}
                <span className="font-medium">
                  {new Date(parent.deadline).toLocaleDateString('vi-VN')}
                </span>
              </span>
            )}
            {deadlineInvalid && (
              <span className="mt-1 block text-xs text-amber-800">
                Không được đặt hạn sau công việc cha.
              </span>
            )}
          </FieldLabel>
        </div>

        {/* ── PHẦN B: Phân công ── */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-4">
          <SectionTitle>B. Phân công thực hiện</SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Khoa chính */}
            <FieldLabel label="Khoa chính phụ trách" required>
              <select
                className={selectCls}
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value)
                  // clear phối hợp nếu chọn khoa mới
                  setBoPhanPhoiHopIds((prev) =>
                    prev.filter((id) => id !== e.target.value),
                  )
                }}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FieldLabel>

            {/* Người được giao (PGĐ / TK / NV) */}
            <FieldLabel label={assigneeLabel}>
              <select
                className={cn(
                  selectCls,
                  assignBlocked
                    ? 'border-amber-400 ring-2 ring-amber-100'
                    : '',
                )}
                value={assigneeId ?? ''}
                onChange={(e) => setAssigneeId(e.target.value || null)}
              >
                <option value="">— Chưa giao —</option>
                {assignCandidates.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.title ? ` (${u.title})` : ''}
                  </option>
                ))}
              </select>
              {assignBlocked && (
                <span className="mt-1 block text-xs text-amber-800">
                  Giao việc vượt cấp — chọn cấp thấp hơn.
                </span>
              )}
            </FieldLabel>
          </div>

          {/* Thường trực */}
          <FieldLabel label="Thường trực phụ trách">
            <select
              className={selectCls}
              value={thuongTrucId ?? ''}
              onChange={(e) => setThuongTrucId(e.target.value || null)}
            >
              <option value="">— Không chỉ định —</option>
              {assignCandidates
                .filter((u) => !assigneeId || u.id !== assigneeId)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.title ? ` (${u.title})` : ''}
                  </option>
                ))}
            </select>
          </FieldLabel>

          {/* Bộ phận phối hợp */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Bộ phận phối hợp{' '}
              <span className="text-xs text-slate-400">(chọn nhiều)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {departments
                .filter((d) => d.id !== departmentId)
                .map((d) => {
                  const checked = boPhanPhoiHopIds.includes(d.id)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDept(d.id)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition',
                        checked
                          ? 'border-medical-500 bg-medical-50 text-medical-800 ring-1 ring-medical-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-medical-300 hover:bg-medical-50',
                      )}
                    >
                      {checked ? '✓ ' : ''}{d.name}
                    </button>
                  )
                })}
              {departments.filter((d) => d.id !== departmentId).length ===
                0 && (
                <span className="text-xs text-slate-400">
                  Không có khoa khác để chọn.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── PHẦN C: Phương pháp & Kết quả ── */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-4">
          <SectionTitle>C. Phương pháp & Kết quả dự kiến</SectionTitle>

          <FieldLabel label="Phương pháp làm">
            <textarea
              className={textareaCls}
              rows={3}
              value={phuongPhapLam}
              onChange={(e) => setPhuongPhapLam(e.target.value)}
              placeholder="Mô tả cách thực hiện, các bước tiến hành…"
            />
          </FieldLabel>

          <FieldLabel label="Dự kiến kết quả">
            <textarea
              className={textareaCls}
              rows={3}
              value={dukienKetQua}
              onChange={(e) => setDukienKetQua(e.target.value)}
              placeholder="Kết quả mong đợi sau khi hoàn thành…"
            />
          </FieldLabel>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSubmitting || !title.trim() || !!deadlineInvalid || !!assignBlocked}
            className="rounded-xl bg-medical-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-medical-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Đang tạo...' : 'Tạo công việc'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
