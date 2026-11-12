// localStorage can throw (privacy modes, blocked site data), so every access is guarded.
// Saved values are a convenience; the game must run without them.
import { SOUND_LEVELS, pick, type SoundLevel } from './feel/rules'

export const BEST_COMBO_KEY = 'ica-best-combo'
export const SOUND_LEVEL_KEY = 'ica-sound' // 'off' | 'low' | 'med' | 'high'
export const EFFECTS_KEY = 'ica-effects' // 'full' | 'subtle' | 'off'; absent = follow the OS
export const SOUND_CHARACTER_KEY = 'ica-sound-character' // 'soft' | 'thock' | 'wood' | 'pebble'
export const MODE_KEY = 'ica-mode' // 'arcade' | 'zen'
export const AMBIENT_KEY = 'ica-ambient' // 'on' | 'off' (zen pad)
export const STATS_KEY = 'ica-stats' // versioned JSON, see readStats
const LEGACY_SOUND_KEY = 'ica-sound-enabled' // v0.1–0.2: 'true' | 'false'

export function readNumber(key: string): number {
  try {
    const value = Number(localStorage.getItem(key) ?? 0)
    return Number.isFinite(value) && value >= 0 ? value : 0
  } catch {
    return 0
  }
}

export function readString(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

// The saved sound level; a v0.2 setting migrates (on → LOW, off stays off).
// Default for new players: LOW (add-on A1 / decision D2). Audio starts on the first key press.
export function readSoundLevel(): SoundLevel {
  const legacy = readString(LEGACY_SOUND_KEY)
  const fallback: SoundLevel = legacy === 'false' ? 'off' : 'low'
  return pick(SOUND_LEVELS, readString(SOUND_LEVEL_KEY), fallback)
}

// Personal bests for arcade runs. Versioned; anything missing, corrupt or out of range reads as
// zero, and reading never throws.
export interface Stats {
  v: 1
  bestWords: number
  bestWpm: number
  runs: number
}
export const EMPTY_STATS: Stats = { v: 1, bestWords: 0, bestWpm: 0, runs: 0 }

export function parseStats(raw: string | null): Stats {
  try {
    const data = JSON.parse(raw ?? 'null') as Record<string, unknown> | null
    if (!data || data.v !== 1) return EMPTY_STATS
    const count = (value: unknown, max: number) =>
      typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0
    return { v: 1, bestWords: count(data.bestWords, 1e6), bestWpm: count(data.bestWpm, 400), runs: count(data.runs, 1e9) }
  } catch {
    return EMPTY_STATS
  }
}

export function readStats(): Stats {
  return parseStats(readString(STATS_KEY))
}

export function withRun(stats: Stats, words: number, wpm: number | null): Stats {
  return {
    v: 1,
    bestWords: Math.max(stats.bestWords, words),
    bestWpm: Math.max(stats.bestWpm, wpm ?? 0),
    runs: stats.runs + 1,
  }
}

export function writeStats(stats: Stats): void {
  writeValue(STATS_KEY, JSON.stringify(stats))
}

export function writeValue(key: string, value: string | number | boolean): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Ignore: persistence is optional.
  }
}
