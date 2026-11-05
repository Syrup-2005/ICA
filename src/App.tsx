import { useCallback, useEffect, useRef, useState } from 'react'
import { getDifficulty, getWord } from './words'

type Screen = 'ready' | 'playing' | 'paused' | 'gameover'

const COMBO_WINDOW = 3000
const MAX_HEALTH = 5000
const WRONG_INPUT_PENALTY = 750
const BEST_COMBO_KEY = 'ica-best-combo'
const SOUND_KEY = 'ica-sound-enabled'

function readNumber(key: string): number {
  const value = Number(localStorage.getItem(key) ?? 0)
  return Number.isFinite(value) ? value : 0
}

function App() {
  const [screen, setScreen] = useState<Screen>('ready')
  const [word, setWord] = useState(() => getWord(1))
  const [typed, setTyped] = useState('')
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(() => readNumber(BEST_COMBO_KEY))
  const [wordsCompleted, setWordsCompleted] = useState(0)
  const [correctCharacters, setCorrectCharacters] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [healthRemaining, setHealthRemaining] = useState(MAX_HEALTH)
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_KEY) === 'true')
  const [wrongInput, setWrongInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const startedAtRef = useRef<number | null>(null)
  const lastCompletedAtRef = useRef<number | null>(null)
  const lastHealthTickRef = useRef<number | null>(null)
  const healthRemainingRef = useRef(MAX_HEALTH)
  const pausedAtRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const level = getDifficulty(wordsCompleted)
  const accuracy = correctCharacters + mistakes === 0
    ? 100
    : Math.round((correctCharacters / (correctCharacters + mistakes)) * 100)

  const playTone = useCallback((frequency: number, duration = 0.055) => {
    if (!soundEnabled) return
    try {
      const AudioContextClass = window.AudioContext
      if (!AudioContextClass) return
      audioContextRef.current ??= new AudioContextClass()
      const context = audioContextRef.current
      if (context.state === 'suspended') void context.resume()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = frequency
      oscillator.type = 'sine'
      gain.gain.setValueAtTime(0.045, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + duration)
    } catch {
      // Audio is optional; gameplay should continue if audio is unavailable.
    }
  }, [soundEnabled])

  const startGame = useCallback(() => {
    if (screen === 'playing') return
    if (screen === 'ready') {
      setCombo(0)
      setWordsCompleted(0)
      setCorrectCharacters(0)
      setMistakes(0)
      setElapsed(0)
      setTyped('')
      setWord(getWord(1))
      startedAtRef.current = Date.now()
      lastCompletedAtRef.current = null
      healthRemainingRef.current = MAX_HEALTH
      lastHealthTickRef.current = Date.now()
    }
    if (screen === 'paused' && pausedAtRef.current !== null) {
      // Shift timers forward so paused time doesn't count.
      const pausedFor = Date.now() - pausedAtRef.current
      if (startedAtRef.current !== null) startedAtRef.current += pausedFor
      if (lastCompletedAtRef.current !== null) lastCompletedAtRef.current += pausedFor
    }
    pausedAtRef.current = null
    lastHealthTickRef.current = Date.now()

  setScreen('playing')
  window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [screen])

  const pauseGame = useCallback(() => {
    pausedAtRef.current = Date.now()
    setScreen('paused')
  }, [])

  const restartGame = useCallback(() => {
    setScreen('ready')
    setCombo(0)
    setWordsCompleted(0)
    setCorrectCharacters(0)
    setMistakes(0)
    setElapsed(0)
    setTyped('')
    setWord(getWord(1))
    setHealthRemaining(MAX_HEALTH)
    healthRemainingRef.current = MAX_HEALTH
    lastHealthTickRef.current = null
    pausedAtRef.current = null
    startedAtRef.current = null
    lastCompletedAtRef.current = null
  }, [])

  useEffect(() => {
  if (screen !== 'playing') return

  const interval = window.setInterval(() => {
    const now = Date.now()

    // Update elapsed game time.
    if (startedAtRef.current !== null) {
      setElapsed(Math.floor((now - startedAtRef.current) / 1000))
    }

    // Drain the survival meter.
    if (lastHealthTickRef.current !== null) {
      const timePassed = now - lastHealthTickRef.current
      lastHealthTickRef.current = now

      healthRemainingRef.current = Math.max(
        0,
        healthRemainingRef.current - timePassed
      )

      setHealthRemaining(healthRemainingRef.current)

      // Game over when the survival meter reaches zero.
      if (healthRemainingRef.current <= 0) {
        setScreen('gameover')
        return
      }
    }

    // Reset the combo once its window expires.
    if (lastCompletedAtRef.current === null) return

    if (now - lastCompletedAtRef.current >= COMBO_WINDOW) {
      setCombo(0)
      lastCompletedAtRef.current = null
    }
  }, 50)

  return () => window.clearInterval(interval)
  }, [screen])

  useEffect(() => {
    if (screen !== 'ready') return
    const handleStartKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab' || event.key === 'Alt' || event.key === 'Control' || event.key === 'Meta') return
      startGame()
    }
    window.addEventListener('keydown', handleStartKey)
    return () => window.removeEventListener('keydown', handleStartKey)
  }, [screen, startGame])

  useEffect(() => {
    if (screen !== 'playing') return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        pauseGame()
        return
      }
      if (event.key === 'Tab' || event.key === 'Alt' || event.key === 'Control' || event.key === 'Meta') return
      if (event.key.length === 1) inputRef.current?.focus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [screen, pauseGame])

  function handleTyping(value: string) {
    if (screen !== 'playing') return
    const nextValue = value.toLowerCase().replace(/[^a-z]/g, '').slice(0, word.length)
    const expected = word.slice(0, nextValue.length)
    if (nextValue !== expected) {
  setMistakes((count) => count + 1)

  // Reduce health for every incorrect input.
  const remainingHealth = Math.max(
    0,
    healthRemainingRef.current - WRONG_INPUT_PENALTY
  )

  healthRemainingRef.current = remainingHealth
  setHealthRemaining(remainingHealth)

  setWrongInput(true)
  playTone(145, 0.08)
  window.setTimeout(() => setWrongInput(false), 180)

  // End the game if health reaches zero.
  if (remainingHealth <= 0) {
    setScreen('gameover')
  }

  return
  }

    setTyped(nextValue)
    setCorrectCharacters((count) => count + Math.max(0, nextValue.length - typed.length))
    playTone(440, 0.025)

    if (nextValue === word) {
      const now = Date.now()
      // Restore the survival meter after completing a word.
      healthRemainingRef.current = MAX_HEALTH
      setHealthRemaining(MAX_HEALTH)
      lastHealthTickRef.current = now
      const comboIsAlive = lastCompletedAtRef.current !== null && now - lastCompletedAtRef.current < COMBO_WINDOW
      const nextCombo = comboIsAlive ? combo + 1 : 1
      setCombo(nextCombo)
      if (nextCombo > bestCombo) {
        setBestCombo(nextCombo)
        localStorage.setItem(BEST_COMBO_KEY, String(nextCombo))
      }
      setWordsCompleted((count) => count + 1)
      lastCompletedAtRef.current = now
      playTone(nextCombo > 0 && nextCombo % 10 === 0 ? 880 : 620, 0.11)
      setWord(getWord(getDifficulty(wordsCompleted + 1), word))
      setTyped('')
    }
  }

  function toggleSound() {
    setSoundEnabled((enabled) => {
      localStorage.setItem(SOUND_KEY, String(!enabled))
      return !enabled
    })
  }

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const seconds = String(elapsed % 60).padStart(2, '0')

  return (
    <main className="app-shell" onMouseDown={() => screen === 'playing' && inputRef.current?.focus()}>
      <header className="topbar">
        <button className="wordmark" onClick={restartGame} aria-label="ICA home">ICA<span>.</span></button>
        <div className="topbar-actions">
          <button className="quiet-button" onClick={toggleSound} aria-pressed={soundEnabled}>
            SOUND {soundEnabled ? 'ON' : 'OFF'}
          </button>
          {screen === 'playing' && <button className="quiet-button" onClick={pauseGame}>PAUSE</button>}
        </div>
      </header>

      {screen === 'ready' && (
        <section className="center-stage intro-stage">
          <p className="eyebrow">A TYPING ARCADE</p>
          <h1>Type. Focus. Repeat.</h1>
          <p className="subheading">A quiet place to find your rhythm.</p>
          <button className="start-prompt" onClick={startGame}>PRESS ANY KEY TO START <span>↗</span></button>
        </section>
      )}

      {screen === 'playing' && (
        <>
          <section className="stats-row" aria-label="Game statistics">
            <Stat label="COMBO" value={`${combo}x`} />
            <Stat label="BEST" value={`${bestCombo}x`} />
            <Stat label="WORDS" value={String(wordsCompleted)} />
            <Stat label="TIME" value={`${minutes}:${seconds}`} />
          </section>
          <section className={`center-stage game-stage ${wrongInput ? 'shake' : ''}`}>
            <p className="eyebrow">LEVEL {level} <span className="dot">·</span> ENDLESS</p>
            <div className="word-display" aria-hidden="true">
              <span className="typed-text">{word.slice(0, typed.length)}</span><span className="remaining-text">{word.slice(typed.length)}</span>
            </div>
            <p className="typing-hint">TYPE THE WORD</p>
            <input
              ref={inputRef}
              className="typing-input"
              value={typed}
              onChange={(event) => handleTyping(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label={`Type the word ${word}`}
              autoFocus
            />
          </section>
          <footer className="game-footer">
            <div className="combo-track" aria-label="Survival meter">
              <div
                className="combo-track-fill"
                style={{ width: `${(healthRemaining / MAX_HEALTH) * 100}%` }}
              />
            </div>
            <div className="footer-details">
              <span>ACCURACY <strong>{accuracy}%</strong></span>
              <span>SURVIVAL <strong>{(healthRemaining / 1000).toFixed(1)}s</strong></span>
              <span>ESC <strong>PAUSE</strong></span>
            </div>
          </footer>
        </>
      )}

      {screen === 'paused' && (
        <section className="center-stage intro-stage">
          <p className="eyebrow">SESSION PAUSED</p>
          <h1>Take a breath.</h1>
          <p className="subheading">{wordsCompleted} words completed · {combo}x current combo</p>
          <div className="pause-actions">
            <button className="primary-button" onClick={startGame}>RESUME</button>
            <button className="quiet-button" onClick={restartGame}>RESTART</button>
          </div>
        </section>
      )}

      {screen === 'gameover' && (
        <section className="center-stage intro-stage">
          <p className="eyebrow">SESSION ENDED</p>
          <h1>Game Over.</h1>
          <p className="subheading">
            You completed {wordsCompleted} words.
          </p>

          <div className="pause-actions">
            <button className="primary-button" onClick={restartGame}>
              PLAY AGAIN
            </button>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <span>ICA <span className="dot">·</span> TYPE AT YOUR OWN PACE</span>
        <span>V 0.1.1</span>
      </footer>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>
}

export default App
