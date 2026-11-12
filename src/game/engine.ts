import { getDifficulty, getWord } from './words'

// Tuning constants (milliseconds).
export const COMBO_WINDOW = 3000
export const MAX_HEALTH = 5000
export const WRONG_INPUT_PENALTY = 750
// Runs shorter than this show no WPM ("—"): a few seconds of typing gives absurd numbers.
export const MIN_WPM_MS = 5000
// Zen stays in comfortable word lengths (levels 1–2: 3–8 letters); it is about flow, not difficulty.
export const ZEN_MAX_LEVEL = 2

export type Screen = 'ready' | 'playing' | 'paused' | 'gameover'
// arcade: survival meter, penalties, combo window, game over.
// zen: no timer, no failure, endless. The streak counts words in a row without a mistake.
export type Mode = 'arcade' | 'zen'

// Result of the latest input, used by the UI for sound, motion and haptic feedback.
export type Feedback = 'none' | 'correct' | 'wrong' | 'complete'

export interface GameState {
  screen: Screen
  mode: Mode
  word: string
  typed: string
  combo: number
  bestCombo: number // all-time best (arcade only)
  runBestCombo: number // best combo (arcade) or longest streak (zen) in this run
  wordsCompleted: number
  correctCharacters: number
  mistakes: number
  health: number // survival time left (ms)
  comboTimer: number // time left to extend the combo (ms); 0 = no active window
  elapsed: number // active play time (ms); excludes paused time
  lastTickAt: number | null // null whenever the clock is stopped
  seed: number // PRNG state; keeps the reducer pure and deterministic
  feedback: Feedback
  feedbackId: number // increments on every feedback so repeated values still fire
  comboBreakId: number // increments when a live combo's window expires
  wrongLetter: string // the letter most recently rejected (for the UI)
  lastWord: string // the word most recently completed (for the UI transition)
}

export type GameEvent =
  | { type: 'start'; now: number; seed: number; mode?: Mode }
  | { type: 'playAgain'; now: number; seed: number } // from the result screen, same mode
  | { type: 'end'; now: number } // the player stops a run (zen "end session")
  | { type: 'setMode'; mode: Mode } // on the ready screen only
  | { type: 'tick'; now: number }
  | { type: 'input'; value: string; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'restart' }

export function createInitialState(bestCombo = 0, seed = 1, mode: Mode = 'arcade'): GameState {
  return {
    screen: 'ready',
    mode,
    word: '',
    typed: '',
    combo: 0,
    bestCombo,
    runBestCombo: 0,
    wordsCompleted: 0,
    correctCharacters: 0,
    mistakes: 0,
    health: MAX_HEALTH,
    comboTimer: 0,
    elapsed: 0,
    lastTickAt: null,
    seed,
    feedback: 'none',
    feedbackId: 0,
    comboBreakId: 0,
    wrongLetter: '',
    lastWord: '',
  }
}

export function gameReducer(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'start':
      if (state.screen !== 'ready') return state
      return beginRun(state.bestCombo, event.mode ?? state.mode, event.seed, event.now)
    case 'playAgain':
      if (state.screen !== 'gameover') return state
      return beginRun(state.bestCombo, state.mode, event.seed, event.now)
    case 'end': {
      if (state.screen !== 'playing' && state.screen !== 'paused') return state
      const advanced = advance(state, event.now)
      return { ...advanced, screen: 'gameover', lastTickAt: null }
    }
    case 'tick':
      return advance(state, event.now)
    case 'input':
      return handleInput(state, event.value, event.now)
    case 'pause': {
      if (state.screen !== 'playing') return state
      const advanced = advance(state, event.now)
      if (advanced.screen !== 'playing') return advanced
      return { ...advanced, screen: 'paused', lastTickAt: null }
    }
    case 'resume':
      if (state.screen !== 'paused') return state
      return { ...state, screen: 'playing', lastTickAt: event.now }
    case 'setMode':
      return state.screen === 'ready' ? { ...state, mode: event.mode } : state
    case 'restart':
      return createInitialState(state.bestCombo, state.seed, state.mode)
  }
}

function beginRun(bestCombo: number, mode: Mode, seed: number, now: number): GameState {
  const fresh = createInitialState(bestCombo, seed, mode)
  return { ...fresh, ...drawWord(1, '', seed), screen: 'playing', lastTickAt: now }
}

// Moves the clock forward. All timers (survival, combo, elapsed) drain from the same delta.
function advance(state: GameState, now: number): GameState {
  if (state.screen !== 'playing' || state.lastTickAt === null) return state
  const delta = Math.max(0, now - state.lastTickAt)
  if (state.mode === 'zen') return { ...state, elapsed: state.elapsed + delta, lastTickAt: now }
  const health = Math.max(0, state.health - delta)
  const comboTimer = Math.max(0, state.comboTimer - delta)
  const comboBroke = state.combo > 0 && state.comboTimer > 0 && comboTimer === 0
  return {
    ...state,
    health,
    comboTimer,
    combo: comboTimer === 0 ? 0 : state.combo,
    comboBreakId: state.comboBreakId + (comboBroke ? 1 : 0),
    elapsed: state.elapsed + delta,
    lastTickAt: now,
    screen: health === 0 ? 'gameover' : state.screen,
  }
}

function handleInput(previous: GameState, value: string, now: number): GameState {
  // Bring timers up to date first so combo/health checks use the exact moment of input.
  const state = advance(previous, now)
  if (state.screen !== 'playing') return state

  const next = normalizeInput(value).slice(0, state.word.length)
  if (next === state.typed) return state // e.g. a space or digit: nothing to do

  if (next !== state.word.slice(0, next.length)) {
    const mismatch = [...next].findIndex((letter, i) => letter !== state.word[i])
    if (state.mode === 'zen') {
      // No penalty and no failure: the streak quietly starts over.
      return { ...state, mistakes: state.mistakes + 1, combo: 0, wrongLetter: next[mismatch] ?? '', ...withFeedback(state, 'wrong') }
    }
    const health = Math.max(0, state.health - WRONG_INPUT_PENALTY)
    return {
      ...state,
      mistakes: state.mistakes + 1,
      health,
      wrongLetter: next[mismatch] ?? '',
      screen: health === 0 ? 'gameover' : state.screen,
      ...withFeedback(state, 'wrong'),
    }
  }

  const gained = Math.max(0, next.length - state.typed.length)
  const progressed = {
    ...state,
    typed: next,
    correctCharacters: state.correctCharacters + gained,
  }

  if (next !== state.word) {
    return gained > 0 ? { ...progressed, ...withFeedback(state, 'correct') } : progressed
  }

  // Word completed.
  const zen = state.mode === 'zen'
  const combo = zen || state.comboTimer > 0 ? state.combo + 1 : 1
  const wordsCompleted = state.wordsCompleted + 1
  const level = getDifficulty(wordsCompleted)
  return {
    ...progressed,
    ...drawWord(zen ? Math.min(level, ZEN_MAX_LEVEL) : level, state.word, state.seed),
    typed: '',
    lastWord: state.word,
    combo,
    bestCombo: zen ? state.bestCombo : Math.max(state.bestCombo, combo),
    runBestCombo: Math.max(state.runBestCombo, combo),
    wordsCompleted,
    health: MAX_HEALTH,
    comboTimer: zen ? 0 : COMBO_WINDOW,
    ...withFeedback(state, 'complete'),
  }
}

// Milliseconds after `lastTickAt` until the next moment the state changes on its own
// (survival runs out or the combo window closes), or null while the clock is stopped.
// The shell schedules a single tick for this moment instead of polling.
export function nextDeadline(state: GameState): number | null {
  if (state.screen !== 'playing' || state.lastTickAt === null || state.mode === 'zen') return null
  return state.comboTimer > 0 ? Math.min(state.health, state.comboTimer) : state.health
}

export function normalizeInput(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '')
}

export function getAccuracy(state: GameState): number {
  const total = state.correctCharacters + state.mistakes
  return total === 0 ? 100 : Math.round((state.correctCharacters / total) * 100)
}

// Words per minute (5 characters = 1 word) over active play time; null for very short runs.
export function getWpm(state: Pick<GameState, 'correctCharacters' | 'elapsed'>): number | null {
  if (state.elapsed < MIN_WPM_MS) return null
  return Math.round(state.correctCharacters / 5 / (state.elapsed / 60_000))
}

function withFeedback(state: GameState, feedback: Feedback) {
  return { feedback, feedbackId: state.feedbackId + 1 }
}

function drawWord(level: number, previousWord: string, seed: number) {
  let current = seed
  const random = () => {
    const [value, nextSeed] = nextRandom(current)
    current = nextSeed
    return value
  }
  const word = getWord(level, previousWord, random)
  return { word, seed: current }
}

// mulberry32: small, fast, seedable PRNG. Returns [value in [0, 1), next seed].
export function nextRandom(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}
