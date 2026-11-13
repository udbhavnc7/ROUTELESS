import type {
  IncidentStatus,
  IncidentType,
  RequestStatus,
  Role,
  TransportKind,
  VehicleStatus,
} from './types'

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  no_show: 'Bus did not arrive',
  full: 'Bus was full',
  delay: 'Bus is late',
  breakdown: 'Bus broke down',
  road_block: 'Road is blocked',
}

export const INCIDENT_TYPE_DETAILS: Record<IncidentType, string> = {
  no_show: 'No service at the stop at the scheduled time.',
  full: 'The bus arrived but students could not board.',
  delay: 'More than 15 minutes behind the scheduled time.',
  breakdown: 'The vehicle stopped and is not continuing the trip.',
  road_block: 'The route is blocked; no safe detour is configured.',
}

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Unverified',
  confirmed: 'Confirmed',
  dismissed: 'Dismissed',
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Awaiting review',
  proposed: 'Proposed',
  confirmed: 'Seat confirmed',
  unserved: 'Unserved',
  escalated: 'Help requested',
}

export const ROLE_LABELS: Record<Role, string> = {
  student: 'Student',
  coordinator: 'Coordinator',
}

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  active: 'Operating',
  delayed: 'Delayed',
  cancelled: 'Suspended',
}

export const VEHICLE_KIND_LABELS: Record<TransportKind, string> = {
  government_bus: 'Government bus',
  institution_vehicle: 'Institution vehicle',
}
