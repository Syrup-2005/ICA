import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_STATS, parseStats, readSoundLevel, withRun } from './storage'

function fakeStorage(entries: Record<string, string>) {
  return { getItem: (key: string) => entries[key] ?? null, setItem: vi.fn() }
}

afterEach(() => vi.unstubAllGlobals())

describe('readSoundLevel', () => {
  it('uses a saved level', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'ica-sound': 'med' }))
    expect(readSoundLevel()).toBe('med')
  })

  it('migrates the old on/off setting: on → low', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'ica-sound-enabled': 'true' }))
    expect(readSoundLevel()).toBe('low')
  })

  it('keeps an old "off" choice off', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'ica-sound-enabled': 'false' }))
    expect(readSoundLevel()).toBe('off')
  })

  it('defaults new players to low (A1), and ignores invalid values', () => {
    vi.stubGlobal('localStorage', fakeStorage({}))
    expect(readSoundLevel()).toBe('low')
    vi.stubGlobal('localStorage', fakeStorage({ 'ica-sound': 'loud' }))
    expect(readSoundLevel()).toBe('low')
  })

  it('falls back to low when storage throws', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') } })
    expect(readSoundLevel()).toBe('low')
  })
})

describe('stats', () => {
  it('reads valid stats', () => {
    expect(parseStats('{"v":1,"bestWords":12,"bestWpm":48,"runs":3}')).toEqual({ v: 1, bestWords: 12, bestWpm: 48, runs: 3 })
  })

  it('falls back to zeros for missing, corrupt or unknown-version data', () => {
    for (const raw of [null, '', '{', '[]', '"x"', '{"v":2,"bestWords":5}']) expect(parseStats(raw)).toEqual(EMPTY_STATS)
  })

  it('clamps bad numbers', () => {
    expect(parseStats('{"v":1,"bestWords":-4,"bestWpm":9999,"runs":"7"}')).toEqual({ v: 1, bestWords: 0, bestWpm: 400, runs: 0 })
  })

  it('records a run without lowering bests', () => {
    const s = withRun({ v: 1, bestWords: 10, bestWpm: 50, runs: 2 }, 7, null)
    expect(s).toEqual({ v: 1, bestWords: 10, bestWpm: 50, runs: 3 })
    expect(withRun(s, 15, 62)).toEqual({ v: 1, bestWords: 15, bestWpm: 62, runs: 4 })
  })
})
