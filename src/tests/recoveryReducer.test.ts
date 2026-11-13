import { describe, expect, it } from 'vitest'
import { BREAKDOWN_INCIDENT_ID, createInitialState } from '../data/demoFixtures'
import { dashboardMetrics, freeSeats } from '../domain/metrics'
import { appReducer } from '../state/reducer'
import { stateWithDraftPlan } from './helpers'

function v1Free(state: ReturnType<typeof stateWithDraftPlan>) {
  const option = state.transportOptions.find((entry) => entry.id === 'v1')
  if (!option) throw new Error('missing v1')
  return freeSeats(state, option)
}

describe('recovery reducer', () => {
  it('will not plan while the incident is unverified', () => {
    const state = createInitialState()
    const next = appReducer(state, {
      type: 'RUN_RECOVERY',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    expect(next).toBe(state)
    expect(next.proposals).toHaveLength(0)
  })

  it('creates a draft with eight proposed seats and four unserved requests', () => {
    const state = stateWithDraftPlan()
    expect(state.proposals).toHaveLength(1)
    expect(state.proposals[0]?.status).toBe('draft')
    expect(state.proposals[0]?.assignmentIds.length).toBe(8)
    expect(state.proposals[0]?.unserved).toHaveLength(4)
    expect(state.assignments).toHaveLength(8)
    expect(state.assignments.every((entry) => entry.status === 'proposed')).toBe(
      true,
    )
    expect(
      state.helpRequests.filter((entry) => entry.status === 'proposed'),
    ).toHaveLength(8)
    expect(
      state.helpRequests.filter((entry) => entry.status === 'unserved'),
    ).toHaveLength(4)
    expect(state.helpRequests.filter((entry) => entry.status === 'confirmed')).toHaveLength(0)
  })

  it('does not reserve a confirmed seat for a draft', () => {
    expect(v1Free(stateWithDraftPlan())).toBe(8)
  })

  it('re-running analysis replaces the draft without duplicating it', () => {
    const first = stateWithDraftPlan()
    const second = appReducer(first, {
      type: 'RUN_RECOVERY',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    expect(second.proposals).toHaveLength(1)
    expect(second.assignments).toHaveLength(8)
    expect(second.assignments.map((entry) => entry.id).sort()).toEqual(
      first.assignments.map((entry) => entry.id).sort(),
    )
    expect(
      second.helpRequests.filter((entry) => entry.status === 'proposed'),
    ).toHaveLength(8)
    expect(
      second.helpRequests.filter((entry) => entry.status === 'unserved'),
    ).toHaveLength(4)
  })

  it('approving confirms every seat exactly once and consumes capacity', () => {
    const state = stateWithDraftPlan()
    const proposalId = state.proposals[0]?.id
    if (!proposalId) throw new Error('missing proposal')
    const approved = appReducer(state, { type: 'APPROVE_PROPOSAL', proposalId })

    expect(approved.proposals[0]?.status).toBe('approved')
    expect(
      approved.assignments.every((entry) => entry.status === 'confirmed'),
    ).toBe(true)
    expect(
      approved.helpRequests.filter((entry) => entry.status === 'confirmed'),
    ).toHaveLength(8)
    expect(
      approved.helpRequests.filter((entry) => entry.status === 'unserved'),
    ).toHaveLength(4)
    expect(v1Free(approved)).toBe(0)

    const metrics = dashboardMetrics(approved)
    expect(metrics.confirmedPlacements).toBe(8)
    expect(metrics.unserved).toBe(4)
  })

  it('ignores a second approval', () => {
    const state = stateWithDraftPlan()
    const proposalId = state.proposals[0]?.id
    if (!proposalId) throw new Error('missing proposal')
    const approved = appReducer(state, { type: 'APPROVE_PROPOSAL', proposalId })
    const again = appReducer(approved, { type: 'APPROVE_PROPOSAL', proposalId })
    expect(again).toBe(approved)
  })

  it('will not approve when capacity changed after planning', () => {
    const state = stateWithDraftPlan()
    const proposalId = state.proposals[0]?.id
    if (!proposalId) throw new Error('missing proposal')
    const stale = {
      ...state,
      transportOptions: state.transportOptions.map((entry) =>
        entry.id === 'v1' ? { ...entry, occupiedSeats: entry.capacity } : entry,
      ),
    }
    const result = appReducer(stale, { type: 'APPROVE_PROPOSAL', proposalId })
    expect(result).toBe(stale)
    expect(result.assignments.every((entry) => entry.status === 'proposed')).toBe(
      true,
    )
  })

  it('rejecting returns students to awaiting plan and releases draft seats', () => {
    const state = stateWithDraftPlan()
    const proposalId = state.proposals[0]?.id
    if (!proposalId) throw new Error('missing proposal')
    const rejected = appReducer(state, { type: 'REJECT_PROPOSAL', proposalId })

    expect(rejected.proposals[0]?.status).toBe('discarded')
    expect(rejected.assignments).toHaveLength(0)
    expect(
      rejected.helpRequests.every((entry) => entry.status === 'pending'),
    ).toBe(true)
    expect(v1Free(rejected)).toBe(8)
  })

  it('will not re-plan over an approved proposal', () => {
    const state = stateWithDraftPlan()
    const proposalId = state.proposals[0]?.id
    if (!proposalId) throw new Error('missing proposal')
    const approved = appReducer(state, { type: 'APPROVE_PROPOSAL', proposalId })
    const again = appReducer(approved, {
      type: 'RUN_RECOVERY',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    expect(again).toBe(approved)
  })

  it('can plan again after a rejection', () => {
    const state = stateWithDraftPlan()
    const proposalId = state.proposals[0]?.id
    if (!proposalId) throw new Error('missing proposal')
    const rejected = appReducer(state, { type: 'REJECT_PROPOSAL', proposalId })
    const replanned = appReducer(rejected, {
      type: 'RUN_RECOVERY',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    expect(replanned.proposals).toHaveLength(1)
    expect(replanned.proposals[0]?.status).toBe('draft')
    expect(replanned.assignments).toHaveLength(8)
  })

  it('ignores unknown proposals', () => {
    const state = stateWithDraftPlan()
    expect(
      appReducer(state, { type: 'APPROVE_PROPOSAL', proposalId: 'prop-missing' }),
    ).toBe(state)
    expect(
      appReducer(state, { type: 'REJECT_PROPOSAL', proposalId: 'prop-missing' }),
    ).toBe(state)
  })
})
