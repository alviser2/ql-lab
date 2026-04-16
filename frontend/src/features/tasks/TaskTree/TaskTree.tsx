import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import type { Task } from '@/types'
import * as taskService from '@/services/taskService'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { canCreateTask } from '@/utils/taskHierarchy'
import { TaskNode } from '@/features/tasks/TaskTree/TaskNode'

export function TaskTree({
  tasks,
  onSelectTask,
}: {
  /** Root tasks đã lọc theo RBAC */
  tasks: Task[]
  onSelectTask: (t: Task) => void
}) {
  const user = useAuthStore((s) => s.user)
  const setCreateOpen = useUiStore((s) => s.setCreateTaskOpen)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState<Set<string>>(() => new Set())
  const [childrenMap, setChildrenMap] = useState<Record<string, Task[]>>({})

  const loadChildren = useCallback(async (parentId: string) => {
    setLoading((s) => new Set(s).add(parentId))
    try {
      const all = await taskService.getTasks()
      const kids = all.filter((t) => t.parentId === parentId)
      setChildrenMap((m) => {
        if (m[parentId] !== undefined) return m
        return { ...m, [parentId]: kids }
      })
    } catch {
      toast.error('Không tải được việc con')
      throw new Error('LOAD_CHILDREN')
    } finally {
      setLoading((s) => {
        const n = new Set(s)
        n.delete(parentId)
        return n
      })
    }
  }, [])

  const toggle = useCallback(
    async (id: string) => {
      if (expanded.has(id)) {
        setExpanded((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        return
      }
      try {
        await loadChildren(id)
        setExpanded((prev) => new Set(prev).add(id))
      } catch {
        /* đã toast trong loadChildren */
      }
    },
    [expanded, loadChildren],
  )

  const onHoverAction = useCallback(
    (action: 'view' | 'add', t: Task) => {
      if (action === 'view') {
        onSelectTask(t)
        return
      }
      if (action === 'add') {
        if (!canCreateTask(user)) {
          toast.error('Nhân viên không được tạo việc con')
          return
        }
        setCreateOpen(true, t.id)
      }
    },
    [onSelectTask, setCreateOpen, user],
  )

  const RowTree = useCallback(
    function RowTreeInner({ list, depth }: { list: Task[]; depth: number }) {
      return (
        <div className="space-y-2">
          {list.map((task) => {
            const loaded = childrenMap[task.id]
            const isLoading = loading.has(task.id)
            const isExpanded = expanded.has(task.id)
            const isEmptyLeaf = loaded !== undefined && loaded.length === 0
            const showToggle = !isEmptyLeaf || isLoading || loaded === undefined
            const loadedChildCount = loaded !== undefined ? loaded.length : null

            return (
              <div key={task.id} className="space-y-2">
                <TaskNode
                  task={task}
                  depth={depth}
                  expanded={isExpanded}
                  loading={isLoading}
                  showToggle={showToggle}
                  loadedChildCount={loadedChildCount}
                  onToggle={() => void toggle(task.id)}
                  onSelect={onSelectTask}
                  onHoverAction={onHoverAction}
                />
                {isExpanded && loaded && loaded.length > 0 && (
                  <RowTreeInner list={loaded} depth={depth + 1} />
                )}
                {isExpanded && loaded && loaded.length === 0 && (
                  <p
                    className="text-xs text-slate-500"
                    style={{ marginLeft: (depth + 1) * 16 + 40 }}
                  >
                    Không có việc con.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )
    },
    [childrenMap, expanded, loading, onHoverAction, onSelectTask, toggle],
  )

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-inner backdrop-blur-sm">
      <RowTree list={tasks} depth={0} />
    </div>
  )
}
