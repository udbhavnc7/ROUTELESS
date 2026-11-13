import { Radar, TriangleAlert } from 'lucide-react'
import type { ScenarioMeta } from '../data/scenarios'
import { StatusChip } from './StatusChip'

/**
 * Seeded crisis facts. Only scenarios that declare a briefing render this;
 * everything shown here comes from the scenario fixture, never from a live feed.
 */
export function ScenarioBriefing({ scenario }: { scenario: ScenarioMeta }) {
  if (!scenario.briefing || scenario.briefing.length === 0) return null

  return (
    <section
      aria-label={`${scenario.title} briefing`}
      className="panel relative overflow-hidden rounded-2xl border border-warn/25 bg-[#fbf3e0]"
    >
      <div className="hatch pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-warn/70 via-warn/30 to-transparent"
      />

      <div className="relative px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-warn/20 pb-3">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-warn/30 bg-warn-soft text-warn">
              <TriangleAlert className="size-4" aria-hidden />
            </span>
            <div>
              <p className="inline-flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-warn/85">
                <Radar className="size-3" aria-hidden />
                Dispatch bulletin · simulated
              </p>
              <h2 className="mt-1 font-display text-[20px] font-semibold leading-tight text-ink">
                {scenario.title}
              </h2>
            </div>
          </div>
          <StatusChip tone="warn" dot={false}>
            Demo data
          </StatusChip>
        </div>

        <p className="mt-3 max-w-3xl text-[12.5px] leading-relaxed text-ink-2">
          {scenario.description}
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {scenario.briefing.map((entry) => (
            <div
              key={entry.label}
              className="relative rounded-lg border border-warn/20 bg-surface/75 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-3.5 top-0 h-px bg-gradient-to-r from-warn/50 to-transparent"
              />
              <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-ink-2">
                {entry.label}
              </p>
              <p className="mt-1.5 font-display text-[18px] font-semibold leading-tight text-ink">
                {entry.value}
              </p>
              <p className="mt-1 text-[10.5px] leading-snug text-ink-2">
                {entry.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
