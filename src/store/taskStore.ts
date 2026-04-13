import { create } from 'zustand'
import * as taskService from '@/services/taskService'
import type { Task, TaskPriority, TaskStatus } from '@/types'

export interface TaskFilters {
  status?: TaskStatus
  departmentId?: string
  search?: string
}

interface TaskState {
  tasks: Task[]
  selectedTaskId: string | null
  filters: TaskFilters
  setFilters: (f: TaskFilters) => void
  setSelectedTaskId: (id: string | null) => void
  setTasks: (tasks: Task[]) => void
  fetchTasks: () => Promise<Task[]>
  updateStatus: (id: string, status: TaskStatus) => Promise<Task>
  createTask: (input: {
    title: string
    description?: string
    parentId: string | null
    departmentId: string
    assigneeId: string | null
    overseenByViceDirectorId: string | null
    createdById: string
    assignedById: string
    priority: TaskPriority
    deadline: string
    thuongTrucId?: string | null
    boPhanPhoiHopIds?: string[]
    phuongPhapLam?: string | null
    dukienKetQua?: string | null
  }) => Promise<Task>
  assignTask: (
    taskId: string,
    assigneeId: string | null,
    delegatedById?: string | null,
  ) => Promise<Task>
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  filters: {},
  setFilters: (filters) => set({ filters }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setTasks: (tasks) => set({ tasks }),
  fetchTasks: async () => {
    const tasks = await taskService.getTasks()
    set({ tasks })
    return tasks
  },
  updateStatus: async (id, status) => {
    const updated = await taskService.updateTask(id, { status })
    await get().fetchTasks()
    return updated
  },
  createTask: async (input) => {
    const created = await taskService.createTask(input)
    await get().fetchTasks()
    return created
  },
  assignTask: async (taskId, assigneeId, delegatedById) => {
    const updated = await taskService.assignTask(
      taskId,
      assigneeId,
      delegatedById,
    )
    await get().fetchTasks()
    return updated
  },
}))

export function selectTaskById(id: string | null, tasks: Task[]) {
  if (!id) return null
  return tasks.find((t) => t.id === id) ?? null
}
