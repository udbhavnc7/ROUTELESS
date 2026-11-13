import { TriangleAlert } from 'lucide-react'
import type { Incident, Institution, TransportOption, Village } from '../data/types'
import { formatClock } from '../domain/time'
import { cn } from '../lib/cn'

type RouteRailProps = {
  option: TransportOption
  village: Village
  institution: Institution
  incident?: Incident
}

export function RouteRail({
  option,
  village,
  institution,
  incident,
}: RouteRailProps) {
  const disrupted =
    incident?.status === 'reported' || incident?.status === 'confirmed'
  const stopMin = option.arrivalMinByVillage[village.id] ?? option.departureMin
  const rideMinutes = Math.max(0, option.collegeArrivalMin - stopMin)

  return (
    <div className="relative pl-8">
      <span
        aria-hidden="true"
        className={cn(
          'absolute bottom-4 left-[9px] top-4 w-0 border-l-2',
          disrupted ? 'border-dashed border-danger/45' : 'border-solid border-line-strong',
        )}
      />

      <div className="relative pb-5">
        <span
          aria-hidden="true"
          className={cn(
            'absolute -left-8 top-1 grid size-[18px] place-items-center rounded-full border-2 bg-surface',
            disrupted ? 'border-danger' : 'border-brand',
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              disrupted ? 'bg-danger' : 'bg-brand',
            )}
          />
        </span>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold">{village.name} stop</p>
            <p className="mt-0.5 text-xs text-ink-2">Pick-up point · demo</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-sm tabular-nums">
              {formatClock(stopMin)}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-2">
              scheduled
            </p>
          </div>
        </div>
      </div>

      {disrupted ? (
        <div className="mb-5 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2.5 text-danger">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <TriangleAlert className="size-3.5" aria-hidden />
            {incident?.status === 'confirmed'
              ? `${option.label} is suspended`
              : `${option.label} reported stopped`}
          </p>
          <p className="mt-1 text-[11px] leading-snug opacity-85">
            No vehicle at this stop in the simulation. Scheduled times below are
            not expected to hold.
          </p>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-2 pl-1 text-xs text-ink-2">
          <span className="h-px w-6 bg-line-strong" aria-hidden />
          about {rideMinutes} min by schedule
        </div>
      )}

      <div className="relative">
        <span
          aria-hidden="true"
          className={cn(
            'absolute -left-8 top-1 grid size-[18px] place-items-center rounded-full border-2 bg-surface',
            disrupted ? 'border-ink/25' : 'border-ink/35',
          )}
        >
          <span className="size-1.5 rounded-full bg-ink/30" />
        </span>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold">{institution.name}</p>
            <p className="mt-0.5 text-xs text-ink-2">
              Class starts {formatClock(institution.classStartMin)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={cn(
                'font-mono text-sm tabular-nums',
                disrupted && 'text-ink-2 line-through decoration-danger/50',
              )}
            >
              {formatClock(option.collegeArrivalMin)}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-2">
              scheduled
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
