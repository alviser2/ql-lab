import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { Task } from '@/types'
import { TaskNode } from '@/features/tasks/TaskTree/TaskNode'
import * as taskService from '@/services/taskService'
import { Modal } from '@/components/Modal'

function historyTimestamp(task: Task) {
  const value = task.archivedAt ?? task.updatedAt ?? task.createdAt
  const ts = Date.parse(value)
  return Number.isNaN(ts) ? 0 : ts
}

function sortByHistoryDesc(a: Task, b: Task) {
  return historyTimestamp(b) - historyTimestamp(a)
}

export function HistoryTaskTree({
  tasks,
  onSelectTask,
  canDelete,
}: {
  tasks: Task[]
  onSelectTask: (task: Task) => void
  canDelete: boolean
}) {
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
  const [toDelete, setToDelete] = useState<Task | null>(null)
  const qc = useQueryClient()

  const deleteMut = useMutation({
    mutationFn: async (taskId: string) => taskService.deleteHistoryTask(taskId),
    onSuccess: async (result) => {
      toast.success(`Đã xóa ${result.deletedCount} công việc trong cây lịch sử`)
      await qc.invalidateQueries({ queryKey: ['tasks'] })
      setToDelete(null)
    },
    onError: (e: Error & { code?: string }) => {
      toast.error(e.message || 'Xóa lịch sử thất bại')
    },
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
                  onSelect={() => onSelectTask(task)}
                  onHoverAction={(action, selected) => {
                    if (action === 'view') {
                      onSelectTask(selected)
                      return
                    }
                    if (action === 'delete' && canDelete) {
                      setToDelete(selected)
                    }
                  }}
                  availableActions={canDelete ? ['view', 'delete'] : ['view']}
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
    [canDelete, childrenMap, expanded, onSelectTask, toggle],
  )

  if (!roots.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-6 text-center text-sm text-slate-600">
        Chưa có công việc nào được chuyển vào lịch sử.
      </p>
    )
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
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

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Xác nhận xóa cây lịch sử"
        size="sm"
      >
        <p className="text-sm text-slate-700">
          Bạn chắc chắn muốn xóa cây lịch sử của công việc <strong>{toDelete?.title}</strong>?
          Hành động này không thể hoàn tác.
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setToDelete(null)}
            className="w-full rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 sm:w-auto"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!toDelete || deleteMut.isPending}
            onClick={() => {
              if (!toDelete) return
              deleteMut.mutate(toDelete.id)
            }}
            className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
          >
            Xóa cây
          </button>
        </div>
      </Modal>
    </>
  )
}
