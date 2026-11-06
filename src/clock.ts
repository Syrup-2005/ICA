// Monotonic clock for game timing. Unlike Date.now(), it never jumps when the
// system clock is changed or re-synced, so it can't drain survival unfairly.
export const now = (): number => performance.now()
