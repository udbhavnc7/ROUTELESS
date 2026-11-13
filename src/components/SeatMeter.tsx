import { cn } from '../lib/cn'

type SeatMeterProps = {
  capacity: number
  occupied: number
  free: number
  label: string
}

/**
 * Small vehicles get a seat-by-seat strip so the 8-of-12 figure is legible;
 * large buses get a proportional bar to avoid 44 tiny marks.
 */
export function SeatMeter({ capacity, occupied, free, label }: SeatMeterProps) {
  const used = Math.min(capacity, Math.max(0, occupied))
  const available = Math.min(capacity - used, Math.max(0, free))
  const reserved = Math.max(0, capacity - used - available)

  if (capacity <= 16) {
    return (
      <div
        className="flex flex-wrap gap-1"
        role="img"
        aria-label={`${label}: ${available} of ${capacity} seats free, ${used} in use`}
      >
        {Array.from({ length: capacity }, (_, index) => {
          const isUsed = index < used
          const isReserved = index >= used + available
          return (
            <span
              key={index}
              className={cn(
                'h-4 w-[7px] rounded-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
                isUsed
                  ? 'bg-line-strong/75'
                  : isReserved
                    ? 'bg-gold/70'
                    : 'bg-gradient-to-b from-brand to-brand-deep',
              )}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div
      className="flex h-2.5 overflow-hidden rounded-full bg-line/60 shadow-[inset_0_1px_2px_rgba(18,32,28,0.12)]"
      role="img"
      aria-label={`${label}: ${available} of ${capacity} seats free, ${used} in use`}
    >
      <span
        className="h-full bg-line-strong/80"
        style={{ width: `${(used / capacity) * 100}%` }}
      />
      <span
        className="h-full bg-gradient-to-r from-brand to-brand-deep"
        style={{ width: `${(available / capacity) * 100}%` }}
      />
      {reserved > 0 ? (
        <span
          className="h-full bg-gold/70"
          style={{ width: `${(reserved / capacity) * 100}%` }}
        />
      ) : null}
    </div>
  )
}
