import { describe, expect, it } from 'vitest'
import {
  INTRO_DURATION_MS,
  INTRO_STORAGE_KEY,
  markIntroSeen,
  shouldShowIntro,
} from '../lib/intro'

describe('intro gating', () => {
  it('shows on a first visit', () => {
    expect(shouldShowIntro({ search: '', seen: null })).toBe(true)
  })

  it('does not show again once dismissed in this session', () => {
    expect(shouldShowIntro({ search: '', seen: '1' })).toBe(false)
  })

  it('skipIntro=1 always wins, even when forced on', () => {
    expect(shouldShowIntro({ search: '?skipIntro=1&intro=1', seen: null })).toBe(false)
  })

  it('intro=0 hides the intro without being remembered', () => {
    expect(shouldShowIntro({ search: '?intro=0', seen: null })).toBe(false)
  })

  it('intro=1 replays the intro in a session where it was seen', () => {
    expect(shouldShowIntro({ search: '?intro=1', seen: '1' })).toBe(true)
  })

  it('ignores unrelated query parameters', () => {
    expect(shouldShowIntro({ search: '?scenario=exam_crisis', seen: null })).toBe(true)
  })

  it('records dismissal and survives a storage that throws', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    markIntroSeen(storage)
    expect(values.get(INTRO_STORAGE_KEY)).toBe('1')

    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(() => markIntroSeen(broken)).not.toThrow()
  })

  it('runs long enough to read but short enough to skip', () => {
    expect(INTRO_DURATION_MS).toBeGreaterThanOrEqual(5000)
    expect(INTRO_DURATION_MS).toBeLessThanOrEqual(9000)
  })
})
