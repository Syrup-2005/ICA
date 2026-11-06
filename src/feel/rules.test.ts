import { describe, expect, it, vi } from 'vitest'
import { FEEL } from './config'
import {
  EFFECTS_LEVELS,
  EffectBudget,
  SOUND_LEVELS,
  SlowFrameDetector,
  VoicePool,
  cadenceIntensity,
  comboFrequency,
  isMilestone,
  jitter,
  nextBeatAt,
  nextInCycle,
  resolveEffects,
} from './rules'

describe('settings', () => {
  it('cycles through levels and wraps', () => {
    expect(nextInCycle(EFFECTS_LEVELS, 'full')).toBe('subtle')
    expect(nextInCycle(EFFECTS_LEVELS, 'off')).toBe('full')
    expect(nextInCycle(SOUND_LEVELS, 'high')).toBe('off')
  })

  it('uses a saved effects choice, else follows reduced motion', () => {
    expect(resolveEffects('off', false)).toBe('off')
    expect(resolveEffects(null, true)).toBe('subtle')
    expect(resolveEffects(null, false)).toBe('full')
    expect(resolveEffects('nonsense', true)).toBe('subtle')
  })
})

describe('sound shaping', () => {
  it('rises one semitone per combo step and wraps each octave', () => {
    const base = FEEL.sound.comboBaseHz
    expect(comboFrequency(1)).toBeCloseTo(base)
    expect(comboFrequency(2)).toBeCloseTo(base * 2 ** (1 / 12))
    expect(comboFrequency(12)).toBeCloseTo(base * 2 ** (11 / 12))
    expect(comboFrequency(13)).toBeCloseTo(base)
    expect(comboFrequency(0)).toBeCloseTo(base)
  })

  it('softens per-key intensity as typing speeds up, within bounds', () => {
    expect(cadenceIntensity(Infinity)).toBe(1)
    expect(cadenceIntensity(FEEL.cadence.fullAtMs)).toBe(1)
    expect(cadenceIntensity(10)).toBe(FEEL.cadence.minIntensity)
    const mid = cadenceIntensity((FEEL.cadence.fullAtMs + FEEL.cadence.minAtMs) / 2)
    expect(mid).toBeGreaterThan(FEEL.cadence.minIntensity)
    expect(mid).toBeLessThan(1)
  })

  it('jitters within ±amount', () => {
    expect(jitter(100, 0.1, () => 0)).toBeCloseTo(90)
    expect(jitter(100, 0.1, () => 1)).toBeCloseTo(110)
    expect(jitter(100, 0.1, () => 0.5)).toBeCloseTo(100)
  })

  it('marks every 10th combo as a milestone', () => {
    expect([0, 9, 10, 11, 20].map(isMilestone)).toEqual([false, false, true, false, true])
  })
})

describe('heartbeat timing', () => {
  const beat = FEEL.danger.beatMs
  it('first beat when danger starts, then on a fixed phase', () => {
    expect(nextBeatAt(500, 1000)).toBe(1000)
    expect(nextBeatAt(1000.5, 1000)).toBe(1000 + beat)
    expect(nextBeatAt(1000 + beat - 0.4, 1000)).toBe(1000 + 2 * beat) // early timer: no double beat
    expect(nextBeatAt(1000 + beat + 100, 1000)).toBe(1000 + 2 * beat)
  })
})

describe('EffectBudget', () => {
  it('allows at most one event per gap', () => {
    const budget = new EffectBudget(1000)
    expect(budget.allow(0)).toBe(true)
    expect(budget.allow(500)).toBe(false)
    expect(budget.allow(1000)).toBe(true)
  })
})

describe('VoicePool', () => {
  it('caps simultaneous voices by stopping the oldest', () => {
    const pool = new VoicePool(2)
    const stops = [vi.fn(), vi.fn(), vi.fn()]
    stops.forEach((stop, i) => pool.admit({ end: 100, stop }, i))
    expect(pool.size).toBe(2)
    expect(stops[0]).toHaveBeenCalledOnce()
    expect(stops[1]).not.toHaveBeenCalled()
  })

  it('drops finished voices without stopping them', () => {
    const pool = new VoicePool(2)
    const old = vi.fn()
    pool.admit({ end: 10, stop: old }, 0)
    pool.admit({ end: 100, stop: vi.fn() }, 20)
    pool.admit({ end: 100, stop: vi.fn() }, 20)
    expect(old).not.toHaveBeenCalled()
    expect(pool.size).toBe(2)
  })
})

describe('SlowFrameDetector', () => {
  const cfg = { slowFrameMs: 32, consecutive: 3, graceMs: 100 }
  it('ignores slow frames during the grace period', () => {
    const d = new SlowFrameDetector(cfg)
    expect([50, 40].map((f) => d.feed(f))).toEqual([false, false])
  })
  it('trips after consecutive slow frames, not on isolated ones', () => {
    const d = new SlowFrameDetector(cfg)
    d.feed(100) // grace used up
    expect([40, 16, 40, 40].map((f) => d.feed(f))).toEqual([false, false, false, false])
    expect(d.feed(40)).toBe(true)
    expect(d.feed(16)).toBe(true) // stays tripped
  })
})

describe('per-key motion threshold', () => {
  it('allows per-key motion only below ~105 WPM bursts (≥ ~115 ms between keys)', () => {
    expect(cadenceIntensity(110)).toBeLessThan(FEEL.cadence.motionFrom)
    expect(cadenceIntensity(120)).toBeGreaterThanOrEqual(FEEL.cadence.motionFrom)
  })
})
