import { useCallback, useMemo, useState } from 'react'
import type { Task } from '@/types'
import { TaskNode } from '@/features/tasks/TaskTree/TaskNode'

function historyTimestamp(task: Task) {
  const value = task.archivedAt ?? task.updatedAt ?? task.createdAt
  const ts = Date.parse(value)
  return Number.isNaN(ts) ? 0 : ts
}

function sortByHistoryDesc(a: Task, b: Task) {
  return historyTimestamp(b) - historyTimestamp(a)
}

export function HistoryTaskTree({ tasks }: { tasks: Task[] }) {
  const roots = useMemo(() => {
    const idSet = new Set(tasks.map((t) => t.id))
    return tasks
      .filter((t) => !t.parentId || !idSet.has(t.parentId))
      .sort(sortByHistoryDesc)
  }, [tasks])

  const childrenMap = useMemo(() => {
    const map: Record<string, Task[]> = {}

    for (const task of tasks) {
      if (!task.parentId) continue
      if (!map[task.parentId]) map[task.parentId] = []
      map[task.parentId].push(task)
    }

    Object.keys(map).forEach((key) => {
      map[key].sort(sortByHistoryDesc)
    })

    return map
  }, [tasks])

  const parentIdsWithChildren = useMemo(() => {
    return new Set(
      Object.entries(childrenMap)
        .filter(([, list]) => list.length > 0)
        .map(([id]) => id),
    )
  }, [childrenMap])

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (!roots.length) return new Set()
    return new Set(roots.map((r) => r.id))
  })

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const RowTree = useCallback(
    function RowTreeInner({ list, depth }: { list: Task[]; depth: number }) {
      return (
        <div className="space-y-2">
          {list.map((task) => {
            const loaded = childrenMap[task.id] ?? []
            const isExpanded = expanded.has(task.id)
            const hasChildren = loaded.length > 0

            return (
              <div key={task.id} className="space-y-2">
                <TaskNode
                  task={task}
                  depth={depth}
                  expanded={isExpanded}
                  loading={false}
                  showToggle={hasChildren}
                  loadedChildCount={loaded.length}
                  onToggle={() => toggle(task.id)}
                  onSelect={() => {}}
                />
                {isExpanded && hasChildren && (
                  <RowTreeInner list={loaded} depth={depth + 1} />
                )}
              </div>
            )
          })}
        </div>
      )
    },
    [childrenMap, expanded, toggle],
  )

  if (!roots.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-6 text-center text-sm text-slate-600">
        Chưa có công việc nào được chuyển vào lịch sử.
      </p>
    )
  }

  return (
    <div className="space-y-3">
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

      <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-inner backdrop-blur-sm">
        <RowTree list={roots} depth={0} />
      </div>
    </div>
  )
}
