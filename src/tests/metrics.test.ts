import { describe, expect, it } from 'vitest'
import type { AppState, HelpRequest } from '../data/types'
import { createInitialState, BREAKDOWN_INCIDENT_ID } from '../data/demoFixtures'
import {
  affectedRequests,
  dashboardMetrics,
  displayVehicleStatus,
  freeSeats,
  reportedStudentIds,
} from '../domain/metrics'
import { appReducer } from '../state/reducer'
import { stateWithDraftPlan } from './helpers'

describe('derived metrics', () => {
  it('reports eleven unique reporters before confirmation', () => {
    const state = createInitialState()
    expect(reportedStudentIds(state).size).toBe(11)
    expect(affectedRequests(state)).toHaveLength(0)
    expect(dashboardMetrics(state).affected).toBe(0)
    expect(dashboardMetrics(state).backupSeats).toBe(8)
    expect(dashboardMetrics(state).confirmedPlacements).toBe(0)
  })

  it('counts twelve affected after confirmation without duplicating students', () => {
    let state = appReducer(createInitialState(), {
      type: 'REPORT_PROBLEM',
      studentId: 'stu-001',
      incidentType: 'breakdown',
    })
    state = appReducer(state, {
      type: 'CONFIRM_INCIDENT',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    expect(affectedRequests(state)).toHaveLength(12)
    expect(dashboardMetrics(state).reports).toBe(12)
    expect(dashboardMetrics(state).affected).toBe(12)
    expect(dashboardMetrics(state).unserved).toBe(0)
  })

  it('deduplicates a student across two confirmed incidents', () => {
    const base = createInitialState()
    const extraIncident = {
      ...base.incidents[0]!,
      id: 'inc-b1-delay',
      transportOptionId: 'b1',
      type: 'delay' as const,
      status: 'confirmed' as const,
    }
    const confirmedB2 = {
      ...base.incidents[0]!,
      status: 'confirmed' as const,
    }
    const extraRequests: HelpRequest[] = [
      {
        id: 'hr-stu-001-extra',
        studentId: 'stu-001',
        incidentId: 'inc-b1-delay',
        status: 'pending',
        createdAtMin: 480,
        source: 'student',
      },
      {
        id: 'hr-stu-001-b2',
        studentId: 'stu-001',
        incidentId: BREAKDOWN_INCIDENT_ID,
        status: 'pending',
        createdAtMin: 480,
        source: 'student',
      },
    ]
    const state: AppState = {
      ...base,
      incidents: [confirmedB2, extraIncident],
      helpRequests: [...base.helpRequests, ...extraRequests],
    }
    expect(affectedRequests(state)).toHaveLength(12)
  })

  it('subtracts confirmed rescue assignments from free seats once', () => {
    const state: AppState = {
      ...createInitialState(),
      assignments: [
        {
          id: 'as-1',
          requestId: 'hr-stu-002-inc-b2-breakdown',
          studentId: 'stu-002',
          transportOptionId: 'v1',
          status: 'confirmed',
          explanation: 'test',
          createdAtMin: 480,
        },
      ],
    }
    const v1 = state.transportOptions.find((o) => o.id === 'v1')!
    expect(freeSeats(state, v1)).toBe(7)
    expect(dashboardMetrics(state).backupSeats).toBe(7)
    expect(dashboardMetrics(state).confirmedPlacements).toBe(1)
  })

  it('never lets confirmed seats push free seats below zero', () => {
    const base = createInitialState()
    const v1 = base.transportOptions.find((o) => o.id === 'v1')!
    const assignments = Array.from({ length: 12 }, (_, index) => ({
      id: `as-${index}`,
      requestId: `hr-${index}`,
      studentId: `stu-${index}`,
      transportOptionId: 'v1',
      status: 'confirmed' as const,
      explanation: 'test',
      createdAtMin: 480,
    }))
    const state: AppState = { ...base, assignments }
    expect(freeSeats(state, v1)).toBe(0)
  })

  it('counts an escalated student as still unserved', () => {
    const drafted = stateWithDraftPlan()
    const proposalId = drafted.proposals[0]?.id
    if (!proposalId) throw new Error('missing proposal')
    const approved = appReducer(drafted, {
      type: 'APPROVE_PROPOSAL',
      proposalId,
    })
    const unservedRequest = approved.helpRequests.find(
      (request) => request.status === 'unserved',
    )
    if (!unservedRequest) throw new Error('missing unserved request')
    const escalated = appReducer(approved, {
      type: 'ESCALATE_REQUEST',
      requestId: unservedRequest.id,
    })

    expect(
      escalated.helpRequests.filter((request) => request.status === 'escalated'),
    ).toHaveLength(1)
    expect(dashboardMetrics(escalated).unserved).toBe(4)
  })

  it('derives a suspended vehicle from a confirmed breakdown', () => {
    const confirmed = appReducer(createInitialState(), {
      type: 'CONFIRM_INCIDENT',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    const b2 = confirmed.transportOptions.find((o) => o.id === 'b2')!
    expect(displayVehicleStatus(confirmed, b2)).toBe('cancelled')
  })

  it('counts only backup seats that can reach a confirmed incident village', () => {
    const breakdown = appReducer(createInitialState(), {
      type: 'CONFIRM_INCIDENT',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    expect(dashboardMetrics(breakdown).backupSeats).toBe(8)

    // The same verified van is unreachable when its corridor is blocked.
    const blocked = appReducer(createInitialState('road_block'), {
      type: 'CONFIRM_INCIDENT',
      incidentId: 'inc-b2-road_block',
    })
    expect(dashboardMetrics(blocked).backupSeats).toBe(0)
  })

  it('counts no backup seats when the only backup is unverified', () => {
    const unverified = appReducer(createInitialState('no_backup'), {
      type: 'CONFIRM_INCIDENT',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    expect(dashboardMetrics(unverified).backupSeats).toBe(0)
  })
})
