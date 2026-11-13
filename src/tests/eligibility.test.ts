import { describe, expect, it } from 'vitest'
import { confirmedBreakdownState } from './helpers'
import { assessVehicleForStudent } from '../domain/eligibility'

function state() {
  return confirmedBreakdownState()
}

function student(s: ReturnType<typeof state>, id: string) {
  const found = s.students.find((entry) => entry.id === id)
  if (!found) throw new Error(`missing student ${id}`)
  return found
}

function option(s: ReturnType<typeof state>, id: string) {
  const found = s.transportOptions.find((entry) => entry.id === id)
  if (!found) throw new Error(`missing option ${id}`)
  return found
}

describe('vehicle eligibility', () => {
  it('accepts the verified accessible van for a Village C student', () => {
    const s = state()
    const result = assessVehicleForStudent(s, student(s, 'stu-002'), option(s, 'v1'))
    expect(result.eligible).toBe(true)
    expect(result.rejection).toBeUndefined()
    expect(result.arrivalMin).toBe(8 * 60 + 52)
    expect(result.seatsAvailable).toBe(8)
  })

  it('rejects a government bus even when it has spare seats', () => {
    const s = state()
    const result = assessVehicleForStudent(s, student(s, 'stu-013'), option(s, 'b1'))
    expect(result.eligible).toBe(false)
    expect(result.rejection).toBe('vehicle_not_institution')
  })

  it('rejects an unverified vehicle', () => {
    const s = state()
    const result = assessVehicleForStudent(s, student(s, 'stu-002'), option(s, 'v2'))
    expect(result.eligible).toBe(false)
    expect(result.rejection).toBe('vehicle_unverified')
  })

  it('rejects a vehicle that does not serve the student village', () => {
    const s = state()
    const result = assessVehicleForStudent(s, student(s, 'stu-013'), option(s, 'v1'))
    expect(result.eligible).toBe(false)
    expect(result.rejection).toBe('village_not_served')
  })

  it('rejects a non-accessible vehicle for a student who needs step-free access', () => {
    const s = state()
    s.transportOptions = s.transportOptions.map((entry) =>
      entry.id === 'v1' ? { ...entry, accessible: false } : entry,
    )
    const result = assessVehicleForStudent(s, student(s, 'stu-007'), option(s, 'v1'))
    expect(result.eligible).toBe(false)
    expect(result.rejection).toBe('accessible_required')
  })

  it('rejects a vehicle that arrives after an exam deadline', () => {
    const s = state()
    s.transportOptions = s.transportOptions.map((entry) =>
      entry.id === 'v1' ? { ...entry, collegeArrivalMin: 9 * 60 + 1 } : entry,
    )
    const result = assessVehicleForStudent(s, student(s, 'stu-003'), option(s, 'v1'))
    expect(result.eligible).toBe(false)
    expect(result.rejection).toBe('deadline_missed')
  })

  it('allows the documented grace period on a regular class day', () => {
    const s = state()
    s.transportOptions = s.transportOptions.map((entry) =>
      entry.id === 'v1' ? { ...entry, collegeArrivalMin: 9 * 60 + 1 } : entry,
    )
    const result = assessVehicleForStudent(s, student(s, 'stu-002'), option(s, 'v1'))
    expect(result.eligible).toBe(true)
  })

  it('rejects an inactive vehicle', () => {
    const s = state()
    s.transportOptions = s.transportOptions.map((entry) =>
      entry.id === 'v1' ? { ...entry, status: 'cancelled' } : entry,
    )
    const result = assessVehicleForStudent(s, student(s, 'stu-002'), option(s, 'v1'))
    expect(result.eligible).toBe(false)
    expect(result.rejection).toBe('vehicle_inactive')
  })

  it('rejects a vehicle crossing a blocked corridor', () => {
    const s = state()
    s.transportOptions = s.transportOptions.map((entry) =>
      entry.id === 'v1' ? { ...entry, blockedCorridorIds: ['c-south'] } : entry,
    )
    const result = assessVehicleForStudent(s, student(s, 'stu-002'), option(s, 'v1'))
    expect(result.eligible).toBe(false)
    expect(result.rejection).toBe('corridor_blocked')
  })

  it('rejects a vehicle with no free seats', () => {
    const s = state()
    s.transportOptions = s.transportOptions.map((entry) =>
      entry.id === 'v1' ? { ...entry, occupiedSeats: entry.capacity } : entry,
    )
    const result = assessVehicleForStudent(s, student(s, 'stu-002'), option(s, 'v1'))
    expect(result.eligible).toBe(false)
    expect(result.rejection).toBe('no_seats_left')
    expect(result.seatsAvailable).toBe(0)
  })
})
