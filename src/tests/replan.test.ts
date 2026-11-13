import { describe, expect, it } from 'vitest'
import type { AppState } from '../data/types'
import { BREAKDOWN_INCIDENT_ID, createInitialState } from '../data/demoFixtures'
import { buildRecoveryPlan } from '../domain/recoveryEngine'
import { dashboardMetrics, freeSeats } from '../domain/metrics'
import { getStudentSituation } from '../domain/studentView'
import { appReducer } from '../state/reducer'
import { stateWithDraftPlan } from './helpers'

/** Confirmed breakdown with eleven requests; STU-001 has not reported yet. */
function confirmedWithoutLateReport(): AppState {
  return appReducer(createInitialState(), {
    type: 'CONFIRM_INCIDENT',
    incidentId: BREAKDOWN_INCIDENT_ID,
  })
}

/** Confirmed breakdown with an approved plan over the eleven seeded requests. */
function approvedPlan(capacity = 12): AppState {
  const base = confirmedWithoutLateReport()
  const state =
    capacity === 12
      ? base
      : {
          ...base,
          transportOptions: base.transportOptions.map((option) =>
            option.id === 'v1' ? { ...option, capacity } : option,
          ),
        }
  const planned = appReducer(state, {
    type: 'RUN_RECOVERY',
    incidentId: BREAKDOWN_INCIDENT_ID,
  })
  const proposalId = planned.proposals[0]?.id
  if (!proposalId) throw new Error('missing proposal')
  return appReducer(planned, { type: 'APPROVE_PROPOSAL', proposalId })
}

function reportAs(state: AppState, studentId: string): AppState {
  return appReducer(state, {
    type: 'REPORT_PROBLEM',
    studentId,
    incidentType: 'breakdown',
  })
}

function runReplan(state: AppState): AppState {
  return appReducer(state, {
    type: 'RUN_REPLAN',
    incidentId: BREAKDOWN_INCIDENT_ID,
  })
}

function approveReplan(state: AppState): AppState {
  const replan = state.proposals.find(
    (entry) => entry.kind === 'replan' && entry.status === 'draft',
  )
  if (!replan) throw new Error('missing replan draft')
  return appReducer(state, { type: 'APPROVE_PROPOSAL', proposalId: replan.id })
}

function requestFor(state: AppState, studentId: string) {
  return state.helpRequests.find((entry) => entry.studentId === studentId)
}

function approvedProposal(state: AppState) {
  const proposal = state.proposals.find((entry) => entry.status === 'approved')
  if (!proposal) throw new Error('missing approved proposal')
  return proposal
}

function v1(state: AppState) {
  const option = state.transportOptions.find((entry) => entry.id === 'v1')
  if (!option) throw new Error('missing v1')
  return option
}

describe('late-report replan', () => {
  it('leaves a late request pending and never touches the approved seats', () => {
    const state = approvedPlan()
    const late = reportAs(state, 'stu-001')

    expect(requestFor(late, 'stu-001')?.status).toBe('pending')
    expect(late.assignments).toHaveLength(8)
    expect(late.assignments.filter((a) => a.status === 'confirmed')).toHaveLength(8)
    expect(late.proposals).toHaveLength(1)
    expect(freeSeats(late, v1(late))).toBe(0)
    // The student's own view shows the confirmed disruption, not a seat.
    expect(getStudentSituation(late, 'stu-001')?.stage).toBe('confirmed')
    expect(getStudentSituation(late, 'stu-001')?.assignment).toBeUndefined()
  })

  it('scopes the engine to the late request when asked', () => {
    const late = reportAs(approvedPlan(), 'stu-001')
    const lateRequest = requestFor(late, 'stu-001')
    if (!lateRequest) throw new Error('missing late request')

    const result = buildRecoveryPlan(late, BREAKDOWN_INCIDENT_ID, [lateRequest.id])

    expect(result.assignments).toEqual([])
    expect(result.unserved).toHaveLength(1)
    expect(result.unserved[0]?.studentId).toBe('stu-001')
    expect(result.unserved[0]?.reason).toMatch(/higher-priority/i)
  })

  it('creates a supplemental draft that keeps approved seats and marks the late request unserved', () => {
    const state = reportAs(approvedPlan(), 'stu-001')
    const before = approvedProposal(state)

    const replanned = runReplan(state)
    const after = replanned.proposals.find((entry) => entry.id === before.id)

    expect(after).toEqual(before)
    expect(replanned.assignments.filter((a) => a.status === 'confirmed')).toHaveLength(8)
    expect(
      replanned.helpRequests.filter((r) => r.status === 'confirmed'),
    ).toHaveLength(8)

    const replan = replanned.proposals.find((entry) => entry.kind === 'replan')
    expect(replan?.status).toBe('draft')
    expect(replan?.assignmentIds).toEqual([])
    expect(replan?.unserved).toHaveLength(1)
    expect(requestFor(replanned, 'stu-001')?.status).toBe('unserved')
    expect(
      getStudentSituation(replanned, 'stu-001')?.unservedReason,
    ).toMatch(/higher-priority/i)
  })

  it('proposes a real seat for the late report when spare capacity exists', () => {
    const state = reportAs(approvedPlan(16), 'stu-001')
    const replanned = runReplan(state)
    const replan = replanned.proposals.find((entry) => entry.kind === 'replan')

    expect(replan?.assignmentIds).toHaveLength(1)
    expect(replan?.unserved).toEqual([])
    expect(requestFor(replanned, 'stu-001')?.status).toBe('proposed')
    expect(freeSeats(replanned, v1(replanned))).toBe(1)

    const approved = approveReplan(replanned)
    expect(requestFor(approved, 'stu-001')?.status).toBe('confirmed')
    expect(approved.assignments.filter((a) => a.status === 'confirmed')).toHaveLength(12)
    expect(freeSeats(approved, v1(approved))).toBe(0)
  })

  it('approves an all-unserved supplemental plan without inventing a seat', () => {
    const replanned = runReplan(reportAs(approvedPlan(), 'stu-001'))
    const approved = approveReplan(replanned)
    const replan = approved.proposals.find((entry) => entry.kind === 'replan')

    expect(replan?.status).toBe('approved')
    expect(approved.assignments).toHaveLength(8)
    expect(requestFor(approved, 'stu-001')?.status).toBe('unserved')
    expect(dashboardMetrics(approved).confirmedPlacements).toBe(8)
    expect(dashboardMetrics(approved).unserved).toBe(4)
  })

  it('requires an approved plan before supplementing', () => {
    const draft = stateWithDraftPlan()
    expect(runReplan(draft)).toBe(draft)

    const fresh = confirmedWithoutLateReport()
    expect(runReplan(fresh)).toBe(fresh)
  })

  it('does nothing when every student has already reported', () => {
    const state = approvedPlan()
    expect(runReplan(state)).toBe(state)
  })

  it('replaces a prior supplemental draft instead of stacking proposals', () => {
    const late = reportAs(approvedPlan(), 'stu-001')
    const first = runReplan(late)
    const second = runReplan(first)

    expect(second.proposals.filter((entry) => entry.kind === 'replan')).toHaveLength(1)
    expect(second.assignments).toHaveLength(8)
    expect(
      second.helpRequests.filter((entry) => entry.status === 'unserved'),
    ).toHaveLength(4)
  })

  it('recomputes a supplemental draft when verified capacity changes', () => {
    const first = runReplan(reportAs(approvedPlan(), 'stu-001'))
    expect(
      first.proposals.find((entry) => entry.kind === 'replan')?.assignmentIds,
    ).toEqual([])

    const boosted = {
      ...first,
      transportOptions: first.transportOptions.map((option) =>
        option.id === 'v1' ? { ...option, capacity: 13 } : option,
      ),
    }
    const second = runReplan(boosted)
    const replan = second.proposals.find(
      (entry) => entry.kind === 'replan' && entry.status === 'draft',
    )

    expect(replan?.assignmentIds).toHaveLength(1)
    expect(requestFor(second, 'stu-001')?.status).toBe('proposed')
    expect(second.proposals.filter((entry) => entry.kind === 'replan')).toHaveLength(1)
  })

  it('reports the approved plan state to a late student', () => {
    const late = reportAs(approvedPlan(), 'stu-001')
    expect(getStudentSituation(late, 'stu-001')?.planState).toBe('approved')

    const planned = runReplan(late)
    expect(getStudentSituation(planned, 'stu-001')?.planState).toBe('approved')

    const draft = stateWithDraftPlan()
    expect(getStudentSituation(draft, 'stu-001')?.planState).toBe('draft')

    expect(
      getStudentSituation(confirmedWithoutLateReport(), 'stu-001')?.planState,
    ).toBe('none')
  })

  it('returns the late request to pending when the supplemental draft is discarded', () => {
    const replanned = runReplan(reportAs(approvedPlan(), 'stu-001'))
    const replan = replanned.proposals.find((entry) => entry.kind === 'replan')
    if (!replan) throw new Error('missing replan')
    const rejected = appReducer(replanned, {
      type: 'REJECT_PROPOSAL',
      proposalId: replan.id,
    })

    expect(requestFor(rejected, 'stu-001')?.status).toBe('pending')
    expect(approvedProposal(rejected)).toEqual(approvedProposal(replanned))
    expect(rejected.assignments.filter((a) => a.status === 'confirmed')).toHaveLength(8)
    expect(rejected.proposals.some((entry) => entry.kind === 'replan' && entry.status === 'discarded')).toBe(true)
  })

  it('supports a second late report after the first supplemental plan is approved', () => {
    const base = confirmedWithoutLateReport()
    const withoutSecond = {
      ...base,
      helpRequests: base.helpRequests.filter(
        (request) => request.studentId !== 'stu-002',
      ),
    }
    const planned = appReducer(withoutSecond, {
      type: 'RUN_RECOVERY',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    const proposalId = planned.proposals[0]?.id
    if (!proposalId) throw new Error('missing proposal')
    let state = appReducer(planned, { type: 'APPROVE_PROPOSAL', proposalId })
    expect(state.assignments).toHaveLength(8)

    state = approveReplan(runReplan(reportAs(state, 'stu-001')))
    state = approveReplan(runReplan(reportAs(state, 'stu-002')))

    const approvedReplans = state.proposals.filter(
      (entry) => entry.kind === 'replan' && entry.status === 'approved',
    )
    expect(approvedReplans).toHaveLength(2)
    expect(new Set(approvedReplans.map((entry) => entry.id)).size).toBe(2)
    expect(requestFor(state, 'stu-001')?.status).toBe('unserved')
    expect(requestFor(state, 'stu-002')?.status).toBe('unserved')
    expect(state.assignments.filter((a) => a.status === 'confirmed')).toHaveLength(8)
  })
})
