import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export function Drawer({
  open,
  title,
  children,
  onClose,
  side = 'right',
}: {
  open: boolean
  title?: string
  children: React.ReactNode
  onClose: () => void
  side?: 'right' | 'left'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-50 flex transition',
        side === 'right' ? 'justify-end' : 'justify-start',
        open && 'pointer-events-auto',
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Đóng panel"
        className={cn(
          'absolute inset-0 bg-slate-900/30 opacity-0 transition',
          open && 'opacity-100',
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'relative h-full w-full max-w-md translate-x-full bg-white shadow-2xl ring-1 ring-slate-200 transition duration-300',
          side === 'left' && 'translate-x-[-100%]',
          open && 'translate-x-0',
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          {title && (
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="h-[calc(100%-52px)] overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  )
}
