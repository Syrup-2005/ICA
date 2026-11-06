import { afterEach, describe, expect, it, vi } from 'vitest'
import { readSoundLevel } from './storage'

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

  it('defaults to off, and ignores invalid values', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'ica-sound': 'loud' }))
    expect(readSoundLevel()).toBe('off')
  })

  it('falls back to off when storage throws', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') } })
    expect(readSoundLevel()).toBe('off')
  })
})
