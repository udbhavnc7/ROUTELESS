import type {
  AppState,
  HelpRequest,
  Incident,
  IncidentType,
  Institution,
  ScenarioId,
  Student,
  TransportOption,
  Village,
} from './types'
import { INCIDENT_TYPE_DETAILS } from './labels'
import { helpRequestId } from '../domain/ids'
import { SCHEMA_VERSION } from './schema'
import { DEFAULT_SCENARIO_ID } from './scenarios'

export const INSTITUTION_ID = 'inst-demo-college'
export const DEMO_CLOCK_MIN = 8 * 60
export const DEMO_CLASS_START_MIN = 9 * 60
export const BREAKDOWN_INCIDENT_ID = 'inc-b2-breakdown'
export const AFFECTED_VILLAGE_ID = 'v-c'

type SeedIncident = {
  id: string
  transportOptionId: string
  type: IncidentType
  reportedAtMin: number
  details: string
  affectedVillageIds: string[]
}

type ScenarioSeed = {
  incidents: SeedIncident[]
  /** Per-scenario adjustments to the verified backup van. */
  v1: Partial<TransportOption>
  /** Adds the emergency college minibus used by the exam-day crisis. */
  emergencyMinibus?: boolean
  /** Extra students sitting exams in the crisis. */
  crisisExamStudentIds?: string[]
  /** Villages with seeded demand. Village C is always included. */
  demandVillages?: 'c' | 'network'
}

/**
 * The first four scenarios keep the same twelve-student Village C roster and
 * the same eleven seeded requests. The exam-day crisis expands demand to
 * Villages A and B, fails both government buses, and floods Village B's road.
 */
const SCENARIO_SEEDS: Record<ScenarioId, ScenarioSeed> = {
  breakdown: {
    incidents: [
      {
        id: BREAKDOWN_INCIDENT_ID,
        transportOptionId: 'b2',
        type: 'breakdown',
        reportedAtMin: 7 * 60 + 58,
        details:
          'B2 has not reached the Village C stop. Students are waiting at the roadside.',
        affectedVillageIds: [AFFECTED_VILLAGE_ID],
      },
    ],
    v1: {},
  },
  overcrowding: {
    incidents: [
      {
        id: 'inc-b2-full',
        transportOptionId: 'b2',
        type: 'full',
        reportedAtMin: 7 * 60 + 58,
        details:
          'B2 reached the Village C stop but students could not board. Demand is higher than the safe seat count.',
        affectedVillageIds: [AFFECTED_VILLAGE_ID],
      },
    ],
    v1: {},
  },
  road_block: {
    incidents: [
      {
        id: 'inc-b2-road_block',
        transportOptionId: 'b2',
        type: 'road_block',
        reportedAtMin: 7 * 60 + 58,
        details:
          'The south access road is closed and no verified detour is configured for Village C.',
        affectedVillageIds: [AFFECTED_VILLAGE_ID],
      },
    ],
    v1: {
      blockedCorridorIds: ['c-south'],
      note: 'The Village C access road is blocked in this scenario. Not eligible for recovery.',
    },
  },
  no_backup: {
    incidents: [
      {
        id: BREAKDOWN_INCIDENT_ID,
        transportOptionId: 'b2',
        type: 'breakdown',
        reportedAtMin: 7 * 60 + 58,
        details:
          'B2 has not reached the Village C stop and no verified backup vehicle is available.',
        affectedVillageIds: [AFFECTED_VILLAGE_ID],
      },
    ],
    v1: {
      verified: false,
      note: 'Verification lapsed in this scenario. Never eligible for recovery.',
    },
  },
  exam_crisis: {
    incidents: [
      {
        id: 'inc-b1-breakdown',
        transportOptionId: 'b1',
        type: 'breakdown',
        reportedAtMin: 7 * 60 + 57,
        details:
          'B1 did not arrive in Villages A or B. The second government bus is also out of service on exam day.',
        affectedVillageIds: ['v-a', 'v-b'],
      },
      {
        id: BREAKDOWN_INCIDENT_ID,
        transportOptionId: 'b2',
        type: 'breakdown',
        reportedAtMin: 7 * 60 + 58,
        details:
          'B2 has not reached the Village C stop. Both scheduled government buses are unavailable.',
        affectedVillageIds: [AFFECTED_VILLAGE_ID],
      },
    ],
    v1: {},
    emergencyMinibus: true,
    crisisExamStudentIds: ['stu-004', 'stu-011', 'stu-016'],
    demandVillages: 'network',
  },
}

export function scenarioIncidentId(scenarioId: ScenarioId): string {
  return SCENARIO_SEEDS[scenarioId].incidents[0].id
}

const studentId = (n: number) => `stu-${String(n).padStart(3, '0')}`

function makeStudent(
  n: number,
  villageId: string,
  routeOptionId: string,
  extra: Partial<Student> = {},
): Student {
  return {
    id: studentId(n),
    label: `STU-${String(n).padStart(3, '0')}`,
    villageId,
    institutionId: INSTITUTION_ID,
    classStartMin: DEMO_CLASS_START_MIN,
    isExamDay: false,
    previousUnservedDays: 0,
    routeOptionId,
    ...extra,
  }
}

/**
 * A seeded scenario. Every record is simulated and pseudonymous.
 *
 * All scenarios share one roster: Village C has twelve students on B2. Eleven
 * have already reported; STU-001 is left unreported so the demo can show a
 * report creating the twelfth request without ever double-counting demand.
 */
export function createInitialState(
  scenarioId: ScenarioId = DEFAULT_SCENARIO_ID,
): AppState {
  const seed = SCENARIO_SEEDS[scenarioId]
  const villages: Village[] = [
    {
      id: 'v-a',
      name: 'Village A',
      shortName: 'A',
      corridorId: 'c-north',
      travelMinutes: 34,
    },
    {
      id: 'v-b',
      name: 'Village B',
      shortName: 'B',
      corridorId: 'c-east',
      travelMinutes: 31,
    },
    {
      id: 'v-c',
      name: 'Village C',
      shortName: 'C',
      corridorId: 'c-south',
      travelMinutes: 38,
    },
  ]

  const institutions: Institution[] = [
    {
      id: INSTITUTION_ID,
      name: 'Demo District College',
      shortName: 'DDC',
      classStartMin: DEMO_CLASS_START_MIN,
      regularGraceMin: 5,
      examGraceMin: 0,
    },
  ]

  const crisisExams = new Set(seed.crisisExamStudentIds ?? [])
  const students: Student[] = [
    ...Array.from({ length: 12 }, (_, index) => {
      const n = index + 1
      const id = studentId(n)
      return makeStudent(n, 'v-c', 'b2', {
        isExamDay: n === 3 || crisisExams.has(id),
        needsAccessibleVehicle: n === 7 ? true : undefined,
        previousUnservedDays: n === 4 ? 2 : n === 11 ? 1 : 0,
      })
    }),
    makeStudent(13, 'v-a', 'b1'),
    makeStudent(14, 'v-a', 'b1', { isExamDay: true }),
    makeStudent(15, 'v-a', 'b1'),
    makeStudent(16, 'v-b', 'b1', {
      isExamDay: crisisExams.has(studentId(16)),
    }),
    makeStudent(17, 'v-b', 'b1'),
    makeStudent(18, 'v-b', 'b1'),
  ]

  const transportOptions: TransportOption[] = [
    {
      id: 'b1',
      label: 'B1',
      operator: 'State transport',
      kind: 'government_bus',
      verified: true,
      status: 'active',
      villageIds: ['v-a', 'v-b'],
      accessible: false,
      capacity: 44,
      occupiedSeats: 31,
      departureMin: 7 * 60 + 10,
      arrivalMinByVillage: {
        'v-a': 7 * 60 + 47,
        'v-b': 7 * 60 + 59,
      },
      collegeArrivalMin: 8 * 60 + 20,
      blockedCorridorIds: [],
    },
    {
      id: 'b2',
      label: 'B2',
      operator: 'State transport',
      kind: 'government_bus',
      verified: true,
      status: 'active',
      villageIds: ['v-c'],
      accessible: false,
      capacity: 40,
      occupiedSeats: 28,
      departureMin: 7 * 60 + 35,
      arrivalMinByVillage: {
        'v-c': 7 * 60 + 52,
      },
      collegeArrivalMin: 8 * 60 + 25,
      blockedCorridorIds: [],
    },
    {
      id: 'v1',
      label: 'V1',
      operator: 'Demo District College',
      kind: 'institution_vehicle',
      verified: true,
      status: 'active',
      villageIds: ['v-c'],
      accessible: true,
      capacity: 12,
      occupiedSeats: 4,
      departureMin: 8 * 60 + 5,
      arrivalMinByVillage: {
        'v-c': 8 * 60 + 35,
      },
      collegeArrivalMin: 8 * 60 + 52,
      blockedCorridorIds: [],
      note: 'Institution-approved backup van.',
      ...seed.v1,
    },
    ...(seed.emergencyMinibus
      ? [
          {
            id: 'v3',
            label: 'V3',
            operator: 'Demo District College',
            kind: 'institution_vehicle' as const,
            verified: true,
            status: 'active' as const,
            villageIds: ['v-a', 'v-b', 'v-c'],
            accessible: false,
            capacity: 14,
            occupiedSeats: 6,
            departureMin: 8 * 60 + 15,
            arrivalMinByVillage: {
              'v-a': 8 * 60 + 40,
              'v-b': 8 * 60 + 40,
              'v-c': 8 * 60 + 45,
            },
            collegeArrivalMin: 8 * 60 + 55,
            blockedCorridorIds: ['c-east'],
            note: 'Emergency exam-day minibus. The Village B road is flooded in this scenario.',
          },
        ]
      : []),
    {
      id: 'v2',
      label: 'V2',
      operator: 'Private hire',
      kind: 'institution_vehicle',
      verified: false,
      status: 'active',
      villageIds: ['v-c'],
      accessible: false,
      capacity: 9,
      occupiedSeats: 0,
      departureMin: 8 * 60 + 20,
      arrivalMinByVillage: {
        'v-c': 8 * 60 + 45,
      },
      collegeArrivalMin: 9 * 60 + 5,
      blockedCorridorIds: [],
      note: 'Not on the approved operator list. Never eligible for recovery.',
    },
  ]

  const incidents: Incident[] = seed.incidents.map((entry) => ({
    ...entry,
    status: 'reported',
    reportedBy: 'student',
  }))

  const b1Incident = incidents.find(
    (incident) => incident.transportOptionId === 'b1',
  )
  const b2Incident = incidents.find(
    (incident) => incident.transportOptionId === 'b2',
  )
  if (!b2Incident) throw new Error('scenario needs a B2 incident')

  const seededRequests: Array<{
    studentId: string
    incidentId: string
    createdAtMin: number
  }> = Array.from({ length: 11 }, (_, index) => {
    const n = index + 2
    return {
      studentId: studentId(n),
      incidentId: b2Incident.id,
      createdAtMin: 7 * 60 + 56 + (index % 4),
    }
  })

  if (seed.demandVillages === 'network' && b1Incident) {
    for (const n of [13, 14, 15]) {
      seededRequests.push({
        studentId: studentId(n),
        incidentId: b1Incident.id,
        createdAtMin: 7 * 60 + 54 + (n - 13),
      })
    }
    for (const n of [16, 17]) {
      seededRequests.push({
        studentId: studentId(n),
        incidentId: b1Incident.id,
        createdAtMin: 7 * 60 + 57 + (n - 16),
      })
    }
  }

  const helpRequests: HelpRequest[] = seededRequests.map(
    ({ studentId: requestStudentId, incidentId: requestIncidentId, createdAtMin }) => ({
      id: helpRequestId(requestStudentId, requestIncidentId),
      studentId: requestStudentId,
      incidentId: requestIncidentId,
      status: 'pending' as const,
      createdAtMin,
      source: 'seed' as const,
    }),
  )

  return {
    schemaVersion: SCHEMA_VERSION,
    scenarioId,
    clockMin: DEMO_CLOCK_MIN,
    role: 'student',
    institutionId: INSTITUTION_ID,
    selectedVillageId: AFFECTED_VILLAGE_ID,
    selectedStudentId: studentId(1),
    villages,
    institutions,
    students,
    transportOptions,
    incidents,
    helpRequests,
    assignments: [],
    proposals: [],
  }
}

export const incidentDetailsFor = (type: keyof typeof INCIDENT_TYPE_DETAILS) =>
  INCIDENT_TYPE_DETAILS[type]
