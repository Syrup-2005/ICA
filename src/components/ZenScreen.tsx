import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { GameState } from '../game/engine'
import { now } from '../clock'
import { RhythmTracker } from '../feel/rules'
import type { FeelRefs } from '../feel/useFeel'
import { WordDisplay } from './WordDisplay'

interface ZenScreenProps {
  state: GameState
  inputRef: RefObject<HTMLInputElement | null>
  feelRefs: FeelRefs
  onInput: (value: string) => void
}

// Same 20 Hz display tick as the arcade meter: no React re-render, no running CSS animations.
const DISPLAY_TICK_MS = 50
// How quickly the line follows the reading (per tick), so it glides rather than jumps.
const EASE = 0.18

function rhythmWord(steadiness: number): string {
  if (steadiness > 0.75) return 'steady'
  if (steadiness > 0.4) return 'settling'
  if (steadiness > 0.05) return 'finding'
  return '—'
}

function setText(el: HTMLElement | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text
}

// Zen: no timer, no failure, no live score. Only the word, a few quiet numbers, and a thin line
// that widens as your typing settles into an even rhythm (add-on A5).
export function ZenScreen({ state, inputRef, feelRefs, onInput }: ZenScreenProps) {
  const { word, typed, wordsCompleted, combo, feedback, feedbackId } = state
  const tracker = useRef(new RhythmTracker())
  const lineRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLElement>(null)

  // Every accepted letter is a beat; mistakes are not counted either way.
  useLayoutEffect(() => {
    if (feedback === 'correct' || feedback === 'complete') tracker.current.key(now())
  }, [feedbackId, feedback])

  useLayoutEffect(() => {
    let id = 0
    let shown = 0
    const draw = () => {
      const target = tracker.current.steadiness(now())
      shown += (target - shown) * EASE
      if (Math.abs(target - shown) < 0.002) shown = target
      const line = lineRef.current
      if (line) {
        line.style.transform = `scaleX(${shown.toFixed(3)})`
        line.style.opacity = (0.35 + 0.65 * shown).toFixed(3)
      }
      setText(labelRef.current, rhythmWord(shown))
      id = window.setTimeout(draw, DISPLAY_TICK_MS)
    }
    draw()
    return () => window.clearTimeout(id)
  }, [])

  return (
    <>
      <section className="center-stage game-stage zen-stage">
        <p className="eyebrow">ZEN <span className="dot">·</span> NO TIMER</p>
        <WordDisplay state={state} stageRef={feelRefs.stage} />
        <p className="typing-hint">TYPE AT YOUR OWN PACE</p>
        <input
          ref={inputRef}
          className="typing-input"
          value={typed}
          onChange={(event) => onInput(event.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={`Type the word ${word}`}
          autoFocus
        />
      </section>
      <footer className="game-footer">
        <div className="rhythm-track" aria-hidden="true">
          <div className="rhythm-line" ref={lineRef} />
        </div>
        <div className="footer-details">
          <span>WORDS <strong>{wordsCompleted}</strong></span>
          <span>RHYTHM <strong ref={labelRef} /></span>
          <span>STREAK <strong ref={feelRefs.combo}>{combo}</strong></span>
        </div>
      </footer>
    </>
  )
}
