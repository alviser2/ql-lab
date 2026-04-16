import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import type { Task, TaskStatus, User } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { canAssignTo, canSetCompletedFromStatus } from '@/utils/taskRules'
import { taskProgress, canMarkTaskComplete } from '@/utils/taskHierarchy'
import { Drawer } from '@/components/Drawer'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityTag } from '@/components/PriorityTag'
import { DeadlineBadge } from '@/components/DeadlineBadge'
import { UserAvatar } from '@/components/UserAvatar'
import * as taskService from '@/services/taskService'
import { useQueryClient } from '@tanstack/react-query'

import { QuickReportModal } from '@/features/tasks/staff/QuickReportModal'
import { cn } from '@/utils/cn'
import { useUsersQuery } from '@/hooks/useUsersQuery'

const nextActions: { label: string; to: TaskStatus; from: TaskStatus[] }[] = [
  { label: 'Bắt đầu làm', to: 'IN_PROGRESS', from: ['NEW'] },
  {
    label: 'Hoàn thành (không qua báo cáo)',
    to: 'COMPLETED',
    from: ['IN_PROGRESS', 'NEW'],
  },
]

export function TaskDetailDrawer({
  open,
  task,
  tasks,
  usersById,
  onClose,
}: {
  open: boolean
  task: Task | null
  tasks: Task[]
  usersById: Map<string, User>
  onClose: () => void
}) {
  const qc = useQueryClient()
  const me = useAuthStore((s) => s.user)
  const usersQuery = useUsersQuery()
  const users = usersQuery.data ?? []
  const [reportOpen, setReportOpen] = useState(false)

  // Tính toán trước khi early return (để hooks gọi cùng thứ tự)
  const assignee = useMemo(() => {
    if (!task) return null
    return task.assigneeId ? usersById.get(task.assigneeId) ?? null : null
  }, [task, usersById])

  const creator = useMemo(() => {
    if (!task) return undefined
    return usersById.get(task.createdById)
  }, [task, usersById])

  const assigner = useMemo(() => {
    if (!task) return undefined
    return usersById.get(task.assignedById ?? task.createdById)
  }, [task, usersById])

  const assignOptions = useMemo(() => {
    if (!me || !task) return []
    if (
      me.role !== 'r-director' &&
      me.role !== 'r-vice-director' &&
      me.role !== 'r-dept-head'
    ) {
      return []
    }
    return users.filter((u) => {
      if (!canAssignTo(me, u)) return false
      if (me.role === 'r-director') return true
      if (me.role === 'r-dept-head') {
        return u.departmentId === task.departmentId
      }
      return (
        u.departmentId === task.departmentId &&
        (me.managedDepartmentIds?.includes(task.departmentId) ?? false)
      )
    })
  }, [me, task, users])

  const prog = useMemo(() => {
    if (!task) return { childCount: 0, completedCount: 0, inProgressCount: 0, pendingReportCount: 0 }
    return taskProgress(tasks, task.id)
  }, [task, tasks])

  const imAssignee = useMemo(() => me?.id === task?.assigneeId, [me, task])
  const canReport = useMemo(
    () => imAssignee && (task?.status === 'NEW' || task?.status === 'IN_PROGRESS'),
    [imAssignee, task],
  )

  const completeDisabled = useMemo(() => {
    if (!task) return false
    return !canSetCompletedFromStatus(task.status) || !canMarkTaskComplete(task, tasks)
  }, [task, tasks])

  // Early return sau khi đã gọi tất cả hooks
  if (!task) return null

  async function setAssignee(id: string | null) {
    try {
      await taskService.assignTask(task!.id, id)
      await qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Đã cập nhật người thực hiện')
    } catch (e) {
      const err = e as Error & { code?: string }
      const code = err.code || err.message
      if (code === 'FORBIDDEN_ASSIGN') {
        toast.error('Bạn không có quyền giao lại việc này')
      } else if (code === 'ASSIGN_OVER_LEVEL') {
        toast.error('Không được giao việc vượt cấp')
      } else {
        toast.error(err.message || 'Không giao được việc')
      }
    }
  }

  async function setStatus(next: TaskStatus) {
    try {
      await taskService.updateTask(task!.id, { status: next })
      await qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Đã cập nhật trạng thái')
    } catch (e) {
      const err = e as Error & { code?: string }
      const code = err.code || err.message
      if (code === 'CHILDREN_NOT_DONE') {
        toast.error('Chưa hoàn thành hết việc con')
      } else if (code === 'INVALID_STATUS_FLOW') {
        toast.error('Luồng trạng thái không hợp lệ')
      } else if (code === 'USE_REPORT_FLOW') {
        toast.error('Người nhận việc cần gửi báo cáo để xin duyệt hoàn thành')
      } else {
        toast.error(err.message || 'Lỗi cập nhật')
      }
    }
  }

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Chi tiết công việc">
        {usersQuery.isLoading && (
          <p className="text-sm text-slate-500">Đang tải dữ liệu người dùng…</p>
        )}
        {usersQuery.isError && (
          <p className="text-sm text-red-600">Không tải được dữ liệu người dùng.</p>
        )}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-slate-600">{task.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={task.status} />
            <PriorityTag priority={task.priority} />
            <DeadlineBadge deadline={task.deadline} />
          </div>

          {task.lastRejectionReason && task.status === 'IN_PROGRESS' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <p className="font-semibold">Báo cáo bị từ chối</p>
              <p className="mt-1">{task.lastRejectionReason}</p>
              <p className="mt-2 text-xs opacity-90">
                Cập nhật lại công việc và gửi báo cáo mới lên người giao.
              </p>
            </div>
          )}

          {task.status === 'PENDING_APPROVAL' && task.lastReportSummary && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950">
              <p className="font-semibold">Báo cáo đã gửi</p>
              <p className="mt-1">{task.lastReportSummary}</p>
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
            <p className="text-slate-500">Người giao việc (duyệt báo cáo)</p>
            <div className="mt-1 flex items-center gap-2">
              {assigner && <UserAvatar name={assigner.name} size="sm" />}
              <span className="font-medium text-slate-800">
                {assigner?.name ?? task.assignedById ?? '—'}
              </span>
            </div>
            {creator && creator.id !== (task.assignedById ?? task.createdById) && (
              <>
                <p className="mt-3 text-slate-500">Người tạo trên hệ thống</p>
                <div className="mt-1 flex items-center gap-2">
                  <UserAvatar name={creator.name} size="sm" />
                  <span className="font-medium text-slate-800">
                    {creator.name}
                  </span>
                </div>
              </>
            )}
            <p className="mt-3 text-slate-500">Người nhận việc</p>
            <div className="mt-1 flex items-center gap-2">
              {assignee && <UserAvatar name={assignee.name} size="sm" />}
              <span className="font-medium text-slate-800">
                {assignee?.name ?? '—'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-medical-100 bg-medical-50/40 p-3 text-sm">
            <p className="font-semibold text-medical-900">Tiến độ & phân rã</p>
            <ul className="mt-2 space-y-1 text-slate-700">
              <li>
                Đã giao xuống:{' '}
                <strong>{prog.childCount}</strong> việc con
              </li>
              <li>
                Con đã hoàn thành:{' '}
                <strong>
                  {prog.completedCount}/{prog.childCount || 0}
                </strong>
              </li>
              <li>
                Con đang làm: <strong>{prog.inProgressCount}</strong>
              </li>
              <li>
                Con chờ duyệt báo cáo:{' '}
                <strong>{prog.pendingReportCount}</strong>
              </li>
            </ul>
          </div>

          {assignOptions.length > 0 && (
            <label className="block text-sm font-medium text-slate-700">
              Giao cho (khoa)
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                value={task.assigneeId ?? ''}
                onChange={(e) => void setAssignee(e.target.value || null)}
              >
                <option value="">— Chưa giao —</option>
                {assignOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {canReport && (
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow hover:bg-slate-800"
            >
              Báo cáo lên người giao (xin duyệt hoàn thành)
            </button>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Trạng thái nhanh
            </p>
            <div className="flex flex-wrap gap-2">
              {nextActions.map((a) => {
                if (!a.from.includes(task.status)) return null
                const isComplete = a.to === 'COMPLETED'
                const disabled = isComplete && completeDisabled
                if (isComplete && imAssignee) {
                  return null
                }
                return (
                  <button
                    key={a.label}
                    type="button"
                    disabled={disabled}
                    title={
                      disabled
                        ? 'Hoàn thành hết việc con trước'
                        : undefined
                    }
                    onClick={() => void setStatus(a.to)}
                    className={cn(
                      'rounded-xl px-3 py-2 text-sm font-medium shadow-sm',
                      isComplete
                        ? 'bg-teal-800 text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50'
                        : 'bg-medical-600 text-white hover:bg-medical-700',
                    )}
                  >
                    {a.label}
                  </button>
                )
              })}
            </div>
            {imAssignee && (
              <p className="mt-2 text-xs text-slate-500">
                Người nhận việc: dùng <strong>Báo cáo</strong> để xin người giao
                duyệt hoàn thành.
              </p>
            )}
          </div>
        </div>
      </Drawer>

      <QuickReportModal
        open={reportOpen}
        task={task}
        onClose={() => setReportOpen(false)}
      />
    </>
  )
}