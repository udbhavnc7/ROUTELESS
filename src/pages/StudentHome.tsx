import { useState } from 'react'
import {
  Accessibility,
  ArrowUpRight,
  BusFront,
  Check,
  ChevronDown,
  Clock3,
  Info,
  RouteOff,
  TriangleAlert,
  Users,
} from 'lucide-react'
import type { ChipTone } from '../components/StatusChip'
import { PageHeader } from '../components/PageHeader'
import { RouteRail } from '../components/RouteRail'
import { ScenarioBriefing } from '../components/ScenarioBriefing'
import { StatusChip } from '../components/StatusChip'
import { Button } from '../components/Button'
import type { CommuteStage } from '../domain/studentView'
import { getStudentSituation } from '../domain/studentView'
import {
  freeSeats,
  reportedStudentIds,
  studentsOnOption,
  usableRescueOptions,
} from '../domain/metrics'
import { formatClock } from '../domain/time'
import type { IncidentType } from '../data/types'
import { SCENARIO_CATALOG } from '../data/scenarios'
import { useApp } from '../state/context'
import { cn } from '../lib/cn'

const REPORT_OPTIONS: {
  type: IncidentType
  label: string
  hint: string
  icon: typeof BusFront
}[] = [
  { type: 'no_show', label: "Bus didn't come", hint: 'No sign of it at the stop', icon: BusFront },
  { type: 'full', label: 'Bus was full', hint: 'It came, but there was no room', icon: Users },
  { type: 'delay', label: 'Bus is late', hint: 'More than 15 minutes behind', icon: Clock3 },
  { type: 'breakdown', label: 'Bus broke down', hint: 'Stopped on the way', icon: TriangleAlert },
  { type: 'road_block', label: 'Road is blocked', hint: 'Flood, closure, or detour', icon: RouteOff },
]

const STAGE_CHIPS: Record<CommuteStage, { label: string; tone: ChipTone }> = {
  scheduled: { label: 'Scheduled', tone: 'ok' },
  reported: { label: 'Unverified report', tone: 'warn' },
  confirmed: { label: 'Disruption confirmed', tone: 'danger' },
  dismissed: { label: 'Report dismissed', tone: 'neutral' },
  proposed: { label: 'Seat proposed', tone: 'brand' },
  assigned: { label: 'Seat confirmed', tone: 'ok' },
  unserved: { label: 'Unserved', tone: 'danger' },
  escalated: { label: 'Help requested', tone: 'warn' },
}

type StepStatus = 'done' | 'active' | 'todo'

function RequestStep({
  status,
  title,
  detail,
  last = false,
}: {
  status: StepStatus
  title: string
  detail: string
  last?: boolean
}) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last ? (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-[9px] top-6 w-0 border-l border-dashed border-line"
        />
      ) : null}
      <span
        className={cn(
          'mt-0.5 grid size-[19px] shrink-0 place-items-center rounded-full border',
          status === 'done'
            ? 'border-brand bg-brand text-surface'
            : status === 'active'
              ? 'border-warn bg-warn-soft text-warn'
              : 'border-line-strong bg-paper text-ink-2',
        )}
      >
        {status === 'done' ? (
          <Check className="size-3" aria-hidden />
        ) : (
          <span
            className={cn(
              'size-1.5 rounded-full',
              status === 'active' ? 'bg-warn' : 'bg-line-strong',
            )}
          />
        )}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'text-[13px] font-semibold leading-tight',
            status === 'todo' && 'text-ink-2',
          )}
        >
          {title}
        </p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-ink-2">{detail}</p>
      </div>
    </li>
  )
}

export function StudentHome() {
  const { state, dispatch } = useApp()
  const [notice, setNotice] = useState<{ studentId: string; text: string } | null>(
    null,
  )

  const village =
    state.villages.find((entry) => entry.id === state.selectedVillageId) ??
    state.villages[0]
  const villageStudents = state.students.filter(
    (entry) => entry.villageId === village.id,
  )
  const student =
    state.students.find((entry) => entry.id === state.selectedStudentId) ??
    villageStudents[0]
  const institution =
    state.institutions.find((entry) => entry.id === student?.institutionId) ??
    state.institutions[0]

  const situation = student ? getStudentSituation(state, student.id) : null
  const option = situation?.option
  const incident = situation?.incident
  const request = situation?.request
  const assignment = situation?.assignment
  const unservedReason = situation?.unservedReason
  const stage = situation?.stage ?? 'scheduled'
  const planState = situation?.planState ?? 'none'
  const scenario =
    SCENARIO_CATALOG.find((entry) => entry.id === state.scenarioId) ??
    SCENARIO_CATALOG[0]

  const assignedOption = assignment
    ? state.transportOptions.find(
        (entry) => entry.id === assignment.transportOptionId,
      )
    : undefined
  const pickupMin =
    assignment && assignedOption && student
      ? (assignedOption.arrivalMinByVillage[student.villageId] ??
        assignedOption.departureMin)
      : undefined

  const visibleNotice =
    notice && notice.studentId === student?.id ? notice.text : null

  const routeRoster = option ? studentsOnOption(state, option.id) : []
  const reportedIds = reportedStudentIds(state)
  const routeReports = routeRoster.filter((entry) =>
    reportedIds.has(entry.id),
  ).length
  const examCount = state.students.filter((entry) => entry.isExamDay).length
  const reachableSeats = student
    ? usableRescueOptions(state, [student.villageId]).reduce(
        (total, entry) => total + freeSeats(state, entry),
        0,
      )
    : 0

  const reportCount = incident
    ? state.helpRequests.filter((entry) => entry.incidentId === incident.id).length
    : 0

  const journeyTone: ChipTone =
    incident?.status === 'confirmed'
      ? 'danger'
      : incident?.status === 'reported'
        ? 'warn'
        : 'ok'
  const journeyLabel =
    incident?.status === 'confirmed'
      ? 'Disruption confirmed'
      : incident?.status === 'reported'
        ? 'Unverified report'
        : 'Scheduled service'

  const confirmedHeadline =
    incident?.type === 'full'
      ? `${option?.label ?? 'Service'} left students behind at ${village.name}.`
      : incident?.type === 'delay'
        ? `${option?.label ?? 'Service'} is running late for ${village.name}.`
        : incident?.type === 'road_block'
          ? `${option?.label ?? 'Service'} cannot reach ${village.name}; the access road is blocked.`
          : `${option?.label ?? 'Service'} is out of service at ${village.name}.`

  const confirmedCoachNote =
    incident?.type === 'full'
      ? `${option?.label ?? 'Service'} stayed in service but could not carry everyone.`
      : incident?.type === 'delay'
        ? `${option?.label ?? 'Service'} is delayed for planning.`
        : incident?.type === 'road_block'
          ? `${option?.label ?? 'Service'} cannot reach campus while the road is blocked.`
          : `${option?.label ?? 'Service'} is out of service.`

  const stepOne: StepStatus = request ? 'done' : incident ? 'active' : 'todo'
  const stepTwo: StepStatus = !request
    ? 'todo'
    : incident?.status === 'confirmed' || incident?.status === 'dismissed'
      ? 'done'
      : incident?.status === 'reported'
        ? 'active'
        : 'todo'
  const stepThree: StepStatus =
    stage === 'assigned' || stage === 'escalated'
      ? 'done'
      : stage === 'unserved' ||
          stage === 'proposed' ||
          (stage === 'confirmed' && Boolean(request))
        ? 'active'
        : 'todo'
  const stageChip = request
    ? STAGE_CHIPS[stage]
    : { label: 'No report yet', tone: 'neutral' as ChipTone }

  const recoverySummary = !request
    ? planState === 'approved'
      ? 'You have not reported this disruption. A plan is already approved; a late report would only be planned against seats still free.'
      : 'You have not reported this disruption, so no seat is planned for you.'
    : stage === 'assigned' && assignedOption && pickupMin !== undefined
      ? `${assignedOption.label} is confirmed. Board at ${formatClock(pickupMin)}; campus by ${formatClock(assignedOption.collegeArrivalMin)}.`
      : stage === 'proposed' && assignedOption && pickupMin !== undefined
        ? `A seat on ${assignedOption.label} at ${formatClock(pickupMin)} is proposed. It is not held until the coordinator approves the plan.`
        : stage === 'unserved'
          ? 'No verified alternative seat is available. You can request school assistance below.'
          : stage === 'escalated'
            ? 'School assistance was requested in this demo. No real school has been contacted.'
            : planState === 'approved'
              ? 'The coordinator already approved a plan. Your late report waits for a supplemental plan that only uses seats still free; confirmed seats never move.'
              : planState === 'draft'
                ? 'A recovery draft is under review. No seat is held for you until the coordinator approves it.'
                : 'Recovery analysis has not been run for this disruption yet.'

  const handleReport = (type: IncidentType) => {
    if (!student) return
    const hasOpenRequest = Boolean(request) && incident?.status !== 'dismissed'
    if (hasOpenRequest) {
      setNotice({
        studentId: student.id,
        text: 'You already have a report on file for this disruption. Nothing was duplicated.',
      })
      return
    }
    dispatch({ type: 'REPORT_PROBLEM', studentId: student.id, incidentType: type })
    setNotice({
      studentId: student.id,
      text:
        incident?.status === 'confirmed'
          ? planState === 'approved'
            ? 'Late report added to this confirmed disruption. Approved seats stay fixed; your request waits for a supplemental plan that only uses seats still free.'
            : 'Request added to this confirmed disruption and saved on this device. No seat is held until a plan is approved.'
          : 'Report received in this demo and saved on this device. A coordinator still needs to review it.',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student view · Demo District College"
        title="Will I reach class?"
        description="Check your bus, report a problem in one tap, and see what the school can arrange. Every route, seat, and time here is simulated."
        aside={<StatusChip tone="neutral" dot={false}>Demo student</StatusChip>}
      />

      <ScenarioBriefing scenario={scenario} />

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <section className="panel relative overflow-hidden rounded-2xl border border-line/90 bg-surface p-4 sm:p-5">
            <div className="ledger pointer-events-none absolute inset-0 opacity-60" aria-hidden />
            <div className="relative grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <label
                  htmlFor="demo-student"
                  className="font-mono text-[9.5px] font-medium uppercase tracking-[0.18em] text-ink-2"
                >
                  Demo student
                </label>
                <div className="relative mt-2">
                  <select
                    id="demo-student"
                    value={student?.id ?? ''}
                    onChange={(event) =>
                      dispatch({
                        type: 'SELECT_STUDENT',
                        studentId: event.target.value,
                      })
                    }
                    className="h-11 w-full appearance-none rounded-[10px] border border-line-strong bg-surface pl-3 pr-9 text-sm font-semibold text-ink shadow-[inset_0_1px_2px_rgba(18,32,28,0.04)] transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  >
                    {villageStudents.map((entry) => {
                      const entryOption = state.transportOptions.find(
                        (candidate) => candidate.id === entry.routeOptionId,
                      )
                      return (
                        <option key={entry.id} value={entry.id}>
                          {entry.label} · {entryOption?.label ?? 'No service'}
                        </option>
                      )
                    })}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-2"
                    aria-hidden
                  />
                </div>
              </div>

              <div>
                <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.18em] text-ink-2">
                  Village
                </p>
                <div
                  role="group"
                  aria-label="Demo village"
                  className="mt-2 grid grid-cols-3 gap-1.5"
                >
                  {state.villages.map((entry) => {
                    const active = entry.id === village.id
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          dispatch({ type: 'SELECT_VILLAGE', villageId: entry.id })
                        }
                        className={cn(
                          'h-11 whitespace-nowrap rounded-[10px] border px-2.5 text-[12.5px] font-semibold transition-[background-color,border-color,color,box-shadow]',
                          active
                            ? 'border-brand bg-brand text-surface shadow-[0_10px_20px_-16px_rgba(7,51,46,0.9)]'
                            : 'border-line-strong bg-surface text-ink-2 hover:border-brand/35 hover:text-ink',
                        )}
                      >
                        {entry.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <p className="relative mt-3.5 flex items-start gap-1.5 border-t border-dashed border-line/80 pt-3 text-[11px] leading-snug text-ink-2">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden />
              Pseudonymous demo profiles. No real student data is stored or sent
              anywhere.
            </p>
          </section>

          {option && student ? (
            <section className="panel overflow-hidden rounded-2xl border border-night-3 bg-surface">
              <div className="night relative overflow-hidden border-b border-paper/10 bg-night px-5 py-5 text-paper sm:px-6">
                <div className="grid-etch pointer-events-none absolute inset-0 opacity-60" aria-hidden />
                <div
                  className="pointer-events-none absolute -right-12 -top-20 size-56 rounded-full bg-brand/30 blur-3xl"
                  aria-hidden
                />
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.18em] text-mint/60">
                      Scheduled service · {option.operator}
                    </p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <h2 className="font-display text-[32px] font-semibold leading-none text-paper">
                        {option.label}
                      </h2>
                      <span className="text-sm text-paper/55">
                        to {institution.name}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-paper/30">
                      Service code · {option.id.toUpperCase()} · demo timetable
                    </p>
                  </div>
                  <div className="flex flex-row items-center gap-2.5 sm:flex-col sm:items-end sm:gap-2">
                    <StatusChip tone={journeyTone}>{journeyLabel}</StatusChip>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper/45">
                      {option.verified ? 'Verified operator' : 'Unverified'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6">
                <RouteRail
                  option={option}
                  village={village}
                  institution={institution}
                  incident={incident}
                />
              </div>

              <div
                className={cn(
                  'border-t px-5 py-4 sm:px-6',
                  journeyTone === 'danger'
                    ? 'border-danger/25 bg-danger-soft text-danger'
                    : journeyTone === 'warn'
                      ? 'border-warn/25 bg-warn-soft text-warn'
                      : 'border-ok/25 bg-ok-soft text-ok',
                )}
              >
                {incident?.status === 'reported' ? (
                  <>
                    <p className="text-[13px] font-semibold leading-snug">
                      {option.label} was reported stopped at{' '}
                      {formatClock(incident.reportedAtMin)}.
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug opacity-85">
                      {reportCount} student report{reportCount === 1 ? '' : 's'} on
                      file. A coordinator has not verified this yet.
                    </p>
                  </>
                ) : incident?.status === 'confirmed' ? (
                  <>
                    <p className="text-[13px] font-semibold leading-snug">
                      {confirmedHeadline}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug opacity-85">
                      Confirmed by the demo coordinator at{' '}
                      {formatClock(incident.confirmedAtMin ?? state.clockMin)}.{' '}
                      {recoverySummary}
                    </p>
                  </>
                ) : incident?.status === 'dismissed' ? (
                  <>
                    <p className="text-[13px] font-semibold leading-snug">
                      The report was reviewed and dismissed.
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug opacity-85">
                      {option.label} is shown as running normally in this demo.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] font-semibold leading-snug">
                      No disruption reported for {option.label}.
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug opacity-85">
                      Times are schedule-based estimates. There is no live tracking.
                    </p>
                  </>
                )}
              </div>
            </section>
          ) : null}

          <section className="panel relative overflow-hidden rounded-2xl border border-line/90 bg-surface p-5 sm:p-6">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent"
            />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-[19px] font-semibold">
                  What's happening at your stop?
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-snug text-ink-2">
                  {incident?.status === 'confirmed'
                    ? 'Add your request to this confirmed disruption. Seats are planned only after the coordinator approves a plan.'
                    : incident?.status === 'reported'
                      ? 'Add your own report. A coordinator verifies reports before any seat is planned.'
                      : 'One tap creates a report. It does not confirm an incident.'}
                </p>
              </div>
              <StatusChip tone="neutral" dot={false}>
                One tap
              </StatusChip>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {REPORT_OPTIONS.map((entry, index) => {
                const Icon = entry.icon
                return (
                  <button
                    key={entry.type}
                    type="button"
                    onClick={() => handleReport(entry.type)}
                    className={cn(
                      'group relative flex min-h-[96px] flex-col items-start gap-2 overflow-hidden rounded-xl border border-line bg-paper/35 p-3.5 text-left transition-[transform,border-color,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-surface hover:shadow-[0_18px_34px_-28px_rgba(7,51,46,0.7)]',
                      index === REPORT_OPTIONS.length - 1 && 'col-span-2',
                    )}
                  >
                    <span className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-ink-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-surface">
                      <Icon className="size-[17px]" aria-hidden />
                    </span>
                    <span className="text-[13.5px] font-semibold leading-tight text-ink">
                      {entry.label}
                    </span>
                    <span className="text-[11px] leading-snug text-ink-2">
                      {entry.hint}
                    </span>
                    <ArrowUpRight
                      className="absolute right-3.5 top-3.5 size-3.5 text-brand opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </button>
                )
              })}
            </div>

            {visibleNotice ? (
              <p
                role="status"
                className="reveal mt-3 flex items-start gap-2 rounded-lg border border-brand/25 bg-brand-soft/80 px-3 py-2.5 text-[12.5px] leading-snug text-brand-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
              >
                <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {visibleNotice}
              </p>
            ) : null}

            <p className="mt-3.5 flex items-start gap-1.5 border-t border-dashed border-line/80 pt-3 text-[11px] leading-snug text-ink-2">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden />
              Reports stay on this device. No school, transport operator, or
              government office is contacted.
            </p>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <section className="panel relative overflow-hidden rounded-2xl border border-line/90 bg-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.18em] text-brand">
                  Your request
                </p>
                <h2 className="mt-1 font-display text-[23px] font-semibold leading-none">
                  {student?.label ?? '—'}
                </h2>
                <p className="mt-0.5 text-xs text-ink-2">
                  {village.name} · {option?.label ?? 'No service'} ·{' '}
                  {institution.shortName}
                </p>
              </div>
              <StatusChip tone={stageChip.tone}>{stageChip.label}</StatusChip>
            </div>

            {student?.isExamDay || student?.needsAccessibleVehicle ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {student.isExamDay ? (
                  <StatusChip tone="warn" dot={false}>
                    Exam at {formatClock(student.classStartMin)}
                  </StatusChip>
                ) : null}
                {student.needsAccessibleVehicle ? (
                  <StatusChip tone="brand" dot={false}>
                    Step-free vehicle needed
                  </StatusChip>
                ) : null}
              </div>
            ) : null}

            {assignment && assignedOption && (stage === 'proposed' || stage === 'assigned') ? (
              <div
                className={cn(
                  'mt-4 rounded-xl border p-3.5',
                  stage === 'assigned'
                    ? 'border-ok/25 bg-ok-soft'
                    : 'border-brand/20 bg-brand-soft/60',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-2">
                      {stage === 'assigned'
                        ? 'Confirmed recovery seat'
                        : 'Proposed recovery seat'}
                    </p>
                    <p className="mt-1 font-display text-[17px] font-semibold leading-tight">
                      {assignedOption.label}{' '}
                      <span className="text-[11px] font-normal text-ink-2">
                        · {assignedOption.operator}
                      </span>
                    </p>
                  </div>
                  <StatusChip tone={stage === 'assigned' ? 'ok' : 'brand'}>
                    {stage === 'assigned' ? 'Seat confirmed' : 'Awaiting approval'}
                  </StatusChip>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-y border-dashed border-line/70 py-2.5">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-2">
                      At your stop
                    </p>
                    <p className="mt-0.5 font-mono text-[14px] tabular-nums text-ink">
                      {pickupMin !== undefined ? formatClock(pickupMin) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-2">
                      On campus
                    </p>
                    <p className="mt-0.5 font-mono text-[14px] tabular-nums text-ink">
                      {formatClock(assignedOption.collegeArrivalMin)}
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-[11px] leading-snug text-ink-2">
                  {assignment.explanation}
                </p>

                {assignedOption.accessible ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-brand">
                    <Accessibility className="size-3" aria-hidden />
                    Step-free accessible vehicle
                  </p>
                ) : null}

                <p className="mt-2 text-[10.5px] leading-snug text-ink-2">
                  {stage === 'assigned'
                    ? 'Approved by the demo coordinator. No real operator or school was contacted.'
                    : 'A proposal is not a held seat. The coordinator still has to approve this plan.'}
                </p>
              </div>
            ) : null}

            <ol className="mt-5">
              <RequestStep
                status={stepOne}
                title="Report received"
                detail={
                  request
                    ? `${formatClock(request.createdAtMin)} · saved on this device`
                    : 'No report yet — use the one-tap buttons.'
                }
              />
              <RequestStep
                status={stepTwo}
                title="Coordinator review"
                detail={
                  !request
                    ? 'A coordinator verifies reports before any seat is planned.'
                    : incident?.status === 'confirmed'
                      ? `Confirmed at ${formatClock(incident.confirmedAtMin ?? state.clockMin)}. ${confirmedCoachNote}`
                      : incident?.status === 'dismissed'
                        ? 'Reviewed. No disruption was confirmed.'
                        : incident?.status === 'reported'
                          ? 'Waiting for the demo coordinator. A report is not yet a confirmed incident.'
                          : 'Reports are checked before any seat is planned.'
                }
              />
              <RequestStep
                status={stepThree}
                title="Seat or school help"
                detail={
                  stage === 'assigned' && assignedOption && pickupMin !== undefined
                    ? `Seat confirmed on ${assignedOption.label}. Board at ${formatClock(pickupMin)}; campus by ${formatClock(assignedOption.collegeArrivalMin)}.`
                    : stage === 'proposed' && assignedOption && pickupMin !== undefined
                      ? `Proposed on ${assignedOption.label} at ${formatClock(pickupMin)}. Not held until approved.`
                      : stage === 'escalated'
                        ? 'Assistance requested in this demo. No real school has been contacted.'
                        : stage === 'unserved'
                          ? 'No verified seat. Ask the school for direct help below.'
                          : stage === 'confirmed'
                            ? planState === 'approved'
                              ? 'A plan is approved, but it was made before your report. Only seats still free can be offered.'
                              : planState === 'draft'
                                ? 'A draft plan is under review. No seat is held until it is approved.'
                                : 'No seat is promised until a plan is approved.'
                            : !request && incident?.status === 'confirmed'
                              ? planState === 'approved'
                                ? 'A plan is already approved. Your report would be a late request, planned only from seats still free.'
                                : 'Report your situation to be included in the plan.'
                              : 'Only after a confirmed disruption and an approved plan.'
                }
                last
              />
            </ol>

            {request?.status === 'unserved' ? (
              <div className="mt-4 rounded-lg border border-warn/25 bg-warn-soft p-3">
                <p className="text-[12px] font-semibold leading-snug text-warn">
                  No verified seat is available for you.
                </p>
                {unservedReason ? (
                  <p className="mt-1 text-[11px] leading-snug text-warn/90">
                    {unservedReason}
                  </p>
                ) : null}
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={() =>
                    dispatch({ type: 'ESCALATE_REQUEST', requestId: request.id })
                  }
                >
                  Request school assistance
                </Button>
                <p className="mt-2 text-[10px] leading-snug text-ink-2">
                  This records an assistance request in this demo only. No real
                  school, operator, or government office is contacted.
                </p>
              </div>
            ) : request?.status === 'escalated' ? (
              <div className="mt-4 rounded-lg border border-brand/25 bg-brand-soft p-3">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold leading-snug text-brand-deep">
                  <Check className="size-3.5" aria-hidden />
                  School assistance requested
                </p>
                {unservedReason ? (
                  <p className="mt-1 text-[11px] leading-snug text-brand-deep/80">
                    {unservedReason}
                  </p>
                ) : null}
                <p className="mt-1.5 text-[10.5px] leading-snug text-brand-deep/80">
                  Your demo coordinator sees “Help requested.” No real school,
                  operator, or government office was contacted.
                </p>
              </div>
            ) : null}
          </section>

          <section className="ticket panel relative rounded-2xl border border-line/90 bg-[#fbf7ec] p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-2">
                Demo scenario
              </p>
              <StatusChip tone="warn" dot={false}>
                Simulated
              </StatusChip>
            </div>
            <h2 className="mt-1.5 font-display text-[17px] font-semibold">
              {scenario.title}
            </h2>
            <dl className="mt-3 space-y-1.5 border-t border-dashed border-line pt-3 font-mono text-[11px]">
              {[
                ['Demo clock', formatClock(state.clockMin)],
                ['Class starts', formatClock(institution.classStartMin)],
                [
                  `On ${option?.label ?? 'route'}`,
                  `${routeRoster.length} students`,
                ],
                [
                  'Verified backup',
                  reachableSeats > 0
                    ? `${reachableSeats} seat${reachableSeats === 1 ? '' : 's'} reach${reachableSeats === 1 ? 'es' : ''} ${village.shortName}`
                    : 'None verified',
                ],
                ['Exams today', `${examCount} at 09:00`],
                [
                  `Reports on ${option?.label ?? 'route'}`,
                  `${routeReports} received`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="uppercase tracking-[0.08em] text-ink-2">{label}</dt>
                  <dd className="tabular-nums text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[10.5px] leading-snug text-ink-2">
              Configured demo facts, not live feeds.
            </p>
          </section>

          <section className="panel rounded-2xl border border-line/90 bg-surface p-5">
            <h2 className="font-display text-[17px] font-semibold">
              How recovery works
            </h2>
            <ol className="mt-4 space-y-3">
              {[
                ['Report', 'Tell the system what is happening at your stop.'],
                ['Confirm', 'A coordinator checks the report before it counts.'],
                ['Allocate', 'Only verified spare seats are used, after approval.'],
              ].map(([title, detail], index) => (
                <li key={title} className="flex gap-3">
                  <span className="pt-0.5 font-mono text-[10px] tabular-nums text-brand">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold leading-tight">{title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-ink-2">
                      {detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-dashed border-line pt-3 text-[10.5px] leading-snug text-ink-2">
              A draft never holds a seat. A late report never moves an approved
              seat; it gets a supplemental plan from capacity still free. If
              nothing is available, the request goes to the school as an honest
              escalation.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
