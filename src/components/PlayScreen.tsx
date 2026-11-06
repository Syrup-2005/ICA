import { useLayoutEffect, useRef, type RefObject } from 'react'
import { COMBO_WINDOW, MAX_HEALTH, getAccuracy, type GameState } from '../game/engine'
import { getDifficulty } from '../game/words'
import { now } from '../clock'
import { FEEL } from '../feel/config'
import type { FeelRefs } from '../feel/useFeel'
import { Stat } from './Stat'

interface PlayScreenProps {
  state: GameState
  inputRef: RefObject<HTMLInputElement | null>
  feelRefs: FeelRefs
  pulse: boolean // danger pulse on the meter (off when visual effects are off)
  onInput: (value: string) => void
}

// The COMBO number fades as its 3 s window closes (never below AA contrast).
const COMBO_MIN_OPACITY = 0.55
// Update rate for time-driven readouts (same 20 Hz as v0.2, without the React re-render).
const DISPLAY_TICK_MS = 50

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function setText(el: HTMLElement | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text
}

export function PlayScreen({ state, inputRef, feelRefs, pulse, onInput }: PlayScreenProps) {
  const { word, typed, combo, bestCombo, wordsCompleted, feedback, feedbackId, wrongLetter, lastWord } = state
  const timeRef = useRef<HTMLElement>(null)
  const survivalRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)

  // Time-driven readouts (meter, SURVIVAL, TIME, combo fade, danger) are written straight to the
  // DOM by one light 20 Hz display tick, so React re-renders only on real events.
  // Measured choices (docs/IMPROVEMENT-PLAN.md §6.1–6.2):
  //   - not a per-frame loop: 60 writes/s made every frame heavier;
  //   - not continuous compositor animations: while they run, Chrome favours them over the main
  //     thread and keystroke updates land a frame later (+~25 ms at 4x CPU).
  // The tick is keyed on *when things end* (survival, combo), not on the latest tick: a correct
  // keystroke doesn't change when survival runs out, so ordinary typing doesn't restart it.
  const { lastTickAt, health: healthAtTick, comboTimer, combo: comboCount, elapsed } = state
  const survivalEndsAt = lastTickAt === null ? null : Math.round(lastTickAt + healthAtTick)
  const comboEndsAt = lastTickAt === null || comboCount === 0 ? null : Math.round(lastTickAt + comboTimer)
  const runStartedAt = lastTickAt === null ? null : Math.round(lastTickAt - elapsed)

  useLayoutEffect(() => {
    if (survivalEndsAt === null || runStartedAt === null) return
    let id = 0
    const draw = () => {
      const t = now()
      const health = Math.max(0, survivalEndsAt - t)
      const comboLeft = comboEndsAt === null ? 0 : Math.max(0, comboEndsAt - t)
      const danger = health > 0 && health < FEEL.danger.thresholdMs
      const fill = fillRef.current
      if (fill) {
        fill.style.transform = `scaleX(${health / MAX_HEALTH})`
        // Danger pulse: a slow, low-contrast breathe (one cycle per heartbeat, < 2 per second).
        fill.style.opacity = danger && pulse ? String(0.725 + 0.275 * Math.cos((2 * Math.PI * t) / FEEL.danger.beatMs)) : '1'
      }
      if (feelRefs.combo.current) {
        feelRefs.combo.current.style.opacity = String(COMBO_MIN_OPACITY + (1 - COMBO_MIN_OPACITY) * (comboLeft / COMBO_WINDOW))
      }
      trackRef.current?.classList.toggle('danger', danger)
      setText(survivalRef.current, `${(health / 1000).toFixed(1)}s`)
      setText(timeRef.current, formatTime(t - runStartedAt))
      if (health > 0) id = window.setTimeout(draw, DISPLAY_TICK_MS)
    }
    draw()
    return () => window.clearTimeout(id)
  }, [survivalEndsAt, comboEndsAt, runStartedAt, feelRefs, pulse])

  const remaining = word.slice(typed.length)

  return (
    <>
      <section className="stats-row" aria-label="Game statistics">
        <Stat label="COMBO" value={`${combo}x`} valueRef={feelRefs.combo} />
        <Stat label="BEST" value={`${bestCombo}x`} />
        <Stat label="WORDS" value={String(wordsCompleted)} />
        <Stat label="TIME" valueRef={timeRef} />
      </section>
      <section className="center-stage game-stage">
        <p className="eyebrow">LEVEL {getDifficulty(wordsCompleted)} <span className="dot">·</span> ENDLESS</p>
        <div className="word-display" aria-hidden="true" ref={feelRefs.stage}>
          {feedback === 'complete' && lastWord && (
            <span key={`out-${wordsCompleted}`} className="word-out">{lastWord}</span>
          )}
          <span key={`word-${wordsCompleted}`} className="word-current">
            <span className="typed-text">{typed.slice(0, -1)}</span>
            {typed && <span key={`press-${typed.length}`} className="typed-text press">{typed.slice(-1)}</span>}
            <span className="remaining-text slot">
              {remaining.slice(0, 1)}
              {feedback === 'wrong' && wrongLetter && (
                <span key={`ghost-${feedbackId}`} className="ghost">{wrongLetter}</span>
              )}
            </span>
            <span className="remaining-text">{remaining.slice(1)}</span>
          </span>
        </div>
        <p className="typing-hint">TYPE THE WORD</p>
        <input
          ref={inputRef}
          className="typing-input"
          value={typed}
          onChange={(event) => onInput(event.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label={`Type the word ${word}`}
          autoFocus
        />
      </section>
      <footer className="game-footer">
        <div className="survival-track" aria-label="Survival meter" ref={trackRef}>
          <div className="survival-track-fill" ref={fillRef} />
          <div className="survival-glow" ref={feelRefs.glow} />
        </div>
        <div className="footer-details">
          <span>ACCURACY <strong>{getAccuracy(state)}%</strong></span>
          <span>SURVIVAL <strong ref={survivalRef} /></span>
          <span>ESC <strong>PAUSE</strong></span>
        </div>
      </footer>
    </>
  )
}
