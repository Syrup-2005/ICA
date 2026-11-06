// Pure helpers for the feel layer (no DOM, no audio): unit-tested in rules.test.ts.
import { FEEL } from './config'

export type EffectsLevel = 'full' | 'subtle' | 'off'
export type SoundLevel = 'off' | 'low' | 'med' | 'high'

export const EFFECTS_LEVELS: readonly EffectsLevel[] = ['full', 'subtle', 'off']
export const SOUND_LEVELS: readonly SoundLevel[] = ['off', 'low', 'med', 'high']

export function nextInCycle<T>(list: readonly T[], current: T): T {
  return list[(list.indexOf(current) + 1) % list.length]
}

// A saved choice wins; otherwise follow the OS reduced-motion setting.
export function resolveEffects(saved: string | null, prefersReducedMotion: boolean): EffectsLevel {
  if (saved && (EFFECTS_LEVELS as readonly string[]).includes(saved)) return saved as EffectsLevel
  return prefersReducedMotion ? 'subtle' : 'full'
}

// Pitch of the word-complete sound: one semitone up per combo step, wrapping each octave.
export function comboFrequency(combo: number, baseHz: number = FEEL.sound.comboBaseHz): number {
  const step = (Math.max(1, Math.floor(combo)) - 1) % 12
  return baseHz * 2 ** (step / 12)
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
