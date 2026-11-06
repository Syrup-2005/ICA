// localStorage can throw (privacy modes, blocked site data), so every access is guarded.
// Saved values are a convenience; the game must run without them.
import { SOUND_LEVELS, type SoundLevel } from './feel/rules'

export const BEST_COMBO_KEY = 'ica-best-combo'
export const SOUND_LEVEL_KEY = 'ica-sound' // 'off' | 'low' | 'med' | 'high'
export const EFFECTS_KEY = 'ica-effects' // 'full' | 'subtle' | 'off'; absent = follow the OS
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

// The saved sound level; a v0.2 "sound on" becomes LOW. Default: off (decision D2 is open).
export function readSoundLevel(): SoundLevel {
  const saved = readString(SOUND_LEVEL_KEY)
  if (saved && (SOUND_LEVELS as readonly string[]).includes(saved)) return saved as SoundLevel
  return readString(LEGACY_SOUND_KEY) === 'true' ? 'low' : 'off'
}

export function writeValue(key: string, value: string | number | boolean): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Ignore: persistence is optional.
  }
}
