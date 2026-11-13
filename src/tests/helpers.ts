import type { AppState } from '../data/types'
import { createInitialState, BREAKDOWN_INCIDENT_ID } from '../data/demoFixtures'
import { appReducer } from '../state/reducer'

/**
 * The showcase state: all twelve Village C students have reported and the
 * coordinator has confirmed the B2 breakdown.
 */
export function confirmedBreakdownState(): AppState {
  let state = createInitialState()
  state = appReducer(state, {
    type: 'REPORT_PROBLEM',
    studentId: 'stu-001',
    incidentType: 'breakdown',
  })
  return appReducer(state, {
    type: 'CONFIRM_INCIDENT',
    incidentId: BREAKDOWN_INCIDENT_ID,
  })
}

/** Confirmed breakdown with a draft recovery proposal already computed. */
export function stateWithDraftPlan(): AppState {
  return appReducer(confirmedBreakdownState(), {
    type: 'RUN_RECOVERY',
    incidentId: BREAKDOWN_INCIDENT_ID,
  })
}
