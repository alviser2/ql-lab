import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { useTasksQuery } from '@/hooks/useTasksQuery'
import { useUsersQuery } from '@/hooks/useUsersQuery'
import { DeadlineBadge } from '@/components/DeadlineBadge'
import { PriorityTag } from '@/components/PriorityTag'
import { StatusBadge } from '@/components/StatusBadge'
import type { Task } from '@/types'

const ROOT_KEY = '__root__'

function historyTimestamp(task: Task) {
  const value = task.archivedAt ?? task.updatedAt ?? task.createdAt
  const ts = Date.parse(value)
  return Number.isNaN(ts) ? 0 : ts
}

function byHistoryDateDesc(a: Task, b: Task) {
  return historyTimestamp(b) - historyTimestamp(a)
}

export function TaskHistoryPage() {
  const tasksQuery = useTasksQuery({ onlyArchived: true })
  const usersQuery = useUsersQuery()
  const tasks = tasksQuery.data ?? []
  const users = usersQuery.data ?? []

  const usersById = useMemo(() => {
    return new Map(users.map((u) => [u.id, u]))
  }, [users])

  const taskIds = useMemo(() => new Set(tasks.map((t) => t.id)), [tasks])

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Task[]>()

    for (const task of tasks) {
      const key = task.parentId ?? ROOT_KEY
      const list = map.get(key)
      if (list) list.push(task)
      else map.set(key, [task])
    }

    for (const [, list] of map) {
      list.sort(byHistoryDateDesc)
    }

    return map
  }, [tasks])

  const roots = useMemo(() => {
    return tasks
      .filter((t) => !t.parentId || !taskIds.has(t.parentId))
      .sort(byHistoryDateDesc)
  }, [taskIds, tasks])

  const parentIdsWithChildren = useMemo(() => {
    return new Set(
      tasks
        .filter((t) => (childrenByParent.get(t.id)?.length ?? 0) > 0)
        .map((t) => t.id),
    )
  }, [childrenByParent, tasks])

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [initializedExpand, setInitializedExpand] = useState(false)

  useEffect(() => {
    if (initializedExpand) return
    if (!roots.length) return
    setExpanded(new Set(roots.map((r) => r.id)))
    setInitializedExpand(true)
  }, [initializedExpand, roots])

  const rows = useMemo(() => {
    const flat: { task: Task; depth: number; hasChildren: boolean }[] = []

    const walk = (task: Task, depth: number) => {
      const children = childrenByParent.get(task.id) ?? []
      const hasChildren = children.length > 0

      flat.push({ task, depth, hasChildren })

      if (!hasChildren || !expanded.has(task.id)) return
      for (const child of children) walk(child, depth + 1)
    }

    for (const root of roots) walk(root, 0)

    return flat
  }, [childrenByParent, expanded, roots])

  function toggle(taskId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  if (tasksQuery.isLoading || usersQuery.isLoading) {
    return <p className="text-sm text-slate-500">Đang tải lịch sử công việc…</p>
  }

  if (tasksQuery.isError || usersQuery.isError) {
    return <p className="text-sm text-red-600">Không tải được lịch sử công việc.</p>
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch sử công việc</h1>
          <p className="text-sm text-slate-600">
            Cây việc đã được Giám đốc chốt cuối cùng. Dữ liệu vẫn giữ để tính KPI.
          </p>
        </div>
        {tasks.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setExpanded(new Set(parentIdsWithChildren))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Mở toàn bộ
            </button>
            <button
              type="button"
              onClick={() => setExpanded(new Set())}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Thu gọn
            </button>
          </div>
        )}
      </header>

      {tasks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-600">
          Chưa có công việc nào được chuyển vào lịch sử.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1250px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Cây công việc</th>
                <th className="px-3 py-2 text-left font-semibold">Người nhận</th>
                <th className="px-3 py-2 text-left font-semibold">Trạng thái</th>
                <th className="px-3 py-2 text-left font-semibold">Ưu tiên</th>
                <th className="px-3 py-2 text-left font-semibold">Deadline</th>
                <th className="px-3 py-2 text-left font-semibold">Chuyển lịch sử lúc</th>
                <th className="px-3 py-2 text-left font-semibold">Chốt bởi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ task, depth, hasChildren }) => {
                const assigneeName = task.assigneeId
                  ? usersById.get(task.assigneeId)?.name || '—'
                  : '—'

                const archivedByName = task.archivedById
                  ? usersById.get(task.archivedById)?.name || '—'
                  : '—'

                const archivedAtLabel = task.archivedAt
                  ? format(new Date(task.archivedAt), 'dd/MM/yyyy HH:mm')
                  : '—'

                return (
                  <tr key={task.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-3 py-2.5">
                      <div
                        className="flex min-w-0 items-center gap-1"
                        style={{ paddingLeft: depth * 18 }}
                      >
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggle(task.id)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100"
                            aria-label={expanded.has(task.id) ? 'Thu gọn nhánh' : 'Mở rộng nhánh'}
                          >
                            {expanded.has(task.id) ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                        ) : (
                          <span className="inline-block size-6" />
                        )}

                        <span className="truncate font-medium text-slate-900" title={task.title}>
                          {task.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{assigneeName}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={task.status} /></td>
                    <td className="px-3 py-2.5"><PriorityTag priority={task.priority} /></td>
                    <td className="px-3 py-2.5"><DeadlineBadge deadline={task.deadline} /></td>
                    <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{archivedAtLabel}</td>
                    <td className="px-3 py-2.5 text-slate-700">{archivedByName}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
