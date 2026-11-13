import { describe, expect, it } from 'vitest'
import { createInitialState, BREAKDOWN_INCIDENT_ID } from '../data/demoFixtures'
import { appReducer } from '../state/reducer'
import { affectedRequests, freeSeats } from '../domain/metrics'
import { getStudentSituation } from '../domain/studentView'

describe('seeded breakdown scenario', () => {
  it('contains twelve Village C students on B2 and eleven reports', () => {
    const state = createInitialState()
    expect(state.students.filter((s) => s.villageId === 'v-c')).toHaveLength(12)
    expect(state.helpRequests).toHaveLength(11)
    expect(state.incidents).toHaveLength(1)
    expect(state.incidents[0]?.status).toBe('reported')
    expect(state.role).toBe('student')
    expect(state.clockMin).toBe(8 * 60)
  })

  it('gives V1 exactly eight free seats and excludes unverified V2 from backups', () => {
    const state = createInitialState()
    const v1 = state.transportOptions.find((o) => o.id === 'v1')
    const v2 = state.transportOptions.find((o) => o.id === 'v2')
    expect(v1 && freeSeats(state, v1)).toBe(8)
    expect(v2?.verified).toBe(false)
  })
})

describe('reporting', () => {
  it('creates exactly one request for the reporting student', () => {
    const state = appReducer(createInitialState(), {
      type: 'REPORT_PROBLEM',
      studentId: 'stu-001',
      incidentType: 'no_show',
    })
    const requests = state.helpRequests.filter((r) => r.studentId === 'stu-001')
    expect(requests).toHaveLength(1)
    expect(requests[0]?.incidentId).toBe(BREAKDOWN_INCIDENT_ID)
    expect(state.helpRequests).toHaveLength(12)
  })

  it('never duplicates a repeated report for the same student and incident', () => {
    const once = appReducer(createInitialState(), {
      type: 'REPORT_PROBLEM',
      studentId: 'stu-001',
      incidentType: 'breakdown',
    })
    const twice = appReducer(once, {
      type: 'REPORT_PROBLEM',
      studentId: 'stu-001',
      incidentType: 'no_show',
    })
    const thrice = appReducer(twice, {
      type: 'REPORT_PROBLEM',
      studentId: 'stu-001',
      incidentType: 'delay',
    })
    expect(thrice.helpRequests).toHaveLength(12)
    expect(
      new Set(thrice.helpRequests.map((r) => `${r.studentId}:${r.incidentId}`))
        .size,
    ).toBe(thrice.helpRequests.length)
  })

  it('keeps reports unverified until a coordinator confirms', () => {
    const reported = appReducer(createInitialState(), {
      type: 'REPORT_PROBLEM',
      studentId: 'stu-001',
      incidentType: 'breakdown',
    })
    expect(affectedRequests(reported)).toHaveLength(0)
    expect(reported.incidents[0]?.status).toBe('reported')

    const confirmed = appReducer(reported, {
      type: 'CONFIRM_INCIDENT',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    expect(confirmed.incidents[0]?.status).toBe('confirmed')
    expect(confirmed.incidents[0]?.confirmedAtMin).toBe(8 * 60)
    expect(affectedRequests(confirmed)).toHaveLength(12)

    const b2 = confirmed.transportOptions.find((o) => o.id === 'b2')
    expect(b2?.status).toBe('cancelled')
  })
})

describe('coordinator verification', () => {
  it('dismissal removes the signal from planning', () => {
    const dismissed = appReducer(createInitialState(), {
      type: 'DISMISS_INCIDENT',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    expect(dismissed.incidents[0]?.status).toBe('dismissed')
    expect(affectedRequests(dismissed)).toHaveLength(0)
    const b2 = dismissed.transportOptions.find((o) => o.id === 'b2')
    expect(b2?.status).toBe('active')
  })

  it('ignores confirmation of an already dismissed incident', () => {
    const dismissed = appReducer(createInitialState(), {
      type: 'DISMISS_INCIDENT',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    const after = appReducer(dismissed, {
      type: 'CONFIRM_INCIDENT',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    expect(after.incidents[0]?.status).toBe('dismissed')
  })

  it('reopens a dismissed report when a student reports again', () => {
    const dismissed = appReducer(createInitialState(), {
      type: 'DISMISS_INCIDENT',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    const reopened = appReducer(dismissed, {
      type: 'REPORT_PROBLEM',
      studentId: 'stu-001',
      incidentType: 'breakdown',
    })
    expect(reopened.incidents[0]?.status).toBe('reported')
    expect(reopened.helpRequests).toHaveLength(12)
  })
})

describe('selection, roles, reset', () => {
  it('selects the first student of a village and follows student selection', () => {
    const state = appReducer(createInitialState(), {
      type: 'SELECT_VILLAGE',
      villageId: 'v-a',
    })
    expect(state.selectedVillageId).toBe('v-a')
    expect(state.selectedStudentId).toBe('stu-013')

    const next = appReducer(state, { type: 'SELECT_STUDENT', studentId: 'stu-016' })
    expect(next.selectedVillageId).toBe('v-b')
  })

  it('switches demo roles without touching domain records', () => {
    const initial = createInitialState()
    const switched = appReducer(initial, { type: 'SET_ROLE', role: 'coordinator' })
    expect(switched.role).toBe('coordinator')
    expect(switched.helpRequests).toEqual(initial.helpRequests)
    expect(switched.incidents).toEqual(initial.incidents)
  })

  it('reset restores the exact seeded scenario', () => {
    const dirty = appReducer(createInitialState(), {
      type: 'CONFIRM_INCIDENT',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    const reset = appReducer(dirty, { type: 'RESET_DEMO' })
    expect(reset).toEqual(createInitialState())
  })
})

describe('student situation', () => {
  it('moves from scheduled to reported to confirmed', () => {
    expect(getStudentSituation(createInitialState(), 'stu-001')?.stage).toBe(
      'scheduled',
    )
    const reported = appReducer(createInitialState(), {
      type: 'REPORT_PROBLEM',
      studentId: 'stu-001',
      incidentType: 'no_show',
    })
    expect(getStudentSituation(reported, 'stu-001')?.stage).toBe('reported')
    const confirmed = appReducer(reported, {
      type: 'CONFIRM_INCIDENT',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    expect(getStudentSituation(confirmed, 'stu-001')?.stage).toBe('confirmed')
  })

  it('shows a dismissed state only to students who reported', () => {
    const dismissed = appReducer(createInitialState(), {
      type: 'DISMISS_INCIDENT',
      incidentId: BREAKDOWN_INCIDENT_ID,
    })
    expect(getStudentSituation(dismissed, 'stu-002')?.stage).toBe('dismissed')
    expect(getStudentSituation(dismissed, 'stu-001')?.stage).toBe('scheduled')
  })
})
