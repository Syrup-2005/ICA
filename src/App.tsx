import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createInitialState, gameReducer, getWpm, nextDeadline, type Mode } from './game/engine'
import { useInterval } from './hooks/useInterval'
import { useAnimationFrame } from './hooks/useAnimationFrame'
import { now } from './clock'
import { sound } from './feel/audio'
import { useFeel, type FeelRefs } from './feel/useFeel'
import {
  EFFECTS_LEVELS,
  SOUND_CHARACTERS,
  SOUND_LEVELS,
  SlowFrameDetector,
  nextInCycle,
  pick,
  resolveEffects,
  type EffectsLevel,
  type SoundCharacter,
  type SoundLevel,
} from './feel/rules'
import {
  AMBIENT_KEY,
  BEST_COMBO_KEY,
  EFFECTS_KEY,
  MODE_KEY,
  SOUND_CHARACTER_KEY,
  SOUND_LEVEL_KEY,
  readNumber,
  readSoundLevel,
  readStats,
  readString,
  withRun,
  writeStats,
  writeValue,
} from './storage'
import { ReadyScreen } from './components/ReadyScreen'
import { PlayScreen } from './components/PlayScreen'
import { ZenScreen } from './components/ZenScreen'
import { PauseScreen } from './components/PauseScreen'
import { ResultScreen } from './components/ResultScreen'

// The clock only needs to tick when something happens on its own (nextDeadline);
// this slow safety tick just re-syncs in case a timer was throttled.
const SAFETY_TICK_MS = 1000
const IGNORED_KEYS = new Set(['Tab', 'Alt', 'Control', 'Meta', 'Shift', 'CapsLock', 'ContextMenu'])
// R2.2: after a run ends, replay keys wait this long so fast typists don't skip the result.
const REPLAY_LOCK_MS = 700
const MODES: readonly Mode[] = ['arcade', 'zen']

const randomSeed = () => Math.floor(Math.random() * 2 ** 32)
const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState(readNumber(BEST_COMBO_KEY), randomSeed(), pick(MODES, readString(MODE_KEY), 'arcade')),
  )
  const [soundLevel, setSoundLevel] = useState<SoundLevel>(readSoundLevel)
  const [character, setCharacter] = useState<SoundCharacter>(() =>
    pick(SOUND_CHARACTERS, readString(SOUND_CHARACTER_KEY), 'soft'),
  )
  const [ambient, setAmbient] = useState(() => readString(AMBIENT_KEY) !== 'off')
  // Arcade best words when the run began (result screen: "new best" / "N words from your best").
  const [bestBefore, setBestBefore] = useState(0)
  const [replayReady, setReplayReady] = useState(false)
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
  const { screen, bestCombo, lastTickAt, mode } = state

  const start = useCallback(() => {
    sound.unlock() // inside the user's key press or click, so audio may start
    setBestBefore(readStats().bestWords)
    dispatch({ type: 'start', now: now(), seed: randomSeed() })
  }, [])
  const playAgain = useCallback(() => {
    sound.unlock()
    setBestBefore(readStats().bestWords)
    dispatch({ type: 'playAgain', now: now(), seed: randomSeed() })
  }, [])
  const pause = useCallback(() => dispatch({ type: 'pause', now: now() }), [])
  const resume = useCallback(() => dispatch({ type: 'resume', now: now() }), [])
  const end = useCallback(() => dispatch({ type: 'end', now: now() }), [])
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
  useEffect(() => sound.setCharacter(character), [character])

  // Zen ambient pad: only while a zen session is actually running (fades out on pause and end).
  const ambientOn = mode === 'zen' && screen === 'playing' && ambient && soundLevel !== 'off'
  useEffect(() => {
    if (!ambientOn) return
    sound.startAmbient()
    return () => sound.stopAmbient()
  }, [ambientOn])

  // Performance guard: if FULL effects make frames slow, fall back to SUBTLE for the session.
  const frameDetector = useRef<SlowFrameDetector | null>(null)
  useAnimationFrame((frameMs) => {
    frameDetector.current ??= new SlowFrameDetector()
    if (frameDetector.current.feed(frameMs)) setEffectsOverride('subtle')
  }, screen === 'playing' && effects === 'full')

  useEffect(() => writeValue(BEST_COMBO_KEY, bestCombo), [bestCombo])

  // When a run ends: record arcade bests once, and briefly lock the replay keys.
  // (Runs on screen changes only, so React's dev double-invoke on mount never reaches it.)
  useEffect(() => {
    if (screen !== 'gameover') return
    if (mode === 'arcade') writeStats(withRun(readStats(), state.wordsCompleted, getWpm(state)))
    setReplayReady(false)
    const id = window.setTimeout(() => setReplayReady(true), REPLAY_LOCK_MS)
    return () => window.clearTimeout(id)
  }, [screen]) // once per result screen (mode and the final state are settled by then)

  const cycleSound = () => {
    const next = nextInCycle(SOUND_LEVELS, soundLevel)
    setSoundLevel(next)
    writeValue(SOUND_LEVEL_KEY, next)
    sound.setLevel(next)
    sound.thock(1) // let the player hear the new level (silent when off)
  }
  const chooseMode = useCallback((next: Mode) => {
    dispatch({ type: 'setMode', mode: next })
    writeValue(MODE_KEY, next)
  }, [])
  // Picking a key sound plays a short preview, and turns sound on if it was off.
  const chooseCharacter = useCallback(
    (next: SoundCharacter) => {
      setCharacter(next)
      writeValue(SOUND_CHARACTER_KEY, next)
      if (soundLevel === 'off') {
        setSoundLevel('low')
        writeValue(SOUND_LEVEL_KEY, 'low')
        sound.setLevel('low')
      }
      sound.preview(next)
    },
    [soundLevel],
  )
  const toggleAmbient = () => {
    setAmbient(!ambient)
    writeValue(AMBIENT_KEY, ambient ? 'off' : 'on')
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

  // Keyboard. Ready: ← → mode, ↑ ↓ key sound, any other key starts (Enter/Space on a focused
  // button just presses it). Playing: Esc pauses. Paused: Esc (or Enter, unless a button has focus)
  // resumes. Result: Enter/Space plays again once the short lock has passed; Esc goes to the menu.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (IGNORED_KEYS.has(event.key) || event.ctrlKey || event.metaKey || event.altKey) return
      const onButton = event.target instanceof HTMLButtonElement
      if (screen === 'ready') {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          const step = event.key === 'ArrowLeft' ? MODES.length - 1 : 1
          return chooseMode(MODES[(MODES.indexOf(mode) + step) % MODES.length])
        }
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault()
          const n = SOUND_CHARACTERS.length
          const step = event.key === 'ArrowUp' ? n - 1 : 1
          return chooseCharacter(SOUND_CHARACTERS[(SOUND_CHARACTERS.indexOf(character) + step) % n])
        }
        if (onButton && (event.key === 'Enter' || event.key === ' ')) return
        if (event.key === 'Escape') return
        event.preventDefault()
        return start()
      }
      if (screen === 'paused') {
        if (event.key === 'Escape' || (event.key === 'Enter' && !onButton)) {
          event.preventDefault()
          resume()
        }
        return
      }
      if (screen === 'gameover') {
        if (event.key === 'Escape') return restart()
        if ((event.key === 'Enter' || event.key === ' ') && !onButton) {
          event.preventDefault()
          if (replayReady) playAgain()
        }
        return
      }
      if (event.key === 'Escape') return pause()
      if (event.key.length === 1) inputRef.current?.focus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [screen, mode, character, replayReady, start, playAgain, pause, resume, restart, chooseMode, chooseCharacter])

  return (
    <main
      className="app-shell"
      data-effects={effects}
      data-mode={mode}
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
          {screen === 'playing' && mode === 'zen' && <button className="quiet-button" onClick={end}>END</button>}
        </div>
      </header>

      {screen === 'ready' && (
        <ReadyScreen
          mode={mode}
          character={character}
          soundOn={soundLevel !== 'off'}
          ambient={ambient}
          onMode={chooseMode}
          onCharacter={chooseCharacter}
          onAmbient={toggleAmbient}
          onStart={start}
        />
      )}
      {screen === 'playing' && mode === 'zen' && (
        <ZenScreen
          state={state}
          inputRef={inputRef}
          feelRefs={feelRefs}
          onInput={(value) => dispatch({ type: 'input', value, now: now() })}
        />
      )}
      {screen === 'playing' && mode === 'arcade' && (
        <PlayScreen
          state={state}
          inputRef={inputRef}
          feelRefs={feelRefs}
          pulse={effects !== 'off'}
          onInput={(value) => dispatch({ type: 'input', value, now: now() })}
        />
      )}
      {screen === 'paused' && (
        <PauseScreen
          mode={mode}
          wordsCompleted={state.wordsCompleted}
          combo={state.combo}
          onResume={resume}
          onRestart={restart}
          onEnd={end}
        />
      )}
      {screen === 'gameover' && (
        <ResultScreen state={state} bestBefore={bestBefore} ready={replayReady} onPlayAgain={playAgain} onMenu={restart} />
      )}

      <footer className="site-footer">
        <span>ICA <span className="dot">·</span> TYPE AT YOUR OWN PACE</span>
        <span>V {__APP_VERSION__}</span>
      </footer>
    </main>
  )
}

export default App
