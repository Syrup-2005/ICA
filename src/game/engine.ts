import { getDifficulty, getWord } from './words'

// Tuning constants (milliseconds).
export const COMBO_WINDOW = 3000
export const MAX_HEALTH = 5000
export const WRONG_INPUT_PENALTY = 750

export type Screen = 'ready' | 'playing' | 'paused' | 'gameover'

// Result of the latest input, used by the UI for sound and shake effects.
export type Feedback = 'none' | 'correct' | 'wrong' | 'complete'

export interface GameState {
  screen: Screen
  word: string
  typed: string
  combo: number
  bestCombo: number
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
}

export type GameEvent =
  | { type: 'start'; now: number; seed: number }
  | { type: 'tick'; now: number }
  | { type: 'input'; value: string; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'restart' }

export function createInitialState(bestCombo = 0, seed = 1): GameState {
  return {
    screen: 'ready',
    word: '',
    typed: '',
    combo: 0,
    bestCombo,
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
  }
}

export function gameReducer(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'start': {
      if (state.screen !== 'ready') return state
      const fresh = createInitialState(state.bestCombo, event.seed)
      return { ...fresh, ...drawWord(1, '', event.seed), screen: 'playing', lastTickAt: event.now }
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
    case 'restart':
      return createInitialState(state.bestCombo, state.seed)
  }
}

// Moves the clock forward. All timers (survival, combo, elapsed) drain from the same delta.
function advance(state: GameState, now: number): GameState {
  if (state.screen !== 'playing' || state.lastTickAt === null) return state
  const delta = Math.max(0, now - state.lastTickAt)
  const health = Math.max(0, state.health - delta)
  const comboTimer = Math.max(0, state.comboTimer - delta)
  return {
    ...state,
    health,
    comboTimer,
    combo: comboTimer === 0 ? 0 : state.combo,
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
    const health = Math.max(0, state.health - WRONG_INPUT_PENALTY)
    return {
      ...state,
      mistakes: state.mistakes + 1,
      health,
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
  const combo = state.comboTimer > 0 ? state.combo + 1 : 1
  const wordsCompleted = state.wordsCompleted + 1
  return {
    ...progressed,
    ...drawWord(getDifficulty(wordsCompleted), state.word, state.seed),
    typed: '',
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    wordsCompleted,
    health: MAX_HEALTH,
    comboTimer: COMBO_WINDOW,
    ...withFeedback(state, 'complete'),
  }
}

export function normalizeInput(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '')
}

export function getAccuracy(state: GameState): number {
  const total = state.correctCharacters + state.mistakes
  return total === 0 ? 100 : Math.round((state.correctCharacters / total) * 100)
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
