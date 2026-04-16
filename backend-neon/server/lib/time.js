export function toIsoOrNull(value) {
  if (value == null || value === '') return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}
