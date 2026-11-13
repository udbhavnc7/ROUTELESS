import { useApp } from '../state/context'
import { freeSeats, nonDismissedIncidents, usableRescueOptions, verifiedRescueOptions } from '../domain/metrics'
import type { Village } from '../data/types'
import { cn } from '../lib/cn'

export type SchematicTone = 'mint' | 'gold' | 'danger' | 'neutral'

const TONE_COLORS: Record<SchematicTone, string> = {
  mint: '#9fe6cc',
  gold: '#d7a24a',
  danger: '#d0604a',
  neutral: '#6f877d',
}

const NODE_POSITIONS: Record<
  string,
  { x: number; y: number; path: string; breakpoint: { x: number; y: number } }
> = {
  'v-a': {
    x: 92,
    y: 64,
    path: 'M 92 64 C 200 28, 390 32, 544 106',
    breakpoint: { x: 306, y: 44 },
  },
  'v-b': {
    x: 78,
    y: 192,
    path: 'M 78 192 C 214 228, 392 202, 544 134',
    breakpoint: { x: 312, y: 207 },
  },
  'v-c': {
    x: 250,
    y: 122,
    path: 'M 250 122 C 350 110, 442 112, 544 120',
    breakpoint: { x: 396, y: 114 },
  },
}

type VillageState = {
  village: Village
  seats: number
  tone: SchematicTone
  status: string
  line: 'active' | 'no-capacity' | 'blocked' | 'unverified'
}

function villageState(village: Village, seats: number, hasIncident: boolean, blocked: boolean, hasVerified: boolean): VillageState {
  if (hasIncident && blocked && seats === 0) {
    return {
      village,
      seats,
      tone: 'danger',
      status: 'Access road blocked',
      line: 'blocked',
    }
  }
  if (seats > 0) {
    return {
      village,
      seats,
      tone: 'mint',
      status: hasIncident ? `${seats} seat${seats === 1 ? '' : 's'} reach campus` : `${seats} verified spare seats`,
      line: 'active',
    }
  }
  if (!hasVerified) {
    return {
      village,
      seats,
      tone: 'neutral',
      status: hasIncident ? 'No verified vehicle can reach' : 'No verified service',
      line: 'unverified',
    }
  }
  return {
    village,
    seats,
    tone: 'gold',
    status: hasIncident ? 'Verified vehicle, no seat left' : 'No spare seat',
    line: 'no-capacity',
  }
}

export function NetworkSchematic() {
  const { state } = useApp()
  const incidents = nonDismissedIncidents(state)

  const entries = state.villages
    .map((village) => {
      const incident = incidents.find((entry) =>
        entry.affectedVillageIds.includes(village.id),
      )
      const seats = usableRescueOptions(state, [village.id]).reduce(
        (total, option) => total + freeSeats(state, option),
        0,
      )
      const verifiedForVillage = verifiedRescueOptions(state).filter((option) =>
        option.villageIds.includes(village.id),
      )
      const blocked = verifiedForVillage.some((option) =>
        option.blockedCorridorIds.includes(village.corridorId),
      )
      return villageState(
        village,
        seats,
        Boolean(incident),
        blocked,
        verifiedForVillage.length > 0,
      )
    })
    .filter((entry) => Boolean(NODE_POSITIONS[entry.village.id]))

  const summary = entries
    .map((entry) => `${entry.village.name}: ${entry.status.toLowerCase()}`)
    .join('. ')

  return (
    <figure className="panel-dark night relative overflow-hidden rounded-2xl border border-night-3/90 bg-night text-paper">
      <div className="grid-etch pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <div
        className="pointer-events-none absolute -left-24 -top-32 size-80 rounded-full bg-brand/25 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-wrap items-start justify-between gap-3 border-b border-paper/10 px-5 py-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-mint/65">
            Network board · seeded schematic
          </p>
          <h2 className="mt-1 font-display text-[19px] font-semibold leading-tight">
            Who can still reach campus
          </h2>
          <p className="mt-0.5 text-[11.5px] leading-snug text-paper/50">
            Verified capacity by village. A blocked corridor removes the link;
            no detour is invented.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/25 bg-mint/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-mint/85">
          <span className="size-1.5 rounded-full bg-mint" aria-hidden />
          Not GPS
        </span>
      </div>

      <div className="relative overflow-x-auto px-2 pb-1 pt-3 sm:px-4">
        <svg
          viewBox="0 0 680 248"
          role="img"
          aria-label={summary}
          className="h-auto w-full min-w-[520px]"
        >
          <defs>
            <radialGradient id="schematic-campus-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d7a24a" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#d7a24a" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="566" cy="120" r="58" fill="url(#schematic-campus-glow)" />

          {entries.map((entry) => {
            const position = NODE_POSITIONS[entry.village.id]
            const color = TONE_COLORS[entry.tone]
            return (
              <g key={entry.village.id}>
                <path
                  d={position.path}
                  fill="none"
                  className={cn(
                    'schematic-line',
                    entry.line === 'active' && 'schematic-flow',
                  )}
                  stroke={color}
                  strokeWidth={entry.line === 'active' ? 2.4 : 1.8}
                  strokeOpacity={entry.line === 'active' ? 0.9 : 0.72}
                  strokeDasharray={
                    entry.line === 'blocked'
                      ? '7 8'
                      : entry.line === 'no-capacity'
                        ? '4 6'
                        : entry.line === 'unverified'
                          ? '2 7'
                          : undefined
                  }
                />
                <circle
                  cx={position.x}
                  cy={position.y}
                  r="15"
                  fill={color}
                  opacity="0.1"
                />
                <circle
                  cx={position.x}
                  cy={position.y}
                  r="9"
                  fill="none"
                  stroke={color}
                  strokeOpacity="0.6"
                />
                <circle cx={position.x} cy={position.y} r="3.3" fill={color} />

                <text
                  x={position.x}
                  y={position.y - 26}
                  textAnchor="middle"
                  fill="#f4f0e6"
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize="9.5"
                  letterSpacing="1.4"
                >
                  {entry.village.name.toUpperCase()}
                </text>
                <text
                  x={position.x}
                  y={position.y - 14}
                  textAnchor="middle"
                  fill={color}
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize="8"
                  letterSpacing="0.8"
                  opacity="0.9"
                >
                  {entry.status.toUpperCase()}
                </text>

                {entry.line === 'blocked' ? (
                  <g
                    transform={`translate(${position.breakpoint.x} ${position.breakpoint.y})`}
                  >
                    <circle r="9" fill="#061713" stroke="#d0604a" strokeOpacity="0.55" />
                    <path
                      d="M -4 -4 L 4 4 M 4 -4 L -4 4"
                      stroke="#d0604a"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </g>
                ) : null}

                <circle
                  cx={544}
                  cy={
                    entry.village.id === 'v-a'
                      ? 106
                      : entry.village.id === 'v-b'
                        ? 134
                        : 120
                  }
                  r="2.6"
                  fill={color}
                  opacity="0.9"
                />
              </g>
            )
          })}

          <g transform="translate(566 120)">
            <rect
              x="-11"
              y="-11"
              width="22"
              height="22"
              rx="4"
              transform="rotate(45)"
              fill="#0a241f"
              stroke="#d7a24a"
              strokeWidth="1.8"
            />
            <rect
              x="-4"
              y="-4"
              width="8"
              height="8"
              rx="1.5"
              transform="rotate(45)"
              fill="#d7a24a"
            />
          </g>
          <text
            x="566"
            y="82"
            textAnchor="middle"
            fill="#f4f0e6"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="9.5"
            letterSpacing="1.4"
          >
            CAMPUS
          </text>
          <text
            x="566"
            y="94"
            textAnchor="middle"
            fill="#d7a24a"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="8"
            letterSpacing="0.8"
          >
            09:00 DEADLINE
          </text>
        </svg>
      </div>
      <p className="relative px-5 pb-1 text-[9.5px] leading-snug text-paper/30 sm:hidden">
        Swipe the board sideways to inspect every village.
      </p>

      <div className="relative grid gap-px border-t border-paper/10 bg-paper/10 sm:grid-cols-3">
        {entries.map((entry) => (
          <div key={entry.village.id} className="bg-night/95 px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: TONE_COLORS[entry.tone] }}
                aria-hidden
              />
              <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper/55">
                {entry.village.name}
              </p>
              <p className="ml-auto font-mono text-[9px] uppercase tracking-[0.08em] text-paper/35">
                {entry.village.corridorId}
              </p>
            </div>
            <p
              className="mt-1 text-[12px] font-semibold leading-snug"
              style={{ color: TONE_COLORS[entry.tone] }}
            >
              {entry.status}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-paper/35">
              {entry.seats} spare seat{entry.seats === 1 ? '' : 's'} reachable
            </p>
          </div>
        ))}
      </div>

      <figcaption className="relative flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-paper/10 px-5 py-2.5 text-[9.5px] leading-snug text-paper/35">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-4 bg-mint" aria-hidden />
          Verified capacity
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-4 border-t border-dashed border-gold" aria-hidden />
          No usable seat
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-4 border-t border-dashed border-danger" aria-hidden />
          Blocked corridor
        </span>
        <span className="ml-auto">Schematic of seeded demo data</span>
      </figcaption>
    </figure>
  )
}
