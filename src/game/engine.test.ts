import { describe, expect, it } from 'vitest'
import {
  COMBO_WINDOW,
  MAX_HEALTH,
  WRONG_INPUT_PENALTY,
  createInitialState,
  gameReducer,
  getAccuracy,
  getWpm,
  nextDeadline,
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

describe('feedback details for the UI', () => {
  it('records the rejected letter', () => {
    const s0 = started()
    const wrong = wrongLetter(s0)
    expect(run(s0, { type: 'input', value: wrong, now: T0 }).wrongLetter).toBe(wrong)
  })

  it('records the completed word', () => {
    const s0 = started()
    expect(typeWord(s0, T0).lastWord).toBe(s0.word)
  })

  it('counts a combo break exactly once, when a live combo expires', () => {
    const s1 = typeWord(started(), T0)
    const broken = run(s1, { type: 'tick', now: T0 + COMBO_WINDOW })
    expect(broken.comboBreakId).toBe(1)
    expect(run(broken, { type: 'tick', now: T0 + COMBO_WINDOW + 500 }).comboBreakId).toBe(1)
  })

  it('does not count a break when there was no combo', () => {
    expect(run(started(), { type: 'tick', now: T0 + 1000 }).comboBreakId).toBe(0)
  })

  it('counts a break that happens just before a keystroke (break + new combo in one event)', () => {
    const s1 = typeWord(started(), T0)
    const s2 = typeWord(s1, T0 + COMBO_WINDOW + 10)
    expect(s2.comboBreakId).toBe(1)
    expect(s2.combo).toBe(1)
  })
})

describe('nextDeadline (replaces 50 ms polling)', () => {
  it('is the survival time left when no combo is active', () => {
    expect(nextDeadline(started())).toBe(MAX_HEALTH)
  })

  it('is the earlier of survival and the combo window', () => {
    const s1 = run(typeWord(started(), T0), { type: 'tick', now: T0 + 500 })
    expect(nextDeadline(s1)).toBe(COMBO_WINDOW - 500)
  })

  it('is null while not playing', () => {
    expect(nextDeadline(createInitialState())).toBeNull()
    expect(nextDeadline(run(started(), { type: 'pause', now: T0 }))).toBeNull()
  })

  it('ends an idle run at exactly the same moment and state as 50 ms polling', () => {
    // Polling: tick every 50 ms until game over.
    let polled = typeWord(started(), T0)
    for (let t = T0 + 50; polled.screen === 'playing'; t += 50) polled = gameReducer(polled, { type: 'tick', now: t })

    // Deadline scheduling: tick only when nextDeadline says something happens.
    let scheduled = typeWord(started(), T0)
    let ticks = 0
    while (scheduled.screen === 'playing') {
      const at = scheduled.lastTickAt! + nextDeadline(scheduled)!
      scheduled = gameReducer(scheduled, { type: 'tick', now: at })
      ticks++
    }

    expect(scheduled).toEqual(polled)
    expect(scheduled.elapsed).toBe(MAX_HEALTH)
    expect(ticks).toBe(2) // combo expiry, then survival running out (vs 100 polling ticks)
  })
})

describe('zen mode (no timer, no failure)', () => {
  const zen = (seed = 42) => run(createInitialState(0), { type: 'start', now: T0, seed, mode: 'zen' })

  it('never drains survival or ends on its own', () => {
    const s = run(zen(), { type: 'tick', now: T0 + 60 * MAX_HEALTH })
    expect(s.screen).toBe('playing')
    expect(s.health).toBe(MAX_HEALTH)
    expect(s.elapsed).toBe(60 * MAX_HEALTH)
    expect(nextDeadline(s)).toBeNull()
  })

  it('mistakes cost no time and quietly reset the streak', () => {
    let s = typeWord(typeWord(zen(), T0), T0 + 9000) // a pause between words never breaks the streak
    expect(s.combo).toBe(2)
    for (let i = 0; i < 20; i++) s = gameReducer(s, { type: 'input', value: s.typed + wrongLetter(s), now: T0 + 9000 })
    expect(s.screen).toBe('playing')
    expect(s.health).toBe(MAX_HEALTH)
    expect(s.combo).toBe(0)
    expect(s.runBestCombo).toBe(2)
    expect(s.comboBreakId).toBe(0)
  })

  it('stays in comfortable word lengths and never touches the arcade best combo', () => {
    let s = run(createInitialState(3), { type: 'start', now: T0, seed: 5, mode: 'zen' })
    for (let i = 0; i < 70; i++) s = typeWord(s, T0 + i)
    expect(s.word.length).toBeLessThanOrEqual(8)
    expect(s.bestCombo).toBe(3)
  })

  it('end stops the run and shows the result; replay keeps the mode', () => {
    const ended = run(typeWord(zen(), T0 + 1000), { type: 'end', now: T0 + 2000 })
    expect(ended.screen).toBe('gameover')
    expect(ended.elapsed).toBe(2000)
    expect(ended.wordsCompleted).toBe(1)
    const again = run(ended, { type: 'playAgain', now: T0 + 5000, seed: 9 })
    expect(again.screen).toBe('playing')
    expect(again.mode).toBe('zen')
    expect(again.wordsCompleted).toBe(0)
  })

  it('the mode can only change on the ready screen, and the next start uses it', () => {
    const ready = run(createInitialState(), { type: 'setMode', mode: 'zen' })
    expect(ready.mode).toBe('zen')
    const s = run(ready, { type: 'start', now: T0, seed: 1 })
    expect(s.mode).toBe('zen')
    expect(run(s, { type: 'setMode', mode: 'arcade' })).toBe(s)
    expect(run(s, { type: 'restart' }).mode).toBe('zen')
  })

  it('end also works from pause', () => {
    const s = run(zen(), { type: 'pause', now: T0 + 1000 }, { type: 'end', now: T0 + 50_000 })
    expect(s.screen).toBe('gameover')
    expect(s.elapsed).toBe(1000)
  })
})

describe('result helpers and replay', () => {
  it('playAgain only acts on the result screen', () => {
    const s = started()
    expect(run(s, { type: 'playAgain', now: T0, seed: 3 })).toBe(s)
  })

  it('playAgain starts a fresh arcade run and keeps the all-time best', () => {
    const over = run(typeWord(started(), T0), { type: 'tick', now: T0 + MAX_HEALTH })
    expect(over.screen).toBe('gameover')
    const again = run(over, { type: 'playAgain', now: T0 + 9000, seed: 3 })
    expect(again.screen).toBe('playing')
    expect(again.mode).toBe('arcade')
    expect(again.bestCombo).toBe(1)
    expect(again.runBestCombo).toBe(0)
    expect(again.health).toBe(MAX_HEALTH)
  })

  it('tracks the best combo within the run', () => {
    const s = typeWord(typeWord(started(), T0), T0 + 100)
    expect(s.runBestCombo).toBe(2)
  })

  it('WPM is hidden for very short runs, then correct characters / 5 per active minute', () => {
    expect(getWpm({ correctCharacters: 40, elapsed: 4999 })).toBeNull()
    expect(getWpm({ correctCharacters: 300, elapsed: 60_000 })).toBe(60)
    expect(getWpm({ correctCharacters: 25, elapsed: 10_000 })).toBe(30)
  })
})
