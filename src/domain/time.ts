/** Demo clock helper. All times are minutes after midnight, demo local time. */
export function formatClock(minutes: number): string {
  const clamped = Math.max(0, Math.round(minutes))
  const hours = Math.floor(clamped / 60) % 24
  const mins = clamped % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function minutesBetween(from: number, to: number): number {
  return Math.max(0, Math.round(to - from))
}

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} hr`
  return `${hours} hr ${mins} min`
}
