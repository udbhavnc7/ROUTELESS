import type {
  AppState,
  HelpRequest,
  Incident,
  Student,
  TransportOption,
  VehicleStatus,
} from '../data/types'

export function nonDismissedIncidents(state: AppState): Incident[] {
  return state.incidents.filter((incident) => incident.status !== 'dismissed')
}

/** Prefer a confirmed incident, then a reported one. Dismissed is ignored. */
export function incidentForOption(
  state: AppState,
  optionId: string,
): Incident | undefined {
  const candidates = nonDismissedIncidents(state).filter(
    (incident) => incident.transportOptionId === optionId,
  )
  return (
    candidates.find((incident) => incident.status === 'confirmed') ??
    candidates.find((incident) => incident.status === 'reported')
  )
}

export function requestsForIncident(
  state: AppState,
  incidentId: string,
): HelpRequest[] {
  return state.helpRequests.filter((request) => request.incidentId === incidentId)
}

export function latestRequestForStudent(
  state: AppState,
  studentId: string,
): HelpRequest | undefined {
  const requests = state.helpRequests.filter(
    (request) => request.studentId === studentId,
  )
  return requests.length > 0 ? requests[requests.length - 1] : undefined
}

export function freeSeats(state: AppState, option: TransportOption): number {
  const confirmedRescue = state.assignments.filter(
    (assignment) =>
      assignment.transportOptionId === option.id &&
      assignment.status === 'confirmed',
  ).length
  return Math.max(0, option.capacity - option.occupiedSeats - confirmedRescue)
}

/** Unique students with a request in a confirmed incident. */
export function affectedRequests(state: AppState): HelpRequest[] {
  const confirmed = new Set(
    state.incidents
      .filter((incident) => incident.status === 'confirmed')
      .map((incident) => incident.id),
  )
  const seen = new Set<string>()
  const result: HelpRequest[] = []
  for (const request of state.helpRequests) {
    if (!confirmed.has(request.incidentId)) continue
    if (seen.has(request.studentId)) continue
    seen.add(request.studentId)
    result.push(request)
  }
  return result
}

export function reportedStudentIds(state: AppState): Set<string> {
  const openIncidents = new Set(nonDismissedIncidents(state).map((i) => i.id))
  return new Set(
    state.helpRequests
      .filter((request) => openIncidents.has(request.incidentId))
      .map((request) => request.studentId),
  )
}

export function studentsOnOption(
  state: AppState,
  optionId: string,
): Student[] {
  return state.students.filter((student) => student.routeOptionId === optionId)
}

export function studentsForIncident(
  state: AppState,
  incident: Incident,
): Student[] {
  return state.students.filter(
    (student) =>
      student.routeOptionId === incident.transportOptionId &&
      incident.affectedVillageIds.includes(student.villageId),
  )
}

/** Derived operating state, so a confirmed disruption cannot disagree with the fleet. */
export function displayVehicleStatus(
  state: AppState,
  option: TransportOption,
): VehicleStatus {
  const confirmed = state.incidents.find(
    (incident) =>
      incident.transportOptionId === option.id &&
      incident.status === 'confirmed',
  )
  if (!confirmed) return option.status
  if (confirmed.type === 'delay') return 'delayed'
  if (confirmed.type === 'full') return option.status
  return 'cancelled'
}

export function verifiedRescueOptions(state: AppState): TransportOption[] {
  return state.transportOptions.filter(
    (option) =>
      option.verified &&
      option.kind === 'institution_vehicle' &&
      displayVehicleStatus(state, option) === 'active',
  )
}

/**
 * Verified rescue vehicles that can actually reach one of these villages.
 * A blocked corridor removes a vehicle even when it is otherwise eligible.
 */
export function usableRescueOptions(
  state: AppState,
  villageIds: Iterable<string>,
): TransportOption[] {
  const targets = new Set(villageIds)
  return verifiedRescueOptions(state).filter((option) =>
    option.villageIds.some((villageId) => {
      if (!targets.has(villageId)) return false
      const village = state.villages.find((entry) => entry.id === villageId)
      return village
        ? !option.blockedCorridorIds.includes(village.corridorId)
        : false
    }),
  )
}

export type DashboardMetrics = {
  reports: number
  affected: number
  confirmedIncidents: number
  backupSeats: number
  confirmedPlacements: number
  unserved: number
}

export function dashboardMetrics(state: AppState): DashboardMetrics {
  const affected = affectedRequests(state)
  const confirmed = state.incidents.filter(
    (incident) => incident.status === 'confirmed',
  )
  const affectedVillageIds = new Set(
    confirmed.flatMap((incident) => incident.affectedVillageIds),
  )
  const reachable =
    confirmed.length === 0
      ? verifiedRescueOptions(state)
      : usableRescueOptions(state, affectedVillageIds)
  const backupSeats = reachable.reduce(
    (total, option) => total + freeSeats(state, option),
    0,
  )
  return {
    reports: reportedStudentIds(state).size,
    affected: affected.length,
    confirmedIncidents: confirmed.length,
    backupSeats,
    confirmedPlacements: state.assignments.filter((a) => a.status === 'confirmed')
      .length,
    unserved: state.helpRequests.filter(
      (request) =>
        request.status === 'unserved' || request.status === 'escalated',
    ).length,
  }
}
