// localStorage can throw (privacy modes, blocked site data), so every access is guarded.
// Saved values are a convenience; the game must run without them.

export const BEST_COMBO_KEY = 'ica-best-combo'
export const SOUND_KEY = 'ica-sound-enabled'

export function readNumber(key: string): number {
  try {
    const value = Number(localStorage.getItem(key) ?? 0)
    return Number.isFinite(value) && value >= 0 ? value : 0
  } catch {
    return 0
  }
}

export function readBoolean(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

export function writeValue(key: string, value: string | number | boolean): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Ignore: persistence is optional.
  }
}
