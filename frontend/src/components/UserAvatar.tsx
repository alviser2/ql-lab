import { cn } from '@/utils/cn'

export function UserAvatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .slice(-2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  const dim =
    size === 'sm' ? 'size-8 text-xs' : size === 'lg' ? 'size-12 text-base' : 'size-10 text-sm'
  return (
    <span
      title={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-medical-600 font-semibold text-white shadow-sm ring-2 ring-white',
        dim,
        className,
      )}
    >
      {initials || '?'}
    </span>
  )
}
