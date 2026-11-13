import { describe, expect, it } from 'vitest'
import type { AppState, ScenarioId } from '../data/types'
import { createInitialState } from '../data/demoFixtures'
import { buildRecoveryPlan } from '../domain/recoveryEngine'
import { displayVehicleStatus } from '../domain/metrics'
import { appReducer } from '../state/reducer'

/** Report as STU-001, then confirm the seeded incident. */
function confirmedScenario(scenarioId: ScenarioId): AppState {
  let state = createInitialState(scenarioId)
  const incident = state.incidents[0]
  if (!incident) throw new Error('scenario has no incident')
  state = appReducer(state, {
    type: 'REPORT_PROBLEM',
    studentId: 'stu-001',
    incidentType: incident.type,
  })
  return appReducer(state, { type: 'CONFIRM_INCIDENT', incidentId: incident.id })
}

function planFor(scenarioId: ScenarioId) {
  const state = confirmedScenario(scenarioId)
  const incident = state.incidents[0]
  if (!incident) throw new Error('scenario has no incident')
  return { state, result: buildRecoveryPlan(state, incident.id) }
}

function vehicle(state: AppState, id: string) {
  const option = state.transportOptions.find((entry) => entry.id === id)
  if (!option) throw new Error(`missing ${id}`)
  return option
}

describe('scenario fixtures', () => {
  it('defaults to the breakdown scenario', () => {
    const state = createInitialState()
    expect(state.scenarioId).toBe('breakdown')
    expect(state.incidents).toHaveLength(1)
    expect(state.incidents[0]?.type).toBe('breakdown')
  })

  it('seeds twelve Village C students, eleven reports, and STU-001 unreported', () => {
    for (const scenarioId of [
      'breakdown',
      'overcrowding',
      'road_block',
      'no_backup',
    ] as const) {
      const state = createInitialState(scenarioId)
      expect(state.scenarioId).toBe(scenarioId)
      expect(state.helpRequests).toHaveLength(11)
      expect(state.incidents).toHaveLength(1)
      expect(state.proposals).toHaveLength(0)
      expect(state.assignments).toHaveLength(0)
      expect(
        state.helpRequests.some((request) => request.studentId === 'stu-001'),
      ).toBe(false)
    }
  })

  it('seeds an unverified overcrowding report and leaves B2 operating after confirmation', () => {
    const state = confirmedScenario('overcrowding')
    expect(state.incidents[0]?.type).toBe('full')
    expect(state.incidents[0]?.status).toBe('confirmed')
    expect(displayVehicleStatus(state, vehicle(state, 'b2'))).toBe('active')
    expect(state.helpRequests).toHaveLength(12)
  })

  it('blocks the south corridor for the road-block scenario', () => {
    const state = createInitialState('road_block')
    expect(state.incidents[0]?.type).toBe('road_block')
    expect(vehicle(state, 'v1').blockedCorridorIds).toContain('c-south')
  })

  it('ships no verified backup vehicle in the no-backup scenario', () => {
    const state = createInitialState('no_backup')
    expect(vehicle(state, 'v1').verified).toBe(false)
    expect(vehicle(state, 'v2').verified).toBe(false)
  })

  it('keeps the eight-seat outcome for the breakdown scenario', () => {
    const { result } = planFor('breakdown')
    expect(result.assignments).toHaveLength(8)
    expect(result.unserved).toHaveLength(4)
  })

  it('keeps the eight-seat waitlist for the overcrowding scenario', () => {
    const { result } = planFor('overcrowding')
    expect(result.assignments).toHaveLength(8)
    expect(result.unserved).toHaveLength(4)
    expect(result.unserved[0]?.reason).toMatch(/higher-priority/i)
  })

  it('plans nothing and names the blocked corridor for the road-block scenario', () => {
    const { result } = planFor('road_block')
    expect(result.assignments).toEqual([])
    expect(result.unserved).toHaveLength(12)
    expect(
      result.unserved.every((entry) => /blocked corridor/i.test(entry.reason)),
    ).toBe(true)
  })

  it('plans nothing and names the missing verified vehicle for the no-backup scenario', () => {
    const { result } = planFor('no_backup')
    expect(result.assignments).toEqual([])
    expect(result.unserved).toHaveLength(12)
    expect(
      result.unserved.every((entry) => /no verified institution vehicle/i.test(entry.reason)),
    ).toBe(true)
  })

  it('loads a scenario while preserving the coordinator view', () => {
    let state = createInitialState()
    state = appReducer(state, { type: 'SET_ROLE', role: 'coordinator' })
    state = appReducer(state, { type: 'LOAD_SCENARIO', scenarioId: 'road_block' })

    expect(state.role).toBe('coordinator')
    expect(state.scenarioId).toBe('road_block')
    expect(state.incidents[0]?.type).toBe('road_block')
    expect(state.helpRequests).toHaveLength(11)
    expect(state.proposals).toHaveLength(0)
  })

  it('ignores an unknown scenario id', () => {
    const state = createInitialState()
    const next = appReducer(state, {
      type: 'LOAD_SCENARIO',
      scenarioId: 'unknown' as ScenarioId,
    })
    expect(next).toBe(state)
  })

  it('resets to the active scenario rather than the breakdown seed', () => {
    let state = createInitialState('no_backup')
    state = appReducer(state, { type: 'SET_ROLE', role: 'coordinator' })
    const reset = appReducer(state, { type: 'RESET_DEMO' })

    expect(reset.scenarioId).toBe('no_backup')
    expect(reset.incidents[0]?.type).toBe('breakdown')
    expect(vehicle(reset, 'v1').verified).toBe(false)
    expect(reset.role).toBe('student')
    expect(reset.helpRequests).toHaveLength(11)
  })
})
