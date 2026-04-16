import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNotificationStore } from '@/store/notificationStore'

/** Giả lập realtime: định kỳ invalidate tasks + tăng badge */
export function useFakeRealtime(enabled: boolean) {
  const qc = useQueryClient()
  const bump = useNotificationStore((s) => s.bump)

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => {
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      bump()
    }, 45_000)
    return () => window.clearInterval(id)
  }, [enabled, qc, bump])
}
