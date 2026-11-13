import {
  Accessibility,
  BusFront,
  Check,
  Clock3,
  Info,
  Lock,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react'
import type {
  AppState,
  Assignment,
  Incident,
  RecoveryProposal,
  Student,
  TransportOption,
  Village,
} from '../data/types'
import { INCIDENT_TYPE_LABELS } from '../data/labels'
import { formatClock } from '../domain/time'
import {
  freeSeats,
  usableRescueOptions,
  verifiedRescueOptions,
} from '../domain/metrics'
import { useApp } from '../state/context'
import { cn } from '../lib/cn'
import { Button } from './Button'
import { Panel } from './Panel'
import { StatusChip } from './StatusChip'

type AssignmentRow = {
  assignment: Assignment
  student: Student
  option: TransportOption
}

function rowsFor(state: AppState, assignmentIds: string[]): AssignmentRow[] {
  return assignmentIds
    .map((id) => {
      const assignment = state.assignments.find((entry) => entry.id === id)
      if (!assignment) return null
      const student = state.students.find(
        (entry) => entry.id === assignment.studentId,
      )
      const option = state.transportOptions.find(
        (entry) => entry.id === assignment.transportOptionId,
      )
      if (!student || !option) return null
      return { assignment, student, option }
    })
    .filter((row): row is AssignmentRow => row !== null)
}

function PlanStat({
  label,
  value,
  hint,
  tone = 'ink',
}: {
  label: string
  value: string | number
  hint: string
  tone?: 'ink' | 'brand' | 'warn'
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-3">
      <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-ink-2">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 font-mono text-[21px] font-medium leading-none tabular-nums',
          tone === 'brand' ? 'text-brand' : tone === 'warn' ? 'text-warn' : 'text-ink',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-snug text-ink-2">{hint}</p>
    </div>
  )
}

function VehicleGroup({
  option,
  rows,
  status,
  remainingSeats,
}: {
  option: TransportOption
  rows: AssignmentRow[]
  status: 'draft' | 'approved'
  remainingSeats: number
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 bg-paper/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-brand/20 bg-brand-soft text-brand-deep">
            <BusFront className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight">
              {option.label} · {option.operator}
            </p>
            <p className="mt-0.5 text-[10.5px] text-ink-2">
              Verified institution vehicle
              {option.accessible ? ' · step-free' : ' · standard access'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip tone={status === 'approved' ? 'ok' : 'brand'} dot={false}>
            {rows.length} {status === 'approved' ? 'confirmed' : 'proposed'}
          </StatusChip>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-2">
            {remainingSeats} free {status === 'draft' ? '· not held' : ''}
          </span>
        </div>
      </div>
      <ul className="divide-y divide-line/50">
        {rows.map(({ assignment, student }) => {
          const pickup = option.arrivalMinByVillage[student.villageId]
          return (
            <li key={assignment.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[12px] font-semibold tabular-nums text-ink">
                    {student.label}
                  </span>
                  {student.isExamDay ? (
                    <StatusChip tone="warn" dot={false}>
                      Exam
                    </StatusChip>
                  ) : null}
                  {student.needsAccessibleVehicle ? (
                    <StatusChip tone="brand" dot={false}>
                      Access
                    </StatusChip>
                  ) : null}
                  {student.previousUnservedDays > 0 ? (
                    <StatusChip tone="neutral" dot={false}>
                      Repeat
                    </StatusChip>
                  ) : null}
                </div>
                <p className="font-mono text-[10.5px] tabular-nums text-ink-2">
                  Stop {pickup !== undefined ? formatClock(pickup) : '—'} · Campus{' '}
                  {formatClock(option.collegeArrivalMin)}
                </p>
              </div>
              <p className="mt-1 text-[10.5px] leading-snug text-ink-2">
                {assignment.explanation}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function UnservedList({
  entries,
  label = 'No verified seat',
}: {
  entries: RecoveryProposal['unserved']
  label?: string
}) {
  const { state } = useApp()
  if (entries.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border border-warn/30">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warn/20 bg-warn-soft px-4 py-3">
        <div className="flex items-center gap-2">
          <TriangleAlert className="size-4 text-warn" aria-hidden />
          <p className="text-[12.5px] font-semibold text-warn">{label}</p>
        </div>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-warn">
          {entries.length} to school
        </span>
      </div>
      <ul className="divide-y divide-line/50">
        {entries.map((entry) => {
          const student = state.students.find(
            (candidate) => candidate.id === entry.studentId,
          )
          const request = state.helpRequests.find(
            (candidate) => candidate.id === entry.requestId,
          )
          return (
            <li key={entry.requestId} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[12px] font-semibold tabular-nums text-ink">
                  {student?.label ?? entry.studentId}
                </span>
                <StatusChip
                  tone={request?.status === 'escalated' ? 'brand' : 'warn'}
                >
                  {request?.status === 'escalated'
                    ? 'Help requested'
                    : 'Unserved'}
                </StatusChip>
              </div>
              <p className="mt-1 text-[10.5px] leading-snug text-ink-2">
                {entry.reason}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PlanSummary({
  rows,
  entries,
  status,
}: {
  rows: AssignmentRow[]
  entries: RecoveryProposal['unserved']
  status: 'draft' | 'approved'
}) {
  const { state } = useApp()

  const grouped = new Map<string, AssignmentRow[]>()
  for (const row of rows) {
    const group = grouped.get(row.option.id)
    if (group) group.push(row)
    else grouped.set(row.option.id, [row])
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <PlanStat
          label={status === 'approved' ? 'Confirmed seats' : 'Proposed seats'}
          value={rows.length}
          hint={status === 'approved' ? 'deducted from capacity' : 'draft, not held yet'}
          tone="brand"
        />
        <PlanStat
          label="Unserved"
          value={entries.length}
          hint="school assistance offered"
          tone="warn"
        />
        <PlanStat
          label="Verified source"
          value={grouped.size}
          hint={`vehicle${grouped.size === 1 ? '' : 's'} used`}
        />
      </div>

      {[...grouped.entries()].map(([optionId, groupRows]) => {
        const vehicle = state.transportOptions.find(
          (entry) => entry.id === optionId,
        )
        if (!vehicle) return null
        return (
          <VehicleGroup
            key={optionId}
            option={vehicle}
            rows={groupRows}
            status={status}
            remainingSeats={freeSeats(state, vehicle)}
          />
        )
      })}

      <UnservedList
        entries={entries}
        label={status === 'draft' ? 'No verified seat in this draft' : 'No verified seat'}
      />
    </div>
  )
}

function DraftBlock({
  proposal,
  incident,
}: {
  proposal: RecoveryProposal
  incident: Incident
}) {
  const { state, dispatch } = useApp()
  const rows = rowsFor(state, proposal.assignmentIds)
  const isSupplement = proposal.kind === 'replan'
  const nothingPlanned = rows.length === 0 && proposal.unserved.length === 0

  return (
    <div className="space-y-3">
      {isSupplement ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand-soft/60 px-3.5 py-3">
          <Clock3 className="mt-px size-4 shrink-0 text-brand-deep" aria-hidden />
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold leading-tight text-brand-deep">
              Supplemental draft for late requests
            </p>
            <p className="mt-0.5 text-[10.5px] leading-snug text-brand-deep/80">
              Approved seats are untouched. Only the late requests are planned
              here, against the verified capacity that is left over.
            </p>
          </div>
        </div>
      ) : null}

      <PlanSummary rows={rows} entries={proposal.unserved} status="draft" />

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button
          disabled={nothingPlanned}
          onClick={() =>
            dispatch({ type: 'APPROVE_PROPOSAL', proposalId: proposal.id })
          }
        >
          <Check className="size-4" aria-hidden />
          {rows.length > 0
            ? `Approve and confirm ${rows.length} seat${rows.length === 1 ? '' : 's'}`
            : 'Approve unserved outcome'}
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            dispatch({
              type: isSupplement ? 'RUN_REPLAN' : 'RUN_RECOVERY',
              incidentId: incident.id,
            })
          }
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Recompute
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            dispatch({ type: 'REJECT_PROPOSAL', proposalId: proposal.id })
          }
        >
          <X className="size-3.5" aria-hidden />
          Discard draft
        </Button>
      </div>
      <p className="text-[10.5px] leading-snug text-ink-2">
        Draft created at {formatClock(proposal.createdAtMin)}. Approving
        re-checks verification, village coverage, accessibility, deadlines,
        blocked corridors, and remaining capacity before confirming anything.
      </p>
    </div>
  )
}

function ApprovedBlock({
  proposals,
  incident,
}: {
  proposals: RecoveryProposal[]
  incident: Incident
}) {
  const { state, dispatch } = useApp()

  const rows = rowsFor(
    state,
    proposals.flatMap((proposal) => proposal.assignmentIds),
  )
  const entries = proposals.flatMap((proposal) => proposal.unserved)
  const supplements = proposals.filter(
    (proposal) => proposal.kind === 'replan',
  ).length
  const vehicleLabels = [...new Set(rows.map((row) => row.option.label))]

  const latePending = state.helpRequests.filter(
    (request) =>
      request.incidentId === incident.id && request.status === 'pending',
  )

  return (
    <div className="space-y-3">
      <PlanSummary rows={rows} entries={entries} status="approved" />

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <Button variant="secondary" disabled>
          <Lock className="size-3.5" aria-hidden />
          Plan approved · seats final
        </Button>
        <span className="text-[10.5px] leading-snug text-ink-2">
          {rows.length} confirmed seat{rows.length === 1 ? '' : 's'} on{' '}
          {vehicleLabels.join(', ') || 'no vehicle'}. {entries.length} student
          {entries.length === 1 ? '' : 's'} unserved.
          {supplements > 0
            ? ` Includes ${supplements} supplemental plan${supplements === 1 ? '' : 's'} for late reports.`
            : ''}
        </span>
      </div>

      {latePending.length > 0 ? (
        <div className="rounded-xl border border-brand/25 bg-brand-soft/50 px-3.5 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-deep">
                <Clock3 className="size-3.5" aria-hidden />
                {latePending.length} late report
                {latePending.length === 1 ? '' : 's'} after approval
              </p>
              <p className="mt-1 text-[10.5px] leading-snug text-brand-deep/85">
                {latePending
                  .map((request) => {
                    const student = state.students.find(
                      (entry) => entry.id === request.studentId,
                    )
                    return `${student?.label ?? request.studentId} · ${formatClock(request.createdAtMin)}`
                  })
                  .join(' · ')}
              </p>
              <p className="mt-1 text-[10.5px] leading-snug text-brand-deep/85">
                Approved seats stay fixed. A supplemental draft only uses
                verified capacity that is still free.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() =>
                dispatch({ type: 'RUN_REPLAN', incidentId: incident.id })
              }
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Plan late requests
            </Button>
          </div>
        </div>
      ) : null}

      <p className="text-[10.5px] leading-snug text-ink-2">
        Confirmed seats are deducted from verified capacity. A student without a
        seat can request school assistance; this demo contacts nobody.
      </p>
    </div>
  )
}

function IncidentRecovery({ incident }: { incident: Incident }) {
  const { state, dispatch } = useApp()

  const option = state.transportOptions.find(
    (entry) => entry.id === incident.transportOptionId,
  )
  const requests = state.helpRequests.filter(
    (request) => request.incidentId === incident.id,
  )

  const proposals = state.proposals.filter(
    (entry) => entry.incidentId === incident.id && entry.status !== 'discarded',
  )
  const initial = proposals.find((entry) => entry.kind !== 'replan')
  const initialDraft = initial?.status === 'draft' ? initial : undefined
  const approved = proposals.filter((entry) => entry.status === 'approved')
  const replanDraft = proposals.find(
    (entry) => entry.kind === 'replan' && entry.status === 'draft',
  )
  const discarded = state.proposals.some(
    (entry) => entry.incidentId === incident.id && entry.status === 'discarded',
  )

  const plannedRows = rowsFor(
    state,
    proposals.flatMap((entry) => entry.assignmentIds),
  )

  // Capacity the engine could actually offer this incident: verified, active,
  // serving an affected village, and not crossing a blocked corridor.
  const usableSeats = usableRescueOptions(
    state,
    incident.affectedVillageIds,
  ).reduce((total, entry) => total + freeSeats(state, entry), 0)

  const affectedVillages = incident.affectedVillageIds
    .map((villageId) =>
      state.villages.find((entry) => entry.id === villageId),
    )
    .filter((entry): entry is Village => Boolean(entry))
  const seatByVillage = affectedVillages.map((village) => ({
    village,
    seats: usableRescueOptions(state, [village.id]).reduce(
      (total, entry) => total + freeSeats(state, entry),
      0,
    ),
    hasVerifiedService: verifiedRescueOptions(state).some((entry) =>
      entry.villageIds.includes(village.id),
    ),
  }))
  const servedVillages = seatByVillage.filter((entry) => entry.seats > 0)
  const blockedVillages = seatByVillage.filter(
    (entry) => entry.seats === 0 && entry.hasVerifiedService,
  )
  const uncoveredVillages = seatByVillage.filter(
    (entry) => entry.seats === 0 && !entry.hasVerifiedService,
  )
  const servedNames = servedVillages.map((entry) => entry.village.name)
  const blockedNames = blockedVillages.map((entry) => entry.village.name)
  const uncoveredNames = uncoveredVillages.map((entry) => entry.village.name)
  const affectedNames = affectedVillages.map((entry) => entry.name)

  const chip = replanDraft
    ? { tone: 'brand' as const, label: 'Supplemental draft' }
    : approved.length > 0
      ? { tone: 'ok' as const, label: 'Plan approved' }
      : initialDraft
        ? { tone: 'brand' as const, label: 'Draft plan' }
        : { tone: 'neutral' as const, label: 'Ready to plan' }

  const showRunBox = !initialDraft && approved.length === 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[13.5px] font-semibold leading-tight">
            {option?.label ?? 'Service'} · {INCIDENT_TYPE_LABELS[incident.type]}
          </h3>
          <p className="mt-0.5 text-[11.5px] leading-snug text-ink-2">
            Confirmed at{' '}
            {formatClock(incident.confirmedAtMin ?? state.clockMin)} ·{' '}
            {requests.length} affected request{requests.length === 1 ? '' : 's'}
          </p>
        </div>
        <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
      </div>

      {showRunBox ? (
        <div className="rounded-xl border border-line bg-paper/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold">
                {usableSeats > 0
                  ? `${usableSeats} verified spare seat${usableSeats === 1 ? '' : 's'} can reach ${servedNames.join(' and ')}`
                  : `No verified spare seat can reach ${affectedNames.join(' or ')}`}
              </p>
              {blockedNames.length > 0 ? (
                <p className="mt-1 text-[11px] font-medium leading-snug text-danger">
                  No verified vehicle can reach {blockedNames.join(' or ')}; the
                  access road is blocked and no detour is invented.
                </p>
              ) : null}
              {uncoveredNames.length > 0 ? (
                <p className="mt-1 text-[11px] font-medium leading-snug text-danger">
                  No verified institution vehicle serves{' '}
                  {uncoveredNames.join(' or ')}.
                </p>
              ) : null}
              <p className="mt-0.5 text-[11px] leading-snug text-ink-2">
                {requests.length === 0
                  ? 'No student requests are attached to this incident yet.'
                  : usableSeats > 0
                    ? 'The engine will allocate in priority order and list every student it cannot serve.'
                    : 'The analysis still runs honestly: every request will be marked unserved with the exact blocking constraint.'}
              </p>
            </div>
            <Button
              size="sm"
              disabled={requests.length === 0}
              onClick={() =>
                dispatch({ type: 'RUN_RECOVERY', incidentId: incident.id })
              }
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Run recovery analysis
            </Button>
          </div>
          {discarded ? (
            <p className="mt-3 border-t border-dashed border-line pt-2.5 text-[10.5px] leading-snug text-ink-2">
              The previous draft was discarded. Every request it covered is back
              to pending, and no seat was held.
            </p>
          ) : null}
          <p className="mt-3 border-t border-dashed border-line pt-2.5 text-[10.5px] leading-snug text-ink-2">
            Priority: exam day, then repeat unserved days, then students with
            fewest viable alternatives. Ties break on student ID, so the same
            input always produces the same plan.
          </p>
        </div>
      ) : (
        <>
          {initialDraft ? (
            <DraftBlock proposal={initialDraft} incident={incident} />
          ) : null}
          {approved.length > 0 ? (
            <ApprovedBlock proposals={approved} incident={incident} />
          ) : null}
          {replanDraft ? (
            <DraftBlock proposal={replanDraft} incident={incident} />
          ) : null}
        </>
      )}

      {plannedRows.some((row) => row.option.accessible) ? (
        <p className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-brand">
          <Accessibility className="size-3.5" aria-hidden />
          Step-free seats are assigned only to students who need them.
        </p>
      ) : null}
    </div>
  )
}

export function RecoveryPanel() {
  const { state } = useApp()
  const confirmed = state.incidents.filter(
    (incident) => incident.status === 'confirmed',
  )

  return (
    <Panel
      title="Recovery plan"
      meta="Deterministic allocation from verified spare seats. Each confirmed incident is planned separately; a draft reserves nothing until you approve it. Late reports get a supplemental plan."
      action={
        <StatusChip tone={confirmed.length > 0 ? 'brand' : 'neutral'}>
          {confirmed.length > 0 ? 'Planning open' : 'Awaiting confirmation'}
        </StatusChip>
      }
      bodyClassName="space-y-5 p-4 sm:p-5"
    >
      {confirmed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-paper/40 px-4 py-8 text-center">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="size-4 text-ink-2" aria-hidden />
            No confirmed disruption
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-snug text-ink-2">
            Recovery planning unlocks after you confirm a student report. An
            unverified report never allocates a seat.
          </p>
        </div>
      ) : (
        <>
          {confirmed.length > 1 ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-brand/25 bg-brand-soft/50 px-3.5 py-3">
              <Info className="mt-px size-4 shrink-0 text-brand-deep" aria-hidden />
              <p className="text-[11px] leading-snug text-brand-deep/90">
                {confirmed.length} confirmed incidents share one backup fleet.
                Each plan is computed separately, and approval re-checks
                capacity across every confirmed seat, so a second plan cannot
                overbook the first one.
              </p>
            </div>
          ) : null}
          {confirmed.map((incident) => (
            <IncidentRecovery key={incident.id} incident={incident} />
          ))}
        </>
      )}
    </Panel>
  )
}
