import type { AppState, Student, TransportOption } from '../data/types'
import { displayVehicleStatus, freeSeats } from './metrics'

export type VehicleRejection =
  | 'vehicle_not_institution'
  | 'vehicle_unverified'
  | 'vehicle_inactive'
  | 'village_not_served'
  | 'corridor_blocked'
  | 'accessible_required'
  | 'deadline_missed'
  | 'no_seats_left'

export type VehicleAssessment = {
  optionId: string
  optionLabel: string
  eligible: boolean
  rejection?: VehicleRejection
  /** Scheduled campus arrival in demo minutes. */
  arrivalMin: number
  /** Confirmed seats free. Proposals never reserve a seat. */
  seatsAvailable: number
}

export function studentDeadline(state: AppState, student: Student): number {
  const institution = state.institutions.find(
    (entry) => entry.id === student.institutionId,
  )
  const grace = student.isExamDay
    ? (institution?.examGraceMin ?? 0)
    : (institution?.regularGraceMin ?? 0)
  return student.classStartMin + grace
}

/**
 * Hard constraints only. No scoring and no side effects: a vehicle either may
 * carry this student or it may not.
 */
export function assessVehicleForStudent(
  state: AppState,
  student: Student,
  option: TransportOption,
): VehicleAssessment {
  const base = {
    optionId: option.id,
    optionLabel: option.label,
    arrivalMin: option.collegeArrivalMin,
    seatsAvailable: freeSeats(state, option),
  }

  const reject = (rejection: VehicleRejection): VehicleAssessment => ({
    ...base,
    eligible: false,
    rejection,
  })

  if (option.kind !== 'institution_vehicle') {
    return reject('vehicle_not_institution')
  }
  if (!option.verified) {
    return reject('vehicle_unverified')
  }
  if (displayVehicleStatus(state, option) !== 'active') {
    return reject('vehicle_inactive')
  }

  const village = state.villages.find((entry) => entry.id === student.villageId)
  if (!village || !option.villageIds.includes(village.id)) {
    return reject('village_not_served')
  }
  if (option.blockedCorridorIds.includes(village.corridorId)) {
    return reject('corridor_blocked')
  }
  if (student.needsAccessibleVehicle && !option.accessible) {
    return reject('accessible_required')
  }

  const deadline = studentDeadline(state, student)
  if (option.collegeArrivalMin > deadline) {
    return reject('deadline_missed')
  }
  if (base.seatsAvailable <= 0) {
    return reject('no_seats_left')
  }

  return { ...base, eligible: true }
}
