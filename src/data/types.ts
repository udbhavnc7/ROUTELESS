export type Role = 'student' | 'coordinator'

export type IncidentType =
  | 'no_show'
  | 'full'
  | 'delay'
  | 'breakdown'
  | 'road_block'

export type IncidentStatus = 'reported' | 'confirmed' | 'dismissed'

export type VehicleStatus = 'active' | 'delayed' | 'cancelled'

export type RequestStatus =
  | 'pending'
  | 'proposed'
  | 'confirmed'
  | 'unserved'
  | 'escalated'

export type AssignmentStatus = 'proposed' | 'confirmed' | 'cancelled'

export type TransportKind = 'government_bus' | 'institution_vehicle'

export type ScenarioId =
  | 'breakdown'
  | 'overcrowding'
  | 'road_block'
  | 'no_backup'
  | 'exam_crisis'

export type Village = {
  id: string
  name: string
  shortName: string
  corridorId: string
  /** Simulated travel minutes from the village stop to campus. */
  travelMinutes: number
}

export type Institution = {
  id: string
  name: string
  shortName: string
  /** Minutes after midnight, demo local time. */
  classStartMin: number
  /** Documented tolerance for regular class days only. */
  regularGraceMin: number
  examGraceMin: number
}

export type Student = {
  id: string
  /** Pseudonymous demo label only, e.g. STU-001. */
  label: string
  villageId: string
  institutionId: string
  classStartMin: number
  isExamDay: boolean
  previousUnservedDays: number
  needsAccessibleVehicle?: boolean
  /** The service this student is rostered on in the demo. */
  routeOptionId: string
}

export type TransportOption = {
  id: string
  label: string
  operator: string
  kind: TransportKind
  verified: boolean
  status: VehicleStatus
  villageIds: string[]
  accessible: boolean
  capacity: number
  occupiedSeats: number
  departureMin: number
  /** Scheduled stop time per village, minutes after midnight. */
  arrivalMinByVillage: Record<string, number>
  collegeArrivalMin: number
  blockedCorridorIds: string[]
  note?: string
}

export type Incident = {
  id: string
  transportOptionId: string
  type: IncidentType
  status: IncidentStatus
  reportedBy: 'student' | 'coordinator'
  reportedAtMin: number
  confirmedAtMin?: number
  affectedVillageIds: string[]
  details: string
}

export type HelpRequest = {
  id: string
  studentId: string
  incidentId: string
  status: RequestStatus
  createdAtMin: number
  source: 'seed' | 'student'
  note?: string
}

export type Assignment = {
  id: string
  requestId: string
  studentId: string
  transportOptionId: string
  status: AssignmentStatus
  explanation: string
  createdAtMin: number
}

export type RecoveryProposal = {
  id: string
  incidentId: string
  createdAtMin: number
  status: 'draft' | 'approved' | 'discarded'
  /** Absent on proposals persisted before scenario replanning existed. */
  kind?: 'initial' | 'replan'
  assignmentIds: string[]
  unserved: { requestId: string; studentId: string; reason: string }[]
}

export type AppState = {
  schemaVersion: number
  scenarioId: ScenarioId
  /** Demo clock, minutes after midnight. Never the visitor's real time. */
  clockMin: number
  role: Role
  institutionId: string
  selectedVillageId: string
  selectedStudentId: string
  villages: Village[]
  institutions: Institution[]
  students: Student[]
  transportOptions: TransportOption[]
  incidents: Incident[]
  helpRequests: HelpRequest[]
  assignments: Assignment[]
  proposals: RecoveryProposal[]
}
