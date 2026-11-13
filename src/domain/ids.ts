import type { IncidentType } from '../data/types'

/** Stable, deterministic ids so repeated actions cannot duplicate records. */
export const incidentId = (optionId: string, type: IncidentType) =>
  `inc-${optionId}-${type}`

export const helpRequestId = (studentId: string, incidentIdValue: string) =>
  `hr-${studentId}-${incidentIdValue}`
