import { useQuery } from '@tanstack/react-query'
import { useTaskStore } from '@/store/taskStore'

export function useTasksQuery() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => useTaskStore.getState().fetchTasks(),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
  })
}
