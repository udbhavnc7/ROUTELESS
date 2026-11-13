import type { AppState } from '../data/types'
import { SCHEMA_VERSION, STORAGE_KEY } from '../data/schema'
import { isScenarioId } from '../data/scenarios'

const ARRAY_KEYS = [
  'villages',
  'institutions',
  'students',
  'transportOptions',
  'incidents',
  'helpRequests',
  'assignments',
  'proposals',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Loose structural validation: enough to refuse corrupt or stale payloads. */
export function isValidAppState(value: unknown): value is AppState {
  if (!isRecord(value)) return false
  if (value.schemaVersion !== SCHEMA_VERSION) return false
  if (typeof value.clockMin !== 'number') return false
  if (value.role !== 'student' && value.role !== 'coordinator') return false
  if (typeof value.scenarioId !== 'string' || !isScenarioId(value.scenarioId)) {
    return false
  }
  if (!ARRAY_KEYS.every((key) => Array.isArray(value[key]))) return false

  const students = value.students as Array<{ id?: unknown }>
  const villages = value.villages as Array<{ id?: unknown }>
  if (!students.some((s) => s.id === value.selectedStudentId)) return false
  if (!villages.some((v) => v.id === value.selectedVillageId)) return false

  return students.length > 0 && villages.length > 0
}

export function isStorageAvailable(): boolean {
  try {
    const probe = `${STORAGE_KEY}.probe`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export type StorageStatus = 'ok' | 'unavailable'

let storageStatus: StorageStatus | null = null
const storageListeners = new Set<() => void>()

export function getStorageStatus(): StorageStatus {
  if (storageStatus === null) {
    storageStatus = isStorageAvailable() ? 'ok' : 'unavailable'
  }
  return storageStatus
}

export function subscribeStorageStatus(listener: () => void): () => void {
  storageListeners.add(listener)
  return () => {
    storageListeners.delete(listener)
  }
}

function setStorageStatus(next: StorageStatus): void {
  if (getStorageStatus() === next) return
  storageStatus = next
  for (const listener of storageListeners) listener()
}

export function loadState(): AppState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isValidAppState(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveState(state: AppState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setStorageStatus('ok')
    return true
  } catch {
    setStorageStatus('unavailable')
    return false
  }
}

export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do: storage is unavailable.
  }
}
