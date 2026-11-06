// Vibration is an optional extra: it works in Chromium on Android, and is not supported by
// iOS Safari. Only used on touch-first devices; does nothing elsewhere.
export function vibrate(ms: number): void {
  try {
    if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) navigator.vibrate?.(ms)
  } catch {
    // Ignore.
  }
}
