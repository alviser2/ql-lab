import { useQuery } from '@tanstack/react-query'
import * as taskService from '@/services/taskService'

export function useTasksQuery(options?: {
  includeArchived?: boolean
  onlyArchived?: boolean
}) {
  return useQuery({
    queryKey: ['tasks', options?.includeArchived ? 'with-archived' : 'active-only', options?.onlyArchived ? 'history-only' : 'not-history-only'],
    queryFn: () => taskService.getTasks(options),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchInterval: 45_000,
    refetchIntervalInBackground: true,
  })
}
