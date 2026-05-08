import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import toast from 'react-hot-toast'
import type { Task, TaskStatus, User } from '@/types'
import * as taskService from '@/services/taskService'
import { KanbanColumn } from '@/features/tasks/Kanban/KanbanColumn'
import { useQueryClient } from '@tanstack/react-query'

const COL = {
  TODO: 'NEW' as const,
  DOING: 'IN_PROGRESS' as const,
  REVIEW: 'PENDING_APPROVAL' as const,
  DONE: 'COMPLETED' as const,
}

type ColId = (typeof COL)[keyof typeof COL]

function columnForTask(t: Task): ColId {
  if (t.status === 'COMPLETED' || t.status === 'REJECTED') return COL.DONE
  if (t.status === 'NEW') return COL.TODO
  if (t.status === 'IN_PROGRESS') return COL.DOING
  return COL.REVIEW
}

export function KanbanBoard({
  tasks,
  usersById,
  onOpenTask,
}: {
  tasks: Task[]
  usersById: Map<string, User>
  onOpenTask: (t: Task) => void
}) {
  const qc = useQueryClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const grouped: Record<ColId, Task[]> = {
    [COL.TODO]: [],
    [COL.DOING]: [],
    [COL.REVIEW]: [],
    [COL.DONE]: [],
  }
  for (const t of tasks) {
    // Đã kéo vào Done thì ẩn khỏi board để Kanban gọn hơn
    if (t.status === 'COMPLETED' || t.status === 'REJECTED') continue
    grouped[columnForTask(t)].push(t)
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const taskId = String(active.id)
    const col = over.id as ColId
    const task = tasks.find((x) => x.id === taskId)
    if (!task) return

    if (col === COL.DONE && task.status === 'PENDING_APPROVAL') {
      toast.error('Việc chờ duyệt — Thường trực phải duyệt trước khi hoàn thành')
      return
    }

    let nextStatus: TaskStatus = task.status
    if (col === COL.TODO) nextStatus = 'NEW'
    else if (col === COL.DOING) nextStatus = 'IN_PROGRESS'
    else if (col === COL.REVIEW) nextStatus = 'PENDING_APPROVAL'
    else if (col === COL.DONE) {
      if (task.status === 'REJECTED') {
        toast('Kéo việc bị từ chối sang Done sẽ đặt lại Hoàn thành (demo)', {
          icon: 'ℹ️',
        })
      }
      nextStatus = 'COMPLETED'
    }

    if (nextStatus === task.status) return

    try {
      await taskService.updateTask(taskId, { status: nextStatus })
      await qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Đã cập nhật cột')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không cập nhật được'
      toast.error(msg)
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={(ev) => void onDragEnd(ev)}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KanbanColumn
          id={COL.TODO}
          title="To-do"
          tasks={grouped[COL.TODO]}
          usersById={usersById}
          onOpenTask={onOpenTask}
        />
        <KanbanColumn
          id={COL.DOING}
          title="Doing"
          tasks={grouped[COL.DOING]}
          usersById={usersById}
          onOpenTask={onOpenTask}
        />
        <KanbanColumn
          id={COL.REVIEW}
          title="Review"
          tasks={grouped[COL.REVIEW]}
          usersById={usersById}
          onOpenTask={onOpenTask}
        />
        <KanbanColumn
          id={COL.DONE}
          title="Done (ẩn sau khi hoàn thành)"
          tasks={grouped[COL.DONE]}
          usersById={usersById}
          onOpenTask={onOpenTask}
        />
      </div>
    </DndContext>
  )
}
