import {
  Accessibility,
  BusFront,
  CalendarClock,
  Check,
  Clock3,
  Info,
  MapPin,
  RouteOff,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { ChipTone } from '../components/StatusChip'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { NetworkSchematic } from '../components/NetworkSchematic'
import { PageHeader } from '../components/PageHeader'
import { Panel } from '../components/Panel'
import { RecoveryPanel } from '../components/RecoveryPanel'
import { ScenarioBriefing } from '../components/ScenarioBriefing'
import { SeatMeter } from '../components/SeatMeter'
import { StatusChip } from '../components/StatusChip'
import { Button } from '../components/Button'
import type {
  HelpRequest,
  Incident,
  IncidentType,
  ScenarioId,
  Student,
  TransportOption,
  Village,
} from '../data/types'
import {
  INCIDENT_STATUS_LABELS,
  INCIDENT_TYPE_LABELS,
  VEHICLE_KIND_LABELS,
  VEHICLE_STATUS_LABELS,
} from '../data/labels'
import { SCENARIO_CATALOG } from '../data/scenarios'
import {
  dashboardMetrics,
  displayVehicleStatus,
  freeSeats,
  nonDismissedIncidents,
} from '../domain/metrics'
import { formatClock } from '../domain/time'
import { useApp } from '../state/context'
import { cn } from '../lib/cn'

const INCIDENT_ICONS: Record<IncidentType, typeof BusFront> = {
  no_show: BusFront,
  full: BusFront,
  delay: Clock3,
  breakdown: TriangleAlert,
  road_block: RouteOff,
}

type DemandGroup = {
  village: Village
  incident: Incident
  option: TransportOption
  roster: Student[]
  requests: HelpRequest[]
}

function requestChip(
  request: HelpRequest,
  incident: Incident,
): { label: string; tone: ChipTone } {
  if (request.status === 'confirmed') return { label: 'Seat confirmed', tone: 'ok' }
  if (request.status === 'unserved') return { label: 'Unserved', tone: 'danger' }
  if (request.status === 'escalated') return { label: 'Help requested', tone: 'warn' }
  if (request.status === 'proposed') return { label: 'Proposed', tone: 'brand' }
  return incident.status === 'confirmed'
    ? { label: 'Awaiting plan', tone: 'brand' }
    : { label: 'Awaiting review', tone: 'warn' }
}

const METRIC_TONES = {
  mint: { value: 'text-mint', rail: 'bg-mint/60' },
  gold: { value: 'text-gold', rail: 'bg-gold/60' },
  danger: { value: 'text-danger', rail: 'bg-danger/60' },
  paper: { value: 'text-paper', rail: 'bg-paper/30' },
} as const

function Metric({
  label,
  value,
  hint,
  tone = 'paper',
}: {
  label: string
  value: string | number
  hint: string
  tone?: keyof typeof METRIC_TONES
}) {
  const style = METRIC_TONES[tone]
  return (
    <div className="relative bg-night px-4 py-3.5">
      <span
        aria-hidden="true"
        className={cn('absolute inset-x-4 top-0 h-px opacity-70', style.rail)}
      />
      <dt className="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-paper/45">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-2 font-mono text-[27px] font-medium leading-none tabular-nums',
          style.value,
        )}
      >
        {value}
      </dd>
      <p className="mt-1.5 text-[10.5px] leading-snug text-paper/45">{hint}</p>
    </div>
  )
}

const BOUNDARIES = [
  ['Schedule-based only', 'No GPS, live feed, or government system is connected.'],
  ['Device-local reports', 'Reports stay in this browser; nobody is notified.'],
  ['No real dispatch', 'No school or operator is contacted by this demo.'],
  ['Not authentication', 'The role switch only changes the view.'],
]

export function CoordinatorDashboard() {
  const { state, dispatch } = useApp()
  const [pendingScenario, setPendingScenario] = useState<ScenarioId | null>(null)
  const metrics = dashboardMetrics(state)
  const incidents = nonDismissedIncidents(state)
  const dismissed = state.incidents.filter((i) => i.status === 'dismissed')
  const activeScenario =
    SCENARIO_CATALOG.find((scenario) => scenario.id === state.scenarioId) ??
    SCENARIO_CATALOG[0]
  const pendingMeta = SCENARIO_CATALOG.find(
    (scenario) => scenario.id === pendingScenario,
  )
  const institution =
    state.institutions.find((i) => i.id === state.institutionId) ??
    state.institutions[0]
  const classStart = institution?.classStartMin ?? 9 * 60

  const demandGroups: DemandGroup[] = []
  for (const village of state.villages) {
    const incident = state.incidents.find(
      (entry) =>
        entry.status !== 'dismissed' &&
        entry.affectedVillageIds.includes(village.id),
    )
    if (!incident) continue
    const option = state.transportOptions.find(
      (entry) => entry.id === incident.transportOptionId,
    )
    if (!option) continue
    const roster = state.students.filter(
      (student) =>
        student.villageId === village.id && student.routeOptionId === option.id,
    )
    if (roster.length === 0) continue
    const rosterIds = new Set(roster.map((student) => student.id))
    demandGroups.push({
      village,
      incident,
      option,
      roster,
      requests: state.helpRequests.filter(
        (request) =>
          request.incidentId === incident.id &&
          rosterIds.has(request.studentId),
      ),
    })
  }

  const villageName = (villageId: string) =>
    state.villages.find((village) => village.id === villageId)?.name ?? villageId

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coordinator view · demo role switch"
        title="Disruption board"
        description="Verify what students report, review the deterministic recovery draft, and approve it before any seat is confirmed. Nothing is allocated from an unverified report."
        aside={
          <StatusChip tone="warn" dot={false}>
            Demo coordinator
          </StatusChip>
        }
      />

      <section
        aria-label="Operations picture"
        className="overflow-hidden rounded-2xl border border-night-3/70 bg-night shadow-panel"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper/10 px-4 py-2.5">
          <p className="inline-flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper/60">
            <span className="size-1.5 rounded-full bg-gold" aria-hidden />
            Operations picture
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper/35">
            Derived from seeded demo data
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-paper/10 sm:grid-cols-3 lg:grid-cols-6">
          <Metric
            label="Reports"
            value={metrics.reports}
            hint="unique students"
            tone="gold"
          />
          <Metric
            label="Affected"
            value={metrics.affected}
            hint="in confirmed incident"
            tone="danger"
          />
          <Metric
            label="Confirmed"
            value={`${metrics.confirmedIncidents}/${incidents.length}`}
            hint="of open signals"
            tone="mint"
          />
          <Metric
            label="Backup seats"
            value={metrics.backupSeats}
            hint="reachable verified seats"
            tone="mint"
          />
          <Metric
            label="Placements"
            value={metrics.confirmedPlacements}
            hint="after approval"
            tone="mint"
          />
          <Metric
            label="Unserved"
            value={metrics.unserved}
            hint="including help requests"
            tone="danger"
          />
        </dl>
      </section>

      <ScenarioBriefing scenario={activeScenario} />

      <NetworkSchematic />

      <RecoveryPanel />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Panel
            title="Incident queue"
            meta="Student reports are signals. Only coordinator confirmation makes a disruption operational."
            action={
              <StatusChip tone={incidents.length > 0 ? 'warn' : 'neutral'}>
                {incidents.length} open
              </StatusChip>
            }
            bodyClassName="space-y-3 p-4 sm:p-5"
          >
            {incidents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-strong bg-paper/40 px-4 py-8 text-center">
                <p className="text-sm font-semibold">No open signals</p>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-snug text-ink-2">
                  Student reports appear here for review. Reset the demo to
                  restore the seeded {activeScenario.title.toLowerCase()}{' '}
                  scenario.
                </p>
              </div>
            ) : (
              incidents.map((incident) => {
                const option = state.transportOptions.find(
                  (entry) => entry.id === incident.transportOptionId,
                )
                if (!option) return null
                const Icon = INCIDENT_ICONS[incident.type]
                const confirmed = incident.status === 'confirmed'
                const tone: ChipTone = confirmed ? 'danger' : 'warn'
                const vehicleStatus = displayVehicleStatus(state, option)

                return (
                  <article
                    key={incident.id}
                    className="relative overflow-hidden rounded-xl border border-line bg-surface p-4 pl-5 shadow-tile"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-y-0 left-0 w-[3px]',
                        confirmed ? 'bg-danger/70' : 'bg-warn/70',
                      )}
                    />
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'grid size-10 shrink-0 place-items-center rounded-lg border',
                          confirmed
                            ? 'border-danger/25 bg-danger-soft text-danger'
                            : 'border-warn/25 bg-warn-soft text-warn',
                        )}
                      >
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                          <div>
                            <h3 className="text-[14.5px] font-semibold leading-tight">
                              {option.label} · {INCIDENT_TYPE_LABELS[incident.type]}
                            </h3>
                            <p className="mt-0.5 text-[11.5px] text-ink-2">
                              Reported by a student ·{' '}
                              {formatClock(incident.reportedAtMin)} ·{' '}
                              {incident.affectedVillageIds
                                .map(villageName)
                                .join(', ')}
                            </p>
                          </div>
                          <StatusChip tone={tone}>
                            {INCIDENT_STATUS_LABELS[incident.status]}
                          </StatusChip>
                        </div>

                        <p className="mt-2 text-[12.5px] leading-snug text-ink-2">
                          {incident.details}
                        </p>

                        {incident.status === 'reported' ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                dispatch({
                                  type: 'CONFIRM_INCIDENT',
                                  incidentId: incident.id,
                                })
                              }
                            >
                              <Check className="size-3.5" aria-hidden />
                              Confirm disruption
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                dispatch({
                                  type: 'DISMISS_INCIDENT',
                                  incidentId: incident.id,
                                })
                              }
                            >
                              <X className="size-3.5" aria-hidden />
                              Dismiss report
                            </Button>
                          </div>
                        ) : (
                          <p className="mt-3 border-t border-dashed border-line pt-2.5 text-[11.5px] leading-snug text-ink-2">
                            Confirmed at{' '}
                            {formatClock(incident.confirmedAtMin ?? state.clockMin)}.
                            {' '}
                            {incident.type === 'full'
                              ? `${option.label} stays in service, but it offers no recovery capacity.`
                              : `${option.label} is marked ${VEHICLE_STATUS_LABELS[vehicleStatus].toLowerCase()} for planning.`}{' '}
                            Affected requests now count on the board.
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })
            )}

            {dismissed.length > 0 ? (
              <div className="space-y-2 border-t border-line/70 pt-3">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-2">
                  Reviewed
                </p>
                {dismissed.map((incident) => {
                  const option = state.transportOptions.find(
                    (entry) => entry.id === incident.transportOptionId,
                  )
                  return (
                    <div
                      key={incident.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/70 bg-surface px-3 py-2"
                    >
                      <p className="text-[12px] text-ink-2">
                        <span className="font-semibold text-ink">
                          {option?.label ?? 'Service'}
                        </span>{' '}
                        · {INCIDENT_TYPE_LABELS[incident.type]} ·{' '}
                        {formatClock(incident.reportedAtMin)}
                      </p>
                      <StatusChip tone="neutral">Dismissed</StatusChip>
                    </div>
                  )
                })}
                <p className="text-[10.5px] leading-snug text-ink-2">
                  Dismissed reports do not make a service eligible for planning.
                </p>
              </div>
            ) : null}
          </Panel>

          <Panel
            title="Affected demand"
            meta="Roster grouped by village. One request per student per incident."
            bodyClassName="space-y-5 p-4 sm:p-5"
          >
            {demandGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-strong bg-paper/40 px-4 py-8 text-center">
                <p className="text-sm font-semibold">No active demand</p>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-snug text-ink-2">
                  A student report creates demand once the disruption is confirmed.
                </p>
              </div>
            ) : (
              demandGroups.map((group) => (
                <div key={`${group.village.id}-${group.incident.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <MapPin className="size-3.5 text-ink-2" aria-hidden />
                      <h3 className="text-[13.5px] font-semibold">
                        {group.village.name} · {group.option.label}
                      </h3>
                      <StatusChip
                        tone={
                          group.incident.status === 'confirmed' ? 'danger' : 'warn'
                        }
                      >
                        {group.incident.status === 'confirmed'
                          ? 'Confirmed disruption'
                          : 'Unverified report'}
                      </StatusChip>
                    </div>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-2">
                      {group.roster.length} on route · {group.requests.length}{' '}
                      reports
                    </p>
                  </div>

                  <ul className="divide-y divide-line/50">
                    {group.roster.map((student) => {
                      const request = group.requests.find(
                        (entry) => entry.studentId === student.id,
                      )
                      const chip = request
                        ? requestChip(request, group.incident)
                        : { label: 'No report', tone: 'neutral' as ChipTone }
                      return (
                        <li
                          key={student.id}
                          className="flex items-center justify-between gap-3 py-[7px]"
                        >
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[11.5px] tabular-nums text-ink">
                              {student.label}
                            </span>
                            {student.isExamDay ? (
                              <span
                                title="Exam at 09:00 — zero grace on arrival"
                                className="inline-flex items-center gap-1 rounded border border-warn/25 bg-warn-soft px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-warn"
                              >
                                <CalendarClock className="size-2.5" aria-hidden />
                                Exam
                              </span>
                            ) : null}
                            {student.needsAccessibleVehicle ? (
                              <span
                                title="Needs a step-free vehicle"
                                className="inline-flex items-center gap-1 rounded border border-brand/20 bg-brand-soft px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-brand-deep"
                              >
                                <Accessibility className="size-2.5" aria-hidden />
                                Access
                              </span>
                            ) : null}
                            {student.previousUnservedDays > 0 ? (
                              <span
                                title={`Unserved on ${student.previousUnservedDays} previous demo day(s)`}
                                className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-ink-2"
                              >
                                Repeat
                              </span>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="font-mono text-[10px] tabular-nums text-ink-2">
                              {request ? formatClock(request.createdAtMin) : '—'}
                            </span>
                            <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))
            )}
          </Panel>

          <Panel
            title="Transport inventory"
            meta="Only verified, active institution vehicles are eligible for recovery. Unverified options are shown for context."
            bodyClassName="grid gap-3 p-4 sm:grid-cols-2 sm:p-5"
          >
            {state.transportOptions.map((option) => {
              const status = displayVehicleStatus(state, option)
              const free = freeSeats(state, option)
              const late = option.collegeArrivalMin > classStart
              const blockedVillages = state.villages
                .filter((village) =>
                  option.blockedCorridorIds.includes(village.corridorId),
                )
                .map((village) => village.name)
              const statusTone: ChipTone =
                status === 'cancelled'
                  ? 'danger'
                  : status === 'delayed'
                    ? 'warn'
                    : 'ok'

              return (
                <article
                  key={option.id}
                  className={cn(
                    'rounded-xl border p-4 transition-colors',
                    option.verified
                      ? 'border-line bg-surface shadow-tile hover:border-brand/35'
                      : 'border-dashed border-line-strong bg-paper/20',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-display text-lg font-semibold leading-none">
                          {option.label}
                        </h3>
                        <span className="text-[10.5px] text-ink-2">
                          {VEHICLE_KIND_LABELS[option.kind]}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-ink-2">{option.operator}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusChip
                        tone={option.verified ? 'ok' : 'neutral'}
                        dot={false}
                      >
                        {option.verified ? (
                          <ShieldCheck className="size-3" aria-hidden />
                        ) : (
                          <ShieldAlert className="size-3" aria-hidden />
                        )}
                        {option.verified ? 'Verified' : 'Unverified'}
                      </StatusChip>
                      <StatusChip tone={statusTone}>
                        {VEHICLE_STATUS_LABELS[status]}
                      </StatusChip>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-y border-dashed border-line py-2.5 text-center">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-ink-2">
                        Departs
                      </p>
                      <p className="mt-0.5 font-mono text-[12.5px] tabular-nums">
                        {formatClock(option.departureMin)}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-ink-2">
                        Campus
                      </p>
                      <p
                        className={cn(
                          'mt-0.5 font-mono text-[12.5px] tabular-nums',
                          late && 'text-danger',
                        )}
                      >
                        {formatClock(option.collegeArrivalMin)}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-ink-2">
                        Free
                      </p>
                      <p className="mt-0.5 font-mono text-[12.5px] font-medium tabular-nums text-brand">
                        {free}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <SeatMeter
                      capacity={option.capacity}
                      occupied={option.occupiedSeats}
                      free={free}
                      label={`${option.label} seats`}
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] text-ink-2">
                    <span>{option.villageIds.map(villageName).join(' · ')}</span>
                    <span className="font-mono tabular-nums">
                      {option.capacity} seats · {option.occupiedSeats} in use
                    </span>
                  </div>

                  {option.accessible ? (
                    <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-brand">
                      <Accessibility className="size-3" aria-hidden />
                      Step-free accessible
                    </p>
                  ) : null}

                  {option.note && blockedVillages.length === 0 ? (
                    <p
                      className={cn(
                        'mt-2 text-[10.5px] leading-snug',
                        option.verified ? 'text-ink-2' : 'text-danger',
                      )}
                    >
                      {option.note}
                    </p>
                  ) : null}

                  {blockedVillages.length > 0 ? (
                    <p className="mt-2 flex items-start gap-1.5 text-[10.5px] font-medium leading-snug text-danger">
                      <RouteOff className="mt-px size-3 shrink-0" aria-hidden />
                      {blockedVillages.join(', ')} access road blocked. Not
                      eligible for recovery, even when verified.
                    </p>
                  ) : null}

                  {late ? (
                    <p className="mt-1 text-[10.5px] leading-snug text-danger">
                      Campus arrival is after the {formatClock(classStart)} deadline.
                    </p>
                  ) : null}
                </article>
              )
            })}
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Panel
            title="Scenarios"
            meta="Each scenario is a full reseed. Switching clears reports, drafts, and approved seats, and keeps the active view."
            bodyClassName="space-y-2 p-4 sm:p-5"
          >
            {SCENARIO_CATALOG.map((scenario) => {
              const active = scenario.id === state.scenarioId
              return (
                <button
                  key={scenario.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (!active) setPendingScenario(scenario.id)
                  }}
                  className={cn(
                    'w-full rounded-xl border px-3.5 py-3 text-left transition-all',
                    active
                      ? 'border-night-3 bg-night text-paper shadow-panel'
                      : 'border-line bg-paper/30 hover:-translate-y-px hover:border-brand/40 hover:bg-brand-soft/30',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12.5px] font-semibold leading-tight">
                      {scenario.title}
                    </p>
                    <StatusChip tone={active ? 'ok' : 'neutral'} dot={active}>
                      {active ? 'Active' : 'Load'}
                    </StatusChip>
                  </div>
                  <p
                    className={cn(
                      'mt-1 text-[10.5px] leading-snug',
                      active ? 'text-paper/60' : 'text-ink-2',
                    )}
                  >
                    {scenario.description}
                  </p>
                </button>
              )
            })}
            <p className="pt-1 text-[10.5px] leading-snug text-ink-2">
              Switching never edits the current plan. It loads a separate seeded
              demo so outcomes can be compared side by side.
            </p>
          </Panel>

          <section
            aria-label="Demo boundaries"
            className="panel-dark overflow-hidden rounded-2xl border border-night-3/80 bg-night text-paper"
          >
            <div className="flex items-center justify-between gap-3 border-b border-paper/10 px-5 py-4">
              <h2 className="font-display text-[18px] font-semibold leading-tight">
                Demo boundaries
              </h2>
              <span className="size-1.5 rounded-full bg-mint" aria-hidden />
            </div>
            <div className="space-y-3.5 p-5">
              {BOUNDARIES.map(([title, detail]) => (
                <div key={title} className="flex gap-2.5">
                  <Info
                    className="mt-0.5 size-3.5 shrink-0 text-mint/80"
                    aria-hidden
                  />
                  <div>
                    <p className="text-[12px] font-semibold leading-tight">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[10.5px] leading-snug text-paper/55">
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={pendingScenario !== null}
        title={`Load “${pendingMeta?.title ?? 'scenario'}”?`}
        description="This reloads the demo from the selected seed and clears every report, draft, and approved seat saved on this device. The coordinator view stays active."
        confirmLabel="Load scenario"
        onCancel={() => setPendingScenario(null)}
        onConfirm={() => {
          if (pendingScenario) {
            dispatch({ type: 'LOAD_SCENARIO', scenarioId: pendingScenario })
          }
          setPendingScenario(null)
        }}
      />
    </div>
  )
}
