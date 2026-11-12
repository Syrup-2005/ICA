// Pure helpers for the feel layer (no DOM, no audio): unit-tested in rules.test.ts.
import { FEEL } from './config'

export type EffectsLevel = 'full' | 'subtle' | 'off'
export type SoundLevel = 'off' | 'low' | 'med' | 'high'
export type SoundCharacter = 'soft' | 'thock' | 'wood' | 'pebble'

export const EFFECTS_LEVELS: readonly EffectsLevel[] = ['full', 'subtle', 'off']
export const SOUND_LEVELS: readonly SoundLevel[] = ['off', 'low', 'med', 'high']
export const SOUND_CHARACTERS: readonly SoundCharacter[] = ['soft', 'thock', 'wood', 'pebble']

// Returns `value` if it is one of `list`, else `fallback` (for values read from storage).
export function pick<T extends string>(list: readonly T[], value: string | null, fallback: T): T {
  return value !== null && (list as readonly string[]).includes(value) ? (value as T) : fallback
}

export function nextInCycle<T>(list: readonly T[], current: T): T {
  return list[(list.indexOf(current) + 1) % list.length]
}

// A saved choice wins; otherwise follow the OS reduced-motion setting.
export function resolveEffects(saved: string | null, prefersReducedMotion: boolean): EffectsLevel {
  if (saved && (EFFECTS_LEVELS as readonly string[]).includes(saved)) return saved as EffectsLevel
  return prefersReducedMotion ? 'subtle' : 'full'
}

// Major pentatonic steps (semitones). Any sequence of these notes sounds consonant, with each
// other and with the zen ambient pad (same key), so a long combo becomes a gentle melody.
export const PENTATONIC = [0, 2, 4, 7, 9] as const

// Pitch of the word-complete sound: one pentatonic step up per combo step, over two octaves, then wraps.
export function comboFrequency(combo: number, baseHz: number = FEEL.sound.comboBaseHz): number {
  const step = (Math.max(1, Math.floor(combo)) - 1) % (PENTATONIC.length * 2)
  const semitones = PENTATONIC[step % PENTATONIC.length] + 12 * Math.floor(step / PENTATONIC.length)
  return baseHz * 2 ** (semitones / 12)
}

// 1 for relaxed typing, down to minIntensity for very fast bursts.
export function cadenceIntensity(msSinceLastKey: number): number {
  const { fullAtMs, minAtMs, minIntensity } = FEEL.cadence
  if (!(msSinceLastKey < fullAtMs)) return 1
  if (msSinceLastKey <= minAtMs) return minIntensity
  return minIntensity + ((msSinceLastKey - minAtMs) / (fullAtMs - minAtMs)) * (1 - minIntensity)
}

export function isMilestone(combo: number): boolean {
  return combo > 0 && combo % FEEL.milestoneEvery === 0
}

export function jitter(value: number, amount: number, random: () => number = Math.random): number {
  return value * (1 + (random() * 2 - 1) * amount)
}

// Next heartbeat time: the first beat lands when danger starts, then every beatMs, on a fixed
// phase so re-scheduling (e.g. after a keystroke) never skips or doubles a beat.
export function nextBeatAt(now: number, dangerAt: number, beatMs: number = FEEL.danger.beatMs): number {
  if (now <= dangerAt) return dangerAt
  return dangerAt + Math.ceil((now - dangerAt + 1) / beatMs) * beatMs
}

// Allows an event at most once per gapMs.
export class EffectBudget {
  private last = -Infinity
  private readonly gapMs: number
  constructor(gapMs: number) {
    this.gapMs = gapMs
  }
  allow(now: number): boolean {
    if (now - this.last < this.gapMs) return false
    this.last = now
    return true
  }
}

// Caps simultaneous sounds: finished voices are dropped, and the oldest is stopped when full.
export interface Voice {
  end: number
  stop: () => void
}
export class VoicePool {
  private voices: Voice[] = []
  private readonly max: number
  constructor(max: number) {
    this.max = max
  }
  admit(voice: Voice, now: number): void {
    this.voices = this.voices.filter((v) => v.end > now)
    while (this.voices.length >= this.max) this.voices.shift()!.stop()
    this.voices.push(voice)
  }
  get size(): number {
    return this.voices.length
  }
}

// Trips once after `consecutive` slow frames in a row (after a grace period).
export class SlowFrameDetector {
  private streak = 0
  private elapsed = 0
  private tripped = false
  private readonly cfg: { slowFrameMs: number; consecutive: number; graceMs: number }
  constructor(cfg: { slowFrameMs: number; consecutive: number; graceMs: number } = FEEL.perfGuard) {
    this.cfg = cfg
  }
  feed(frameMs: number): boolean {
    this.elapsed += frameMs
    if (this.tripped) return true
    if (this.elapsed < this.cfg.graceMs) return false
    this.streak = frameMs > this.cfg.slowFrameMs ? this.streak + 1 : 0
    if (this.streak >= this.cfg.consecutive) this.tripped = true
    return this.tripped
  }
}

// Typing rhythm (add-on A5): how even the gaps between recent keystrokes are.
// 1 = metronome-steady, 0 = erratic or idle. Pauses longer than resetMs start a new phrase,
// so stopping to think is never "bad rhythm"; the reading fades out after the player stops.
export class RhythmTracker {
  private gaps: number[] = []
  private last = -Infinity
  private readonly cfg: typeof FEEL.rhythm
  constructor(cfg: typeof FEEL.rhythm = FEEL.rhythm) {
    this.cfg = cfg
  }
  key(t: number): void {
    const gap = t - this.last
    this.last = t
    if (gap > this.cfg.resetMs) {
      this.gaps = []
      return
    }
    this.gaps.push(gap)
    if (this.gaps.length > this.cfg.window) this.gaps.shift()
  }
  steadiness(t: number): number {
    if (this.gaps.length < this.cfg.minGaps) return 0
    const mean = this.gaps.reduce((a, b) => a + b, 0) / this.gaps.length
    const spread = Math.sqrt(this.gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / this.gaps.length)
    const even = Math.min(1, Math.max(0, 1 - spread / mean / this.cfg.looseCv))
    const idle = t - this.last
    const fade = Math.min(1, Math.max(0, 1 - (idle - this.cfg.holdMs) / this.cfg.fadeMs))
    return even * fade
  }
  reset(): void {
    this.gaps = []
    this.last = -Infinity
  }
}
