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
        'fixed inset-0 z-50 flex transition',
        side === 'right' ? 'justify-end' : 'justify-start',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Đóng panel"
        className={cn(
          'absolute inset-0 z-0 bg-slate-900/30 opacity-0 transition',
          open && 'opacity-100',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'relative z-10 h-full w-full max-w-md pointer-events-auto bg-white shadow-2xl ring-1 ring-slate-200 transition-transform duration-300',
          side === 'right'
            ? open
              ? 'translate-x-0'
              : 'translate-x-full'
            : open
              ? 'translate-x-0'
              : '-translate-x-full',
        )}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          {title && (
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="relative z-20 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="h-[calc(100%-52px)] overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  )
}
