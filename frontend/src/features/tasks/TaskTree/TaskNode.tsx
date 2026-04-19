import { ChevronDown, ChevronRight, Eye, Plus, Trash2 } from 'lucide-react'
import type { Task } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { cn } from '@/utils/cn'

type TaskAction = 'view' | 'add' | 'delete'

const statusBorder: Record<Task['status'], string> = {
  NEW: 'border-l-slate-400',
  IN_PROGRESS: 'border-l-emerald-500',
  PENDING_APPROVAL: 'border-l-amber-500',
  COMPLETED: 'border-l-teal-800',
  REJECTED: 'border-l-red-500',
}

export function TaskNode({
  task,
  depth,
  expanded,
  loading,
  showToggle,
  loadedChildCount,
  onToggle,
  onSelect,
  onHoverAction,
  availableActions,
}: {
  task: Task
  depth: number
  expanded: boolean
  loading: boolean
  /** false nếu đã xác nhận không có việc con */
  showToggle: boolean
  /** chỉ hiển thị khi đã load danh sách con */
  loadedChildCount: number | null
  onToggle: () => void
  onSelect: (t: Task) => void
  onHoverAction?: (action: TaskAction, t: Task) => void
  availableActions?: TaskAction[]
}) {
  const showChevron = showToggle || loading
  const actions =
    availableActions ?? (task.archived ? ['view', 'add', 'delete'] : ['view', 'add'])
  const canShowActions = !!onHoverAction && actions.length > 0

  return (
    <div
      className={cn(
        'group relative flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white/95 py-2 pl-2 shadow-sm transition',
        canShowActions ? 'pr-32 md:pr-3' : 'pr-3',
        'border-l-4',
        statusBorder[task.status],
      )}
      style={{ marginLeft: depth * 16 }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        disabled={!showChevron && !loading}
        onClick={(e) => {
          e.stopPropagation()
          if (showChevron || loading) onToggle()
        }}
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100',
          !showChevron && !loading && 'invisible pointer-events-none',
        )}
      >
        {loading ? (
          <span className="size-4 animate-pulse rounded-full bg-slate-300" />
        ) : expanded ? (
          <ChevronDown className="size-5" />
        ) : (
          <ChevronRight className="size-5" />
        )}
      </button>
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => onSelect(task)}
      >
        <p className="font-medium text-slate-900">{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          {loadedChildCount !== null && (
            <span className="text-xs text-slate-500">
              {loadedChildCount} việc con
            </span>
          )}
        </div>
      </button>

      {canShowActions && (
        <div className="absolute right-2 top-2 flex gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          {actions.includes('view') && (
            <button
              type="button"
              title="Xem nhanh"
              className="rounded-lg bg-slate-900/80 p-1.5 text-white shadow"
              onClick={(e) => {
                e.stopPropagation()
                onHoverAction('view', task)
              }}
            >
              <Eye className="size-4" />
            </button>
          )}

          {actions.includes('add') && (
            <button
              type="button"
              title="Tạo việc con"
              className="rounded-lg bg-medical-600 p-1.5 text-white shadow"
              onClick={(e) => {
                e.stopPropagation()
                onHoverAction('add', task)
              }}
            >
              <Plus className="size-4" />
            </button>
          )}

          {actions.includes('delete') && (
            <button
              type="button"
              title="Xóa cây lịch sử này"
              className="rounded-lg bg-red-600 p-1.5 text-white shadow hover:bg-red-700"
              onClick={(e) => {
                e.stopPropagation()
                onHoverAction('delete', task)
              }}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
