export const INTRO_STORAGE_KEY = 'routeless.intro.seen'
export const INTRO_DURATION_MS = 6800

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

/**
 * The intro is shown once per browser session. Query overrides exist so the
 * demo can replay it (`?intro=1`) or jump straight in (`?skipIntro=1`); the
 * skip override wins because it is the one QA and repeat visitors reach for.
 */
export function shouldShowIntro({
  search,
  seen,
}: {
  search: string
  seen: string | null
}): boolean {
  const params = new URLSearchParams(search)
  if (params.get('skipIntro') === '1') return false
  if (params.get('intro') === '0') return false
  if (params.get('intro') === '1') return true
  return seen !== '1'
}

export function markIntroSeen(storage: StorageLike): void {
  try {
    storage.setItem(INTRO_STORAGE_KEY, '1')
  } catch {
    // Storage can be unavailable; the intro simply reappears next visit.
  }
}

export function readIntroSeen(storage: StorageLike): string | null {
  try {
    return storage.getItem(INTRO_STORAGE_KEY)
  } catch {
    return null
  }
}
