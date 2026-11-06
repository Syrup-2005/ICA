import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { createInitialState, gameReducer } from './game/engine'
import { useInterval } from './hooks/useInterval'
import { useSound } from './hooks/useSound'
import { now } from './clock'
import { BEST_COMBO_KEY, SOUND_KEY, readBoolean, readNumber, writeValue } from './storage'
import { ReadyScreen } from './components/ReadyScreen'
import { PlayScreen } from './components/PlayScreen'
import { PauseScreen } from './components/PauseScreen'
import { GameOverScreen } from './components/GameOverScreen'

const TICK_MS = 50
const SHAKE_MS = 180
const IGNORED_KEYS = new Set(['Tab', 'Alt', 'Control', 'Meta'])

const randomSeed = () => Math.floor(Math.random() * 2 ** 32)

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState(readNumber(BEST_COMBO_KEY), randomSeed()),
  )
  const [soundEnabled, setSoundEnabled] = useState(() => readBoolean(SOUND_KEY))
  const [shaking, setShaking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const playSound = useSound(soundEnabled)
  const { screen, feedback, feedbackId, combo, bestCombo } = state

  const start = useCallback(() => dispatch({ type: 'start', now: now(), seed: randomSeed() }), [])
  const pause = useCallback(() => dispatch({ type: 'pause', now: now() }), [])
  const resume = useCallback(() => dispatch({ type: 'resume', now: now() }), [])
  const restart = useCallback(() => dispatch({ type: 'restart' }), [])
  const tick = useCallback(() => dispatch({ type: 'tick', now: now() }), [])

  useInterval(tick, screen === 'playing' ? TICK_MS : null)

  // Persist preferences.
  useEffect(() => writeValue(BEST_COMBO_KEY, bestCombo), [bestCombo])
  useEffect(() => writeValue(SOUND_KEY, soundEnabled), [soundEnabled])

  // Sound + shake react to each new feedback event (feedbackId changes once per event).
  useEffect(() => {
    if (feedbackId > 0) playSound(feedback, combo)
  }, [feedbackId]) // intentionally keyed only on the event id: one sound per event

  useEffect(() => {
    if (feedback !== 'wrong') return
    setShaking(true)
    const id = window.setTimeout(() => setShaking(false), SHAKE_MS)
    return () => {
      window.clearTimeout(id)
      setShaking(false)
    }
  }, [feedbackId, feedback])

  // Keep the hidden input focused whenever play begins or resumes.
  useEffect(() => {
    if (screen === 'playing') inputRef.current?.focus()
  }, [screen])

  // Auto-pause when the player looks away (tab hidden or window loses focus).
  // Never auto-resume: the player decides when to continue.
  useEffect(() => {
    if (screen !== 'playing') return
    const handleVisibility = () => {
      if (document.hidden) pause()
    }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [screen, pause])

  // Keyboard: any key starts from the ready screen; Esc pauses during play;
  // Esc (or Enter, unless a button has focus) resumes from the pause screen.
  useEffect(() => {
    if (screen === 'gameover') return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (IGNORED_KEYS.has(event.key)) return
      if (screen === 'ready') {
        // Stop Enter/Space from also clicking a focused button (e.g. the wordmark → restart).
        event.preventDefault()
        return start()
      }
      if (screen === 'paused') {
        const onButton = event.target instanceof HTMLButtonElement
        if (event.key === 'Escape' || (event.key === 'Enter' && !onButton)) {
          event.preventDefault()
          resume()
        }
        return
      }
      if (event.key === 'Escape') return pause()
      if (event.key.length === 1) inputRef.current?.focus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [screen, start, pause, resume])

  return (
    <main className="app-shell" onMouseDown={() => screen === 'playing' && inputRef.current?.focus()}>
      <header className="topbar">
        <button className="wordmark" onClick={restart} aria-label="ICA home">ICA<span>.</span></button>
        <div className="topbar-actions">
          <button className="quiet-button" onClick={() => setSoundEnabled((on) => !on)} aria-pressed={soundEnabled}>
            SOUND {soundEnabled ? 'ON' : 'OFF'}
          </button>
          {screen === 'playing' && <button className="quiet-button" onClick={pause}>PAUSE</button>}
        </div>
      </header>

      {screen === 'ready' && <ReadyScreen onStart={start} />}
      {screen === 'playing' && (
        <PlayScreen
          state={state}
          shaking={shaking}
          inputRef={inputRef}
          onInput={(value) => dispatch({ type: 'input', value, now: now() })}
        />
      )}
      {screen === 'paused' && (
        <PauseScreen wordsCompleted={state.wordsCompleted} combo={combo} onResume={resume} onRestart={restart} />
      )}
      {screen === 'gameover' && <GameOverScreen wordsCompleted={state.wordsCompleted} onPlayAgain={restart} />}

      <footer className="site-footer">
        <span>ICA <span className="dot">·</span> TYPE AT YOUR OWN PACE</span>
        <span>V {__APP_VERSION__}</span>
      </footer>
    </main>
  )
}

export default App
