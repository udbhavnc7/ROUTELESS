import { describe, expect, it } from 'vitest'
import { createInitialState } from '../data/demoFixtures'
import { isValidAppState } from '../state/persistence'

describe('persisted state validation', () => {
  it('accepts the seeded state', () => {
    expect(isValidAppState(createInitialState())).toBe(true)
  })

  it('rejects null, arrays and unrelated objects', () => {
    expect(isValidAppState(null)).toBe(false)
    expect(isValidAppState([])).toBe(false)
    expect(isValidAppState({ hello: 'world' })).toBe(false)
  })

  it('rejects a stale schema version', () => {
    expect(isValidAppState({ ...createInitialState(), schemaVersion: 0 })).toBe(
      false,
    )
  })

  it('rejects a state whose selected student is missing', () => {
    expect(
      isValidAppState({ ...createInitialState(), selectedStudentId: 'stu-999' }),
    ).toBe(false)
  })

  it('rejects a state with missing domain arrays', () => {
    const state = createInitialState()
    expect(
      isValidAppState({ ...state, helpRequests: undefined }),
    ).toBe(false)
  })

  it('rejects an unknown scenario id', () => {
    expect(
      isValidAppState({ ...createInitialState(), scenarioId: 'unknown' }),
    ).toBe(false)
  })

  it('accepts a non-default scenario seed', () => {
    expect(isValidAppState(createInitialState('road_block'))).toBe(true)
  })
})
