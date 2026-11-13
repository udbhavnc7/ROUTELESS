import { describe, expect, it } from 'vitest'
import type { AppState } from '../data/types'
import { createInitialState } from '../data/demoFixtures'
import { SCENARIO_CATALOG } from '../data/scenarios'
import { buildRecoveryPlan } from '../domain/recoveryEngine'
import {
  dashboardMetrics,
  displayVehicleStatus,
  freeSeats,
} from '../domain/metrics'
import { getStudentSituation } from '../domain/studentView'
import { appReducer } from '../state/reducer'

const B1_INCIDENT = 'inc-b1-breakdown'
const B2_INCIDENT = 'inc-b2-breakdown'

function vehicle(state: AppState, id: string) {
  const option = state.transportOptions.find((entry) => entry.id === id)
  if (!option) throw new Error(`missing ${id}`)
  return option
}

/** The crisis seed with STU-001's report and both incidents confirmed. */
function confirmedCrisis(): AppState {
  let state = createInitialState('exam_crisis')
  state = appReducer(state, {
    type: 'REPORT_PROBLEM',
    studentId: 'stu-001',
    incidentType: 'breakdown',
  })
  for (const incident of state.incidents) {
    state = appReducer(state, {
      type: 'CONFIRM_INCIDENT',
      incidentId: incident.id,
    })
  }
  return state
}

function approvedCrisis(): AppState {
  let state = confirmedCrisis()
  for (const incident of state.incidents) {
    state = appReducer(state, {
      type: 'RUN_RECOVERY',
      incidentId: incident.id,
    })
  }
  for (const proposal of state.proposals) {
    state = appReducer(state, {
      type: 'APPROVE_PROPOSAL',
      proposalId: proposal.id,
    })
  }
  return state
}

describe('exam-day crisis seed', () => {
  it('is listed as a switchable scenario with the four crisis facts', () => {
    const meta = SCENARIO_CATALOG.find((entry) => entry.id === 'exam_crisis')
    expect(meta).toBeDefined()
    expect(meta?.status).toBe('available')
    expect(meta?.briefing).toHaveLength(4)
    expect(meta?.briefing?.map((entry) => entry.label)).toEqual([
      'Buses out',
      'Demand',
      'Exams',
      'Road',
    ])
  })

  it('seeds two reported government-bus failures and 17 expected students', () => {
    const state = createInitialState('exam_crisis')

    expect(state.incidents).toHaveLength(2)
    expect(state.incidents.map((entry) => entry.id).sort()).toEqual([
      B1_INCIDENT,
      B2_INCIDENT,
    ])
    expect(
      state.incidents.every(
        (entry) => entry.type === 'breakdown' && entry.status === 'reported',
      ),
    ).toBe(true)
    expect(displayVehicleStatus(state, vehicle(state, 'b1'))).toBe('active')
    expect(displayVehicleStatus(state, vehicle(state, 'b2'))).toBe('active')
    expect(state.helpRequests).toHaveLength(16)
    expect(
      state.students.filter((entry) => entry.villageId === 'v-c'),
    ).toHaveLength(12)
    expect(
      state.helpRequests.some((request) => request.studentId === 'stu-001'),
    ).toBe(false)
    expect(
      state.helpRequests.some((request) => request.studentId === 'stu-018'),
    ).toBe(false)
  })

  it('stages the surge across villages and marks five exam students', () => {
    const state = createInitialState('exam_crisis')
    const exams = state.students
      .filter((entry) => entry.isExamDay)
      .map((entry) => entry.id)

    expect(exams.sort()).toEqual([
      'stu-003',
      'stu-004',
      'stu-011',
      'stu-014',
      'stu-016',
    ])
    expect(
      state.helpRequests.filter((request) => request.incidentId === B1_INCIDENT),
    ).toHaveLength(5)
    expect(
      state.helpRequests.filter((request) => request.incidentId === B2_INCIDENT),
    ).toHaveLength(11)
  })

  it('adds one verified emergency minibus that cannot reach flooded Village B', () => {
    const state = createInitialState('exam_crisis')
    const v3 = vehicle(state, 'v3')

    expect(v3.verified).toBe(true)
    expect(v3.status).toBe('active')
    expect(v3.accessible).toBe(false)
    expect(v3.villageIds).toEqual(['v-a', 'v-b', 'v-c'])
    expect(v3.blockedCorridorIds).toContain('c-east')
    expect(freeSeats(state, v3)).toBe(8)
    expect(dashboardMetrics(state).backupSeats).toBe(16)
  })

  it('counts seventeen affected after confirmation without duplicating students', () => {
    const state = confirmedCrisis()
    expect(dashboardMetrics(state).reports).toBe(17)
    expect(dashboardMetrics(state).affected).toBe(17)
    expect(dashboardMetrics(state).confirmedIncidents).toBe(2)
    expect(dashboardMetrics(state).backupSeats).toBe(16)
    expect(displayVehicleStatus(state, vehicle(state, 'b1'))).toBe('cancelled')
    expect(displayVehicleStatus(state, vehicle(state, 'b2'))).toBe('cancelled')
  })
})

describe('exam-day crisis recovery', () => {
  it('serves three Village A students and refuses the flooded Village B', () => {
    const state = confirmedCrisis()
    const plan = buildRecoveryPlan(state, B1_INCIDENT)

    expect(plan.assignments).toHaveLength(3)
    expect(plan.assignments.map((entry) => entry.studentId)).toEqual([
      'stu-014',
      'stu-013',
      'stu-015',
    ])
    expect(plan.unserved).toHaveLength(2)
    expect(plan.unserved.map((entry) => entry.studentId)).toEqual([
      'stu-016',
      'stu-017',
    ])
    expect(
      plan.unserved.every((entry) => /blocked corridor/i.test(entry.reason)),
    ).toBe(true)
    expect(freeSeats(state, vehicle(state, 'v1'))).toBe(8)
    expect(freeSeats(state, vehicle(state, 'v3'))).toBe(8)
  })

  it('serves all twelve Village C students while keeping exam priority', () => {
    const state = confirmedCrisis()
    const plan = buildRecoveryPlan(state, B2_INCIDENT)
    const order = plan.assignments.map((entry) => entry.studentId)

    expect(plan.assignments).toHaveLength(12)
    expect(plan.unserved).toHaveLength(0)
    // All three exam students lead; repeat-unserved days break the tie.
    expect(order.slice(0, 3)).toEqual(['stu-004', 'stu-011', 'stu-003'])
    const seven = plan.assignments.find((entry) => entry.studentId === 'stu-007')
    expect(seven?.transportOptionId).toBe('v1')
    expect(
      plan.assignments.filter((entry) => entry.transportOptionId === 'v1'),
    ).toHaveLength(8)
    expect(
      plan.assignments.filter((entry) => entry.transportOptionId === 'v3'),
    ).toHaveLength(4)
  })

  it('leaves draft seats unheld across both incidents', () => {
    const state = confirmedCrisis()
    const b1 = buildRecoveryPlan(state, B1_INCIDENT)
    const b2 = buildRecoveryPlan(state, B2_INCIDENT)

    expect(b1.assignments.length + b2.assignments.length).toBe(15)
    expect(b1.unserved.length + b2.unserved.length).toBe(2)
    expect(freeSeats(state, vehicle(state, 'v1'))).toBe(8)
    expect(freeSeats(state, vehicle(state, 'v3'))).toBe(8)
  })

  it('approves both plans without overbooking the shared minibus', () => {
    const state = approvedCrisis()

    expect(dashboardMetrics(state).confirmedPlacements).toBe(15)
    expect(dashboardMetrics(state).unserved).toBe(2)
    expect(dashboardMetrics(state).backupSeats).toBe(1)
    expect(freeSeats(state, vehicle(state, 'v1'))).toBe(0)
    expect(freeSeats(state, vehicle(state, 'v3'))).toBe(1)
    expect(
      state.proposals.filter((proposal) => proposal.status === 'approved'),
    ).toHaveLength(2)
  })

  it('shows a confirmed seat for Village A and a blocked-road reason for Village B', () => {
    const state = approvedCrisis()

    const a = getStudentSituation(state, 'stu-013')
    expect(a?.stage).toBe('assigned')
    expect(a?.assignment?.transportOptionId).toBe('v3')

    const b = getStudentSituation(state, 'stu-016')
    expect(b?.stage).toBe('unserved')
    expect(b?.unservedReason).toMatch(/blocked corridor/i)
  })

  it('keeps approved seats fixed when a third Village B student reports late', () => {
    let state = approvedCrisis()
    const before = state.assignments
      .filter((assignment) => assignment.status === 'confirmed')
      .map((assignment) => assignment.id)
      .sort()

    state = appReducer(state, {
      type: 'REPORT_PROBLEM',
      studentId: 'stu-018',
      incidentType: 'breakdown',
    })
    state = appReducer(state, { type: 'RUN_REPLAN', incidentId: B1_INCIDENT })

    const replan = state.proposals.find(
      (proposal) => proposal.kind === 'replan' && proposal.status === 'draft',
    )
    expect(replan?.incidentId).toBe(B1_INCIDENT)
    expect(replan?.assignmentIds).toEqual([])
    expect(replan?.unserved).toHaveLength(1)
    expect(replan?.unserved[0]?.studentId).toBe('stu-018')
    expect(replan?.unserved[0]?.reason).toMatch(/blocked corridor/i)

    const after = state.assignments
      .filter((assignment) => assignment.status === 'confirmed')
      .map((assignment) => assignment.id)
      .sort()
    expect(after).toEqual(before)

    const proposalId = replan?.id
    if (!proposalId) throw new Error('missing supplemental proposal')
    const approved = appReducer(state, {
      type: 'APPROVE_PROPOSAL',
      proposalId,
    })
    expect(dashboardMetrics(approved).confirmedPlacements).toBe(15)
    expect(dashboardMetrics(approved).unserved).toBe(3)
  })

  it('loads the crisis with a coordinator view and clears the previous demo', () => {
    let state = createInitialState('breakdown')
    state = appReducer(state, { type: 'SET_ROLE', role: 'coordinator' })
    state = appReducer(state, { type: 'LOAD_SCENARIO', scenarioId: 'exam_crisis' })

    expect(state.scenarioId).toBe('exam_crisis')
    expect(state.role).toBe('coordinator')
    expect(state.incidents).toHaveLength(2)
    expect(state.helpRequests).toHaveLength(16)
    expect(vehicle(state, 'v3').verified).toBe(true)
  })
})
