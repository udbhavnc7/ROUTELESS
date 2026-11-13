import { describe, expect, it } from 'vitest'
import { BREAKDOWN_INCIDENT_ID, createInitialState } from '../data/demoFixtures'
import { buildRecoveryPlan } from '../domain/recoveryEngine'
import { confirmedBreakdownState, stateWithDraftPlan } from './helpers'

function plan() {
  const state = confirmedBreakdownState()
  return { state, result: buildRecoveryPlan(state, BREAKDOWN_INCIDENT_ID) }
}

describe('recovery engine', () => {
  it('returns nothing until the incident is confirmed', () => {
    const result = buildRecoveryPlan(createInitialState(), BREAKDOWN_INCIDENT_ID)
    expect(result.assignments).toEqual([])
    expect(result.unserved).toEqual([])
  })

  it('proposes eight seats and leaves four students unserved', () => {
    const { result } = plan()
    expect(result.assignments).toHaveLength(8)
    expect(result.unserved).toHaveLength(4)
  })

  it('uses only the verified van', () => {
    const { result } = plan()
    expect(new Set(result.assignments.map((entry) => entry.transportOptionId))).toEqual(
      new Set(['v1']),
    )
  })

  it('prioritises exam day, repeat unserved, then a stable order', () => {
    const { result } = plan()
    expect(result.assignments.map((entry) => entry.studentId)).toEqual([
      'stu-003',
      'stu-004',
      'stu-011',
      'stu-001',
      'stu-002',
      'stu-005',
      'stu-006',
      'stu-007',
    ])
  })

  it('serves the exam-day student first when only one seat exists', () => {
    const state = confirmedBreakdownState()
    state.transportOptions = state.transportOptions.map((entry) =>
      entry.id === 'v1' ? { ...entry, occupiedSeats: entry.capacity - 1 } : entry,
    )
    const result = buildRecoveryPlan(state, BREAKDOWN_INCIDENT_ID)
    expect(result.assignments).toHaveLength(1)
    expect(result.assignments[0]?.studentId).toBe('stu-003')
  })

  it('gives every unserved student a specific reason', () => {
    const { result } = plan()
    expect(result.unserved.map((entry) => entry.studentId)).toEqual([
      'stu-008',
      'stu-009',
      'stu-010',
      'stu-012',
    ])
    for (const entry of result.unserved) {
      expect(entry.reason.length).toBeGreaterThan(20)
    }
    expect(result.unserved[0]?.reason).toMatch(/higher-priority/i)
  })

  it('explains priority and pickup details in every assignment', () => {
    const { result } = plan()
    const examSeat = result.assignments.find((entry) => entry.studentId === 'stu-003')
    const accessibleSeat = result.assignments.find(
      (entry) => entry.studentId === 'stu-007',
    )
    expect(examSeat?.explanation).toMatch(/exam/i)
    expect(accessibleSeat?.explanation).toMatch(/step-free/i)
    for (const entry of result.assignments) {
      expect(entry.explanation).toMatch(/V1/)
      expect(entry.explanation).toMatch(/08:52/)
    }
  })

  it('never repeats a student or a request', () => {
    const { result } = plan()
    const requestIds = result.assignments.map((entry) => entry.requestId)
    const studentIds = result.assignments.map((entry) => entry.studentId)
    expect(new Set(requestIds).size).toBe(requestIds.length)
    expect(new Set(studentIds).size).toBe(studentIds.length)
  })

  it('is deterministic across runs, including after a draft exists', () => {
    const state = confirmedBreakdownState()
    const first = buildRecoveryPlan(state, BREAKDOWN_INCIDENT_ID)
    const second = buildRecoveryPlan(state, BREAKDOWN_INCIDENT_ID)
    const afterDraft = buildRecoveryPlan(stateWithDraftPlan(), BREAKDOWN_INCIDENT_ID)
    expect(second).toEqual(first)
    expect(afterDraft).toEqual(first)
  })

  it('respects remaining capacity instead of overbooking', () => {
    const state = confirmedBreakdownState()
    state.transportOptions = state.transportOptions.map((entry) =>
      entry.id === 'v1' ? { ...entry, occupiedSeats: entry.capacity - 4 } : entry,
    )
    const result = buildRecoveryPlan(state, BREAKDOWN_INCIDENT_ID)
    expect(result.assignments).toHaveLength(4)
    expect(result.unserved).toHaveLength(8)
  })

  it('returns zero seats and twelve unserved when no verified vehicle exists', () => {
    const state = confirmedBreakdownState()
    state.transportOptions = state.transportOptions.map((entry) =>
      entry.id === 'v1' ? { ...entry, verified: false } : entry,
    )
    const result = buildRecoveryPlan(state, BREAKDOWN_INCIDENT_ID)
    expect(result.assignments).toEqual([])
    expect(result.unserved).toHaveLength(12)
    expect(result.unserved.every((entry) => /verified/i.test(entry.reason))).toBe(true)
  })
})
