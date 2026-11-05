import type { RefObject } from 'react'
import { MAX_HEALTH, getAccuracy, type GameState } from '../game/engine'
import { getDifficulty } from '../game/words'
import { Stat } from './Stat'

interface PlayScreenProps {
  state: GameState
  shaking: boolean
  inputRef: RefObject<HTMLInputElement | null>
  onInput: (value: string) => void
}

export function PlayScreen({ state, shaking, inputRef, onInput }: PlayScreenProps) {
  const { word, typed, combo, bestCombo, wordsCompleted, health } = state
  const seconds = Math.floor(state.elapsed / 1000)
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <>
      <section className="stats-row" aria-label="Game statistics">
        <Stat label="COMBO" value={`${combo}x`} />
        <Stat label="BEST" value={`${bestCombo}x`} />
        <Stat label="WORDS" value={String(wordsCompleted)} />
        <Stat label="TIME" value={time} />
      </section>
      <section className={`center-stage game-stage ${shaking ? 'shake' : ''}`}>
        <p className="eyebrow">LEVEL {getDifficulty(wordsCompleted)} <span className="dot">·</span> ENDLESS</p>
        <div className="word-display" aria-hidden="true">
          <span className="typed-text">{word.slice(0, typed.length)}</span><span className="remaining-text">{word.slice(typed.length)}</span>
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
        <div className="survival-track" aria-label="Survival meter">
          <div className="survival-track-fill" style={{ width: `${(health / MAX_HEALTH) * 100}%` }} />
        </div>
        <div className="footer-details">
          <span>ACCURACY <strong>{getAccuracy(state)}%</strong></span>
          <span>SURVIVAL <strong>{(health / 1000).toFixed(1)}s</strong></span>
          <span>ESC <strong>PAUSE</strong></span>
        </div>
      </footer>
    </>
  )
}
