import type {
  AppState,
  HelpRequest,
  Student,
  TransportOption,
} from '../data/types'
import {
  assessVehicleForStudent,
  studentDeadline,
} from './eligibility'
import type { VehicleAssessment } from './eligibility'
import { freeSeats } from './metrics'
import { formatClock } from './time'

export type ProposedAssignment = {
  id: string
  requestId: string
  studentId: string
  transportOptionId: string
  explanation: string
}

export type UnservedRequest = {
  requestId: string
  studentId: string
  reason: string
}

export type RecoveryPlan = {
  incidentId: string
  assignments: ProposedAssignment[]
  unserved: UnservedRequest[]
}

const PLANNED_STATUSES = new Set(['pending', 'proposed', 'unserved'])

const EMPTY_PLAN = (incidentId: string): RecoveryPlan => ({
  incidentId,
  assignments: [],
  unserved: [],
})

function eligibilityFor(
  state: AppState,
  student: Student,
): VehicleAssessment[] {
  return state.transportOptions.map((option) =>
    assessVehicleForStudent(state, student, option),
  )
}

/**
 * A deterministic, constraint-aware allocation heuristic.
 *
 * It never invents capacity: seats come from the fleet, confirmed rescue
 * assignments are subtracted, and every rejection carries a reason. Draft
 * assignments do not reserve a seat; approval re-checks every invariant.
 *
 * Passing `requestIds` scopes the plan to a late-report supplement, so an
 * already approved plan is left untouched.
 */
export function buildRecoveryPlan(
  state: AppState,
  incidentId: string,
  requestIds?: string[],
): RecoveryPlan {
  const incident = state.incidents.find((entry) => entry.id === incidentId)
  if (!incident || incident.status !== 'confirmed') {
    return EMPTY_PLAN(incidentId)
  }

  const scope = requestIds ? new Set(requestIds) : undefined
  const requests = state.helpRequests.filter(
    (request) =>
      request.incidentId === incidentId &&
      PLANNED_STATUSES.has(request.status) &&
      (!scope || scope.has(request.id)),
  )
  if (requests.length === 0) return EMPTY_PLAN(incidentId)

  const students = new Map(state.students.map((entry) => [entry.id, entry]))
  const candidates = requests
    .map((request) => {
      const student = students.get(request.studentId)
      if (!student) return null
      const assessments = eligibilityFor(state, student)
      const alternatives = assessments.filter((entry) => entry.eligible).length
      return { request, student, alternatives }
    })
    .filter(
      (entry): entry is {
        request: HelpRequest
        student: Student
        alternatives: number
      } => entry !== null,
    )

  candidates.sort((a, b) => {
    if (a.student.isExamDay !== b.student.isExamDay) {
      return a.student.isExamDay ? -1 : 1
    }
    if (a.student.previousUnservedDays !== b.student.previousUnservedDays) {
      return b.student.previousUnservedDays - a.student.previousUnservedDays
    }
    if (a.alternatives !== b.alternatives) return a.alternatives - b.alternatives
    return a.student.id.localeCompare(b.student.id)
  })

  const remaining = new Map<string, number>()
  for (const option of state.transportOptions) {
    remaining.set(option.id, freeSeats(state, option))
  }
  const used = new Map<string, number>()

  const assignments: ProposedAssignment[] = []
  const unserved: UnservedRequest[] = []

  for (const { request, student } of candidates) {
    const assessments = eligibilityFor(state, student)
    const open = assessments
      .filter(
        (entry) => entry.eligible && (remaining.get(entry.optionId) ?? 0) > 0,
      )
      .sort((a, b) => {
        if (a.arrivalMin !== b.arrivalMin) return a.arrivalMin - b.arrivalMin
        return a.optionId.localeCompare(b.optionId)
      })

    const chosen = open[0]
    if (!chosen) {
      unserved.push({
        requestId: request.id,
        studentId: student.id,
        reason: unservedReason(state, student, assessments, remaining),
      })
      continue
    }

    const option = state.transportOptions.find(
      (entry) => entry.id === chosen.optionId,
    )
    if (!option) continue

    const seatNumber = (used.get(option.id) ?? 0) + 1
    used.set(option.id, seatNumber)
    remaining.set(option.id, (remaining.get(option.id) ?? 0) - 1)

    assignments.push({
      id: `asg-${request.id}`,
      requestId: request.id,
      studentId: student.id,
      transportOptionId: option.id,
      explanation: explainAssignment(
        state,
        student,
        option,
        seatNumber,
        chosen.seatsAvailable,
      ),
    })
  }

  return { incidentId, assignments, unserved }
}

function explainAssignment(
  state: AppState,
  student: Student,
  option: TransportOption,
  seatNumber: number,
  seatsAvailable: number,
): string {
  const village = state.villages.find((entry) => entry.id === student.villageId)
  const pickup = option.arrivalMinByVillage[student.villageId]
  const deadline = studentDeadline(state, student)
  const parts = [
    `${option.label} serves ${village?.name ?? 'this village'}.`,
    pickup !== undefined
      ? `Board at ${formatClock(pickup)}; campus by ${formatClock(option.collegeArrivalMin)}.`
      : `Campus by ${formatClock(option.collegeArrivalMin)}.`,
    student.isExamDay
      ? `Exam day priority with a ${formatClock(deadline)} deadline.`
      : `Before the ${formatClock(deadline)} class deadline.`,
    seatNumber === 1
      ? `Seat ${seatNumber} of ${seatsAvailable} available.`
      : `Seat ${seatNumber} of ${seatsAvailable} available.`,
  ]
  if (student.previousUnservedDays > 0) {
    parts.push(
      `Priority after ${student.previousUnservedDays} previous unserved day(s).`,
    )
  }
  if (student.needsAccessibleVehicle) {
    parts.push('Step-free vehicle required and provided.')
  }
  return parts.join(' ')
}

function unservedReason(
  state: AppState,
  student: Student,
  assessments: VehicleAssessment[],
  remaining: Map<string, number>,
): string {
  const village = state.villages.find((entry) => entry.id === student.villageId)
  const villageName = village?.name ?? 'this village'
  const institutionVehicles = assessments.filter((entry) => {
    const option = state.transportOptions.find(
      (candidate) => candidate.id === entry.optionId,
    )
    return option?.kind === 'institution_vehicle'
  })
  const verified = institutionVehicles.filter((entry) => {
    const option = state.transportOptions.find(
      (candidate) => candidate.id === entry.optionId,
    )
    return option?.verified
  })

  if (verified.length === 0) {
    return `No verified institution vehicle is available for ${villageName}.`
  }

  const rejection = (reason: VehicleAssessment['rejection']) =>
    verified.some((entry) => entry.rejection === reason)

  if (rejection('corridor_blocked')) {
    return `Every verified vehicle serving ${villageName} crosses a blocked corridor.`
  }
  if (rejection('accessible_required')) {
    return `The verified vehicle serving ${villageName} does not offer step-free access.`
  }
  if (rejection('deadline_missed')) {
    const deadline = studentDeadline(state, student)
    return `The verified vehicle reaching ${villageName} arrives after the ${formatClock(deadline)} deadline.`
  }
  if (rejection('vehicle_inactive')) {
    return `The verified vehicle serving ${villageName} is not operating.`
  }
  if (rejection('village_not_served')) {
    return `No verified institution vehicle serves ${villageName}.`
  }

  const labels = verified.map((entry) => entry.optionLabel).join(', ')
  const seats = verified.reduce(
    (total, entry) => total + (remaining.get(entry.optionId) ?? 0),
    0,
  )
  if (seats <= 0) {
    return `${labels}'s verified seats are all allocated to higher-priority students.`
  }
  return `${labels} has no remaining verified seats for ${villageName}.`
}
