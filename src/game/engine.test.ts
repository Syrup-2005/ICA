import { describe, expect, it } from 'vitest'
import {
  COMBO_WINDOW,
  MAX_HEALTH,
  WRONG_INPUT_PENALTY,
  createInitialState,
  gameReducer,
  getAccuracy,
  type GameEvent,
  type GameState,
} from './engine'

const T0 = 1_000_000

function run(state: GameState, ...events: GameEvent[]): GameState {
  return events.reduce(gameReducer, state)
}

function started(seed = 42, bestCombo = 0): GameState {
  return run(createInitialState(bestCombo), { type: 'start', now: T0, seed })
}

// Types the current word one letter at a time at time `now`.
function typeWord(state: GameState, now: number): GameState {
  let s = state
  for (let i = 1; i <= state.word.length; i++) {
    s = gameReducer(s, { type: 'input', value: state.word.slice(0, i), now })
  }
  return s
}

// A lowercase letter that is NOT the next expected letter.
function wrongLetter(state: GameState): string {
  const expected = state.word[state.typed.length]
  return expected === 'z' ? 'a' : 'z'
}

describe('start / restart', () => {
  it('starts playing with a fresh level-1 word and full survival', () => {
    const s = started()
    expect(s.screen).toBe('playing')
    expect(s.word.length).toBeGreaterThan(0)
    expect(s.health).toBe(MAX_HEALTH)
    expect(s.wordsCompleted).toBe(0)
  })

  it('is deterministic for the same seed', () => {
    expect(started(7).word).toBe(started(7).word)
  })

  it('restart returns to ready and keeps the best combo', () => {
    const s = run(typeWord(started(), T0), { type: 'restart' })
    expect(s.screen).toBe('ready')
    expect(s.wordsCompleted).toBe(0)
    expect(s.bestCombo).toBe(1)
  })

  it('ignores start unless on the ready screen', () => {
    const s = started()
    expect(gameReducer(s, { type: 'start', now: T0 + 10, seed: 1 })).toBe(s)
  })
})

describe('typing', () => {
  it('accepts a correct letter', () => {
    const s0 = started()
    const s = run(s0, { type: 'input', value: s0.word[0], now: T0 })
    expect(s.typed).toBe(s0.word[0])
    expect(s.correctCharacters).toBe(1)
    expect(s.feedback).toBe('correct')
  })

  it('normalizes uppercase input', () => {
    const s0 = started()
    const s = run(s0, { type: 'input', value: s0.word[0].toUpperCase(), now: T0 })
    expect(s.typed).toBe(s0.word[0])
  })

  it('ignores non-letter keys without feedback', () => {
    const s0 = started()
    const s = run(s0, { type: 'input', value: ' 1', now: T0 })
    expect(s.typed).toBe('')
    expect(s.feedbackId).toBe(s0.feedbackId)
    expect(s.mistakes).toBe(0)
  })

  it('rejects a wrong letter and applies the penalty', () => {
    const s0 = started()
    const s = run(s0, { type: 'input', value: wrongLetter(s0), now: T0 })
    expect(s.typed).toBe('')
    expect(s.mistakes).toBe(1)
    expect(s.health).toBe(MAX_HEALTH - WRONG_INPUT_PENALTY)
    expect(s.feedback).toBe('wrong')
  })

  it('ends the game when penalties drain survival to zero', () => {
    let s = started()
    const hits = Math.ceil(MAX_HEALTH / WRONG_INPUT_PENALTY)
    for (let i = 0; i < hits; i++) s = gameReducer(s, { type: 'input', value: wrongLetter(s), now: T0 })
    expect(s.health).toBe(0)
    expect(s.screen).toBe('gameover')
  })

  it('computes accuracy from correct letters and mistakes', () => {
    const s0 = started()
    const s = run(
      s0,
      { type: 'input', value: wrongLetter(s0), now: T0 },
      { type: 'input', value: s0.word[0], now: T0 },
    )
    expect(getAccuracy(s)).toBe(50)
    expect(getAccuracy(s0)).toBe(100)
  })
})

describe('completing words and combos', () => {
  it('completing a word refills survival, starts a combo and draws a different word', () => {
    const s0 = run(started(), { type: 'tick', now: T0 + 2000 })
    const s = typeWord(s0, T0 + 2000)
    expect(s.wordsCompleted).toBe(1)
    expect(s.combo).toBe(1)
    expect(s.bestCombo).toBe(1)
    expect(s.health).toBe(MAX_HEALTH)
    expect(s.comboTimer).toBe(COMBO_WINDOW)
    expect(s.typed).toBe('')
    expect(s.word).not.toBe(s0.word)
    expect(s.feedback).toBe('complete')
  })

  it('extends the combo when the next word is completed inside the window', () => {
    const s1 = typeWord(started(), T0)
    const s2 = typeWord(s1, T0 + COMBO_WINDOW - 1)
    expect(s2.combo).toBe(2)
    expect(s2.bestCombo).toBe(2)
  })

  it('resets the combo once the window expires', () => {
    const s1 = typeWord(started(), T0)
    const expired = run(s1, { type: 'tick', now: T0 + COMBO_WINDOW })
    expect(expired.combo).toBe(0)
    expect(typeWord(expired, T0 + COMBO_WINDOW).combo).toBe(1)
    expect(expired.bestCombo).toBe(1)
  })

  it('never lowers the stored best combo', () => {
    const s = typeWord(started(42, 9), T0)
    expect(s.bestCombo).toBe(9)
  })
})

describe('time', () => {
  it('drains survival in real time and ends the game at zero', () => {
    const s = run(started(), { type: 'tick', now: T0 + 1000 })
    expect(s.health).toBe(MAX_HEALTH - 1000)
    expect(s.elapsed).toBe(1000)
    expect(run(s, { type: 'tick', now: T0 + MAX_HEALTH }).screen).toBe('gameover')
  })

  // Regression test for the v0.1.1 pause bug.
  it('does not count paused time against the clock, survival or combo', () => {
    const s1 = typeWord(started(), T0)
    const paused = run(s1, { type: 'tick', now: T0 + 1000 }, { type: 'pause', now: T0 + 1000 })
    expect(paused.screen).toBe('paused')

    const resumed = run(paused, { type: 'resume', now: T0 + 60_000 }, { type: 'tick', now: T0 + 60_000 })
    expect(resumed.screen).toBe('playing')
    expect(resumed.elapsed).toBe(1000)
    expect(resumed.health).toBe(MAX_HEALTH - 1000)
    expect(resumed.combo).toBe(1)
    expect(resumed.comboTimer).toBe(COMBO_WINDOW - 1000)
  })

  it('ignores ticks and input while paused', () => {
    const paused = run(started(), { type: 'pause', now: T0 })
    expect(run(paused, { type: 'tick', now: T0 + 99_999 })).toBe(paused)
    expect(run(paused, { type: 'input', value: 'a', now: T0 + 1 })).toBe(paused)
  })
})
