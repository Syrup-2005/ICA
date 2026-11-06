import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createInitialState, gameReducer, nextDeadline } from './game/engine'
import { useInterval } from './hooks/useInterval'
import { useAnimationFrame } from './hooks/useAnimationFrame'
import { now } from './clock'
import { sound } from './feel/audio'
import { useFeel, type FeelRefs } from './feel/useFeel'
import {
  EFFECTS_LEVELS,
  SOUND_LEVELS,
  SlowFrameDetector,
  nextInCycle,
  resolveEffects,
  type EffectsLevel,
  type SoundLevel,
} from './feel/rules'
import { BEST_COMBO_KEY, EFFECTS_KEY, SOUND_LEVEL_KEY, readNumber, readSoundLevel, readString, writeValue } from './storage'
import { ReadyScreen } from './components/ReadyScreen'
import { PlayScreen } from './components/PlayScreen'
import { PauseScreen } from './components/PauseScreen'
import { GameOverScreen } from './components/GameOverScreen'

// The clock only needs to tick when something happens on its own (nextDeadline);
// this slow safety tick just re-syncs in case a timer was throttled.
const SAFETY_TICK_MS = 1000
const IGNORED_KEYS = new Set(['Tab', 'Alt', 'Control', 'Meta'])

const randomSeed = () => Math.floor(Math.random() * 2 ** 32)
const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState(readNumber(BEST_COMBO_KEY), randomSeed()),
  )
  const [soundLevel, setSoundLevel] = useState<SoundLevel>(readSoundLevel)
  const [effectsChoice, setEffectsChoice] = useState<EffectsLevel>(() =>
    resolveEffects(readString(EFFECTS_KEY), prefersReducedMotion()),
  )
  // Set by the performance guard: drops FULL to SUBTLE for this session on a struggling device.
  const [effectsOverride, setEffectsOverride] = useState<EffectsLevel | null>(null)
  const effects = effectsOverride ?? effectsChoice

  const inputRef = useRef<HTMLInputElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const comboRef = useRef<HTMLElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const feelRefs = useMemo<FeelRefs>(() => ({ stage: stageRef, combo: comboRef, glow: glowRef }), [])
  const { screen, bestCombo, lastTickAt } = state

  const start = useCallback(() => {
    sound.unlock() // inside the user's key press or click, so audio may start
    dispatch({ type: 'start', now: now(), seed: randomSeed() })
  }, [])
  const pause = useCallback(() => dispatch({ type: 'pause', now: now() }), [])
  const resume = useCallback(() => dispatch({ type: 'resume', now: now() }), [])
  const restart = useCallback(() => dispatch({ type: 'restart' }), [])
  const tick = useCallback(() => dispatch({ type: 'tick', now: now() }), [])

  // One timer for the next moment the state changes on its own (survival out, combo window closed).
  const deadline = nextDeadline(state)
  useEffect(() => {
    if (deadline === null || lastTickAt === null) return
    const id = window.setTimeout(tick, Math.max(0, Math.ceil(lastTickAt + deadline - now())))
    return () => window.clearTimeout(id)
  }, [deadline, lastTickAt, tick])
  useInterval(tick, screen === 'playing' ? SAFETY_TICK_MS : null)

  // Feedback: sound, motion, haptics (src/feel).
  useFeel(state, effects, soundLevel !== 'off', feelRefs)
  useEffect(() => sound.setLevel(soundLevel), [soundLevel])

  // Performance guard: if FULL effects make frames slow, fall back to SUBTLE for the session.
  const frameDetector = useRef<SlowFrameDetector | null>(null)
  useAnimationFrame((frameMs) => {
    frameDetector.current ??= new SlowFrameDetector()
    if (frameDetector.current.feed(frameMs)) setEffectsOverride('subtle')
  }, screen === 'playing' && effects === 'full')

  useEffect(() => writeValue(BEST_COMBO_KEY, bestCombo), [bestCombo])

  const cycleSound = () => {
    const next = nextInCycle(SOUND_LEVELS, soundLevel)
    setSoundLevel(next)
    writeValue(SOUND_LEVEL_KEY, next)
    sound.setLevel(next)
    sound.thock(1) // let the player hear the new level (silent when off)
  }
  const cycleEffects = () => {
    const next = nextInCycle(EFFECTS_LEVELS, effects)
    setEffectsChoice(next)
    setEffectsOverride(null) // an explicit choice wins over the performance guard
    writeValue(EFFECTS_KEY, next)
  }

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
    <main
      className="app-shell"
      data-effects={effects}
      onMouseDown={() => screen === 'playing' && inputRef.current?.focus()}
    >
      <header className="topbar">
        <button className="wordmark" onClick={restart} aria-label="ICA home">ICA<span>.</span></button>
        <div className="topbar-actions">
          <button className="quiet-button" onClick={cycleSound} aria-label={`Sound: ${soundLevel}. Change sound level`}>
            SOUND {soundLevel.toUpperCase()}
          </button>
          <button
            className="quiet-button"
            onClick={cycleEffects}
            aria-label={`Visual effects: ${effects}. Change visual effects`}
            title="Visual effects"
          >
            FX {effects.toUpperCase()}
          </button>
          {screen === 'playing' && <button className="quiet-button" onClick={pause}>PAUSE</button>}
        </div>
      </header>

      {screen === 'ready' && <ReadyScreen onStart={start} />}
      {screen === 'playing' && (
        <PlayScreen
          state={state}
          inputRef={inputRef}
          feelRefs={feelRefs}
          pulse={effects !== 'off'}
          onInput={(value) => dispatch({ type: 'input', value, now: now() })}
        />
      )}
      {screen === 'paused' && (
        <PauseScreen wordsCompleted={state.wordsCompleted} combo={state.combo} onResume={resume} onRestart={restart} />
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
