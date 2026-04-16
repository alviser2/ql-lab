import { useQuery } from '@tanstack/react-query'
import { getUsers } from '@/services/userService'

export function useUsersQuery() {
  return useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}
