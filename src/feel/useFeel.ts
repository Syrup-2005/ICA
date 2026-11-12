import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import type { GameState } from '../game/engine'
import { now } from '../clock'
import { FEEL } from './config'
import { sound } from './audio'
import { vibrate } from './haptics'
import { EffectBudget, cadenceIntensity, isMilestone, nextBeatAt, type EffectsLevel } from './rules'

// Elements that feedback animates. Owned by App so they survive pause/resume without
// replaying effects; attached by PlayScreen.
export interface FeelRefs {
  stage: RefObject<HTMLDivElement | null> // the word display (the only area that moves)
  combo: RefObject<HTMLElement | null> // the COMBO value
  glow: RefObject<HTMLDivElement | null> // overlay on the survival meter
}

const EASE = 'cubic-bezier(.2,.8,.2,1)'

// Web Animations on top/left/colour of small positioned elements (main thread), no React re-render.
// Deliberately not transform/opacity: measured in Chrome, running compositor animations delay
// keystroke updates by about a frame under load (docs/IMPROVEMENT-PLAN.md §6.1–6.2).
function animate(el: Element | null | undefined, keyframes: Keyframe[], duration: number): void {
  if (el && typeof el.animate === 'function') el.animate(keyframes, { duration, easing: EASE })
}
const nudge = (px: number): Keyframe[] => [{ top: '0px' }, { top: `${px}px` }, { top: '0px' }]
const shake = (px: number): Keyframe[] => [{ left: '0px' }, { left: `${-px}px` }, { left: `${px}px` }, { left: '0px' }]
function glow(el: Element | null, strength: number): void {
  const { glowHoldMs, glowFadeMs } = FEEL.timing
  const total = glowHoldMs + glowFadeMs
  const lit = `rgba(255, 255, 255, ${strength})`
  animate(el, [
    { backgroundColor: 'rgba(255, 255, 255, 0)' },
    { backgroundColor: lit, offset: 0.05 },
    { backgroundColor: lit, offset: glowHoldMs / total },
    { backgroundColor: 'rgba(255, 255, 255, 0)' },
  ], total)
}

// The feedback ladder (guide §9 · Phase 2A):
//   tier 1  correct key / wrong key   → thock or thud, letter press + 1 px dip (relaxed typing only)
//                                       or 3 px shake, light haptic
//   tier 2  word complete / combo     → chunk (pitch rises with combo), meter glow + hold, combo pop
//   tier 3  milestone (every 10)      → chime, 3 px kick, stronger glow; at most once per second
//   danger  survival < 1.5 s          → heartbeat (here) + meter pulse (PlayScreen)
// FULL = everything; SUBTLE = no movement (colour cues stay); OFF = no visual effects or haptics.
// During fast bursts per-key motion steps aside (sound carries the feel), so it never costs a frame.
// Zen is gentler: a wrong key is a soft muted tap and the ghost letter, never a shake; no heartbeat.
export function useFeel(state: GameState, effects: EffectsLevel, soundOn: boolean, refs: FeelRefs): void {
  const budget = useRef(new EffectBudget(FEEL.budget.tier3GapMs))
  const lastKeyAt = useRef(-Infinity)
  const { feedback, feedbackId, combo, comboBreakId, screen, lastTickAt, health, mode } = state
  const zen = mode === 'zen'

  // Layout effect: runs before paint, so sound and motion land on the same frame as the letter.
  useLayoutEffect(() => {
    if (feedbackId === 0) return
    const motion = effects === 'full'
    const visual = effects !== 'off'
    const t = now()
    if (feedback === 'correct') {
      const intensity = cadenceIntensity(t - lastKeyAt.current)
      lastKeyAt.current = t
      sound.thock(intensity)
      if (motion && intensity >= FEEL.cadence.motionFrom) {
        const stage = refs.stage.current
        animate(stage?.querySelector('.press'), [{ top: `${FEEL.motion.pressPx}px` }, { top: '0px' }], FEEL.timing.dipMs)
        animate(stage, nudge(FEEL.motion.dipPx), FEEL.timing.dipMs)
      }
      if (visual) vibrate(FEEL.haptics.correct)
    } else if (feedback === 'wrong') {
      sound.thud(zen)
      if (motion && !zen) animate(refs.stage.current, shake(FEEL.motion.shakePx), FEEL.timing.shakeMs)
      if (visual) vibrate(FEEL.haptics.wrong)
    } else if (feedback === 'complete') {
      lastKeyAt.current = t
      const milestone = isMilestone(combo) && budget.current.allow(t)
      sound.chunk(combo)
      if (milestone) sound.chime()
      if (visual) {
        glow(refs.glow.current, milestone ? 0.9 : 0.55)
        vibrate(milestone ? FEEL.haptics.milestone : FEEL.haptics.complete)
      }
      if (motion) {
        animate(refs.combo.current, [{ top: `${-FEEL.motion.liftPx}px` }, { top: '0px' }], FEEL.timing.popMs)
        if (milestone) animate(refs.stage.current, nudge(FEEL.motion.kickPx), FEEL.timing.kickMs)
      }
    }
  }, [feedbackId]) // one response per feedback event

  useLayoutEffect(() => {
    if (comboBreakId === 0) return
    sound.crack()
    if (effects === 'off') return
    const from = effects === 'full' ? { top: '2px', color: '#5a5a5a' } : { color: '#5a5a5a' }
    const to = effects === 'full' ? { top: '0px', color: '#e8e8e8' } : { color: '#e8e8e8' }
    animate(refs.combo.current, [from, to], FEEL.timing.breakMs)
  }, [comboBreakId]) // one response per break

  // Heartbeat while survival is below the danger threshold, on a fixed phase.
  useEffect(() => {
    if (!soundOn || zen || screen !== 'playing' || lastTickAt === null) return
    const dangerAt = lastTickAt + health - FEEL.danger.thresholdMs
    let id = 0
    const schedule = () => {
      const t = now()
      id = window.setTimeout(() => {
        sound.heartbeat()
        schedule()
      }, Math.max(0, nextBeatAt(t, dangerAt) - t))
    }
    schedule()
    return () => window.clearTimeout(id)
  }, [soundOn, zen, screen, lastTickAt, health])
}
