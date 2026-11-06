# ICA — Typing Arcade: Project Guide

> **Scope:** codebase guide, architecture, issue audit, implementation log, roadmap and deployment plan.
> **Version documented:** v0.2.0 (Phase 0 and Phase 1 complete)
> **Last updated:** 2026-11-06 · Change history: [`CHANGELOG.md`](../CHANGELOG.md)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Repository Structure](#3-repository-structure)
4. [Running, Testing & Building](#4-running-testing--building)
5. [Architecture](#5-architecture)
6. [Game Mechanics Reference](#6-game-mechanics-reference)
7. [Issue Audit & Status](#7-issue-audit--status)
8. [Implementation Log](#8-implementation-log)
9. [Roadmap](#9-roadmap)
10. [Deployment Plan (Public Domain)](#10-deployment-plan-public-domain)
11. [Glossary](#11-glossary)

---

## 1. Project Overview

**ICA** is a minimalist, endless, browser-based **typing arcade game**.

| Aspect | Description |
|---|---|
| **Concept** | One word is shown at a time; type it and a new one appears. |
| **Pressure** | A 5-second **survival meter** drains constantly. Completing a word refills it; each wrong key removes 0.75 s. At zero, the game ends. |
| **Reward** | A **combo** grows when words are completed within 3 s of each other. The best combo is saved. |
| **Progression** | Words get longer at 12, 30 and 60 completed words (levels 1–4). |
| **Backend** | None. A fully static, client-side site. |
| **Saved data** | Best combo and sound preference in browser `localStorage`. |

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| UI | React | ^19.0.0 | Components, hooks, `useReducer` |
| Language | TypeScript | ~5.7.2 | Strict typing |
| Build / dev server | Vite | ^6.0.5 | Dev server, production bundle |
| Tests | Vitest | ^3.2.7 | Unit tests for game rules |
| CI | GitHub Actions | — | Tests + build on every push/PR |
| Styling | Plain CSS | — | One stylesheet, dark theme |
| Fonts | Google Fonts (Manrope, DM Mono) | — | Loaded remotely |
| Audio | Web Audio API | Browser | Generated tones, no audio files |
| Runtime | Node.js | 22 (`.nvmrc`) | Build and test only |

---

## 3. Repository Structure

```
ICA/
├── .github/workflows/ci.yml   # CI: npm ci → npm test → npm run build → npm run size
├── .gitignore                 # node_modules, dist, zips, env files
├── .nvmrc                     # Node 22 (used by CI and hosting)
├── CHANGELOG.md               # Version history
├── README.md
├── docs/                      # This guide, IMPROVEMENT-PLAN.md, ROADMAP.md
├── index.html                 # HTML shell → /src/main.tsx; font preloads, favicon, link-preview tags
├── netlify.toml               # Netlify build (tests + size gate) and headers (cache, CSP)
├── package.json               # Scripts: dev, build, preview, test, size
├── public/                    # Copied as-is: fonts/ (+ OFL licences), favicon, touch icon, og-image
├── scripts/check-size.mjs     # Size budgets (KiB), run by CI and Netlify
├── vite.config.ts             # React plugin, __APP_VERSION__, %SITE_URL% for link previews
├── tsconfig*.json             # TypeScript configs (app + node)
└── src/
    ├── main.tsx               # Mounts <App/>
    ├── App.tsx                # Wiring: state ↔ effects ↔ screens; auto-pause; keyboard
    ├── clock.ts               # Monotonic game clock (performance.now)
    ├── storage.ts             # Safe localStorage read/write
    ├── dev/PerfHud.tsx        # Dev-only perf overlay (?perf); never in production builds
    ├── styles.css             # All styles
    ├── vite-env.d.ts          # Type for __APP_VERSION__
    ├── game/                  # PURE LOGIC — no React, no browser APIs
    │   ├── engine.ts          # Rules: state, events, reducer, timers
    │   ├── engine.test.ts
    │   ├── words.ts           # Loads word lists, getWord, getDifficulty
    │   ├── words.test.ts      # Enforces word-list rules
    │   └── wordlists/         # level-1.txt … level-4.txt: one word per line
    ├── feel/                  # FEEDBACK: sound, motion, haptics (Phase 2A)
    │   ├── config.ts          # All feel tuning (timings, pitches, caps)
    │   ├── rules.ts           # Pure helpers (damping, budget, voice cap…) + rules.test.ts
    │   ├── audio.ts           # Synthesised sounds (Web Audio), voice cap, compressor
    │   ├── haptics.ts         # Vibration on touch devices (Android)
    │   └── useFeel.ts         # Feedback ladder, fired before paint
    ├── hooks/                 # SIDE EFFECTS
    │   ├── useInterval.ts     # 1 s safety tick
    │   └── useAnimationFrame.ts # Frame loop (performance guard)
    └── components/            # PRESENTATION ONLY
        ├── ReadyScreen.tsx
        ├── PlayScreen.tsx
        ├── PauseScreen.tsx
        ├── GameOverScreen.tsx
        └── Stat.tsx
```

### Layer Rules

| Layer | May use | Must NOT use |
|---|---|---|
| `game/` | Plain TypeScript | React, `window`, `Date.now()`, `Math.random()`, `localStorage` |
| `hooks/`, `storage.ts` | Browser APIs | Game rules |
| `components/` | Props | Game rules, browser APIs |
| `App.tsx` | Everything, to connect layers | New game rules (put them in the engine) |

> Keeping `game/` free of browser APIs is what makes it testable. Time (`now`) and randomness (`seed`) are passed **in** as event data.

---

## 4. Running, Testing & Building

| Task | Command | Notes |
|---|---|---|
| Install | `npm install` | Node 22 |
| Dev server | `npm run dev` | http://localhost:5173 |
| Unit tests | `npm test` | 31 tests, runs in seconds |
| Production build | `npm run build` | Type-checks (including tests), then outputs `dist/` |
| Size budgets | `npm run size` | After a build; fails if over budget (KiB) |
| Perf overlay | `npm run dev`, open `/?perf` | FPS, renders/s, worst frame, long tasks (dev only) |
| Preview build | `npm run preview` | Serves `dist/` locally |

**Status:** ✅ build passes · ✅ 31/31 tests pass · ✅ size budgets pass · ✅ CI configured.

**Adding words:** edit `src/game/wordlists/level-N.txt` (one word per line, `#` for comments) and run `npm test`. The tests reject anything outside a–z, the wrong length for the level, or duplicates.

---

## 5. Architecture

### 5.1 Overview

ICA follows a **"pure core, thin shell"** design:

```
          ┌────────────────────────── App.tsx (shell) ──────────────────────────┐
 keyboard │                                                                     │
 & clicks ──▶ dispatch(event{ now, seed? }) ──▶ gameReducer (pure engine) ──▶ new state
          │                                                                │     │
 50ms tick ──▶ dispatch({type:'tick', now})                               ▼     │
          │                                         ┌─────────── renders screens ┤
          │                                         │                            │
          │      effects react to state changes: ◀──┘                            │
          │        • feedbackId → sound + shake                                  │
          │        • bestCombo / sound toggle → localStorage                     │
          └─────────────────────────────────────────────────────────────────────┘
```

1. **Engine (`game/engine.ts`):** decides *what happens*. Pure function: `(state, event) → state`.
2. **Shell (`App.tsx` + hooks):** connects the engine to the browser (clock, keyboard, sound, storage).
3. **Screens (`components/`):** draw the state. No logic.

### 5.2 Screen State Machine

```
          any key / click                 Esc / PAUSE
  ready ───────────────────▶ playing ─────────────────▶ paused
    ▲                          │   ▲                      │
    │                          │   └────── RESUME ────────┘
    │      survival = 0        ▼                          │
    └──── PLAY AGAIN ──── gameover        RESTART ────────┘ (→ ready)

  The "ICA." wordmark always restarts (→ ready).
```

### 5.3 Game State (`GameState`)

| Field | Meaning |
|---|---|
| `screen` | `'ready' \| 'playing' \| 'paused' \| 'gameover'` |
| `word`, `typed` | Target word and correctly typed prefix |
| `combo`, `bestCombo` | Current and best combo |
| `wordsCompleted` | Words finished this run (drives level) |
| `correctCharacters`, `mistakes` | For accuracy |
| `health` | Survival time left (ms) |
| `comboTimer` | Time left to extend the combo (ms); 0 = no active window |
| `elapsed` | Active play time (ms), paused time excluded |
| `lastTickAt` | Last clock reading; `null` whenever the clock is stopped |
| `seed` | Random generator state |
| `feedback`, `feedbackId` | Result of the latest input; the id increments per event |
| `comboBreakId` | Increments when a live combo's window expires (drives the "crack") |
| `wrongLetter`, `lastWord` | The rejected letter and the word just completed (for the ghost and fade-out) |

### 5.4 Events (`GameEvent`)

| Event | Payload | Effect |
|---|---|---|
| `start` | `now`, `seed` | Fresh run, first word, `playing` (only from `ready`) |
| `tick` | `now` | Advance clock |
| `input` | `value`, `now` | Advance clock, then process typing |
| `pause` | `now` | Advance clock, then stop it (`lastTickAt = null`) |
| `resume` | `now` | Restart the clock from `now` |
| `restart` | — | Back to `ready`, best combo kept |

### 5.5 The Single Clock (`advance`)

All time-based values change in **one** place:

```
delta      = now − lastTickAt
health     = max(0, health − delta)        → 0 means game over
comboTimer = max(0, comboTimer − delta)    → 0 resets combo
elapsed   += delta
lastTickAt = now
```

- **Why it fixes pause by design:** while paused, `lastTickAt` is `null`, so no time is counted. Resume sets `lastTickAt = now`. There are no separate timestamps to shift.
- **Why input calls `advance` first:** combo and survival are checked at the exact moment of the keystroke, not up to 50 ms late.
- **When the clock ticks (since v0.3.0):** `nextDeadline(state)` says when something will happen on its own (survival runs out, or the combo window closes). The shell sets one timer for that moment, plus a 1 s safety tick, instead of polling every 50 ms. An idle run needs 2 ticks instead of 100 and ends in exactly the same state (tested).

### 5.6 Input Processing (`handleInput`)

```
advance(now) → still playing?
normalize: lowercase, keep a–z, trim to word length
  ├─ unchanged (space/digit)  → no change, no feedback
  ├─ wrong prefix             → mistakes+1, health −750ms, feedback 'wrong', maybe gameover
  ├─ correct, not complete    → accept, feedback 'correct' (only if a letter was added)
  └─ word complete            → combo = (comboTimer > 0 ? combo+1 : 1)
                                health = 5000, comboTimer = 3000
                                bestCombo = max, wordsCompleted+1
                                next word (new level, never the same), feedback 'complete'
```

### 5.7 Randomness

`Math.random()` would make the engine impure: React StrictMode runs reducers twice in development, and tests couldn't predict words. Instead:
- `start` receives a random `seed` from the shell.
- The engine uses **mulberry32**, a small seeded generator, and stores the updated `seed` in state.
- The same seed always gives the same word sequence, so tests are reproducible.

### 5.8 Side Effects (Shell)

| Concern | Where | How |
|---|---|---|
| Clock | `App.tsx` | One timer at `nextDeadline`, plus a 1 s safety tick (`useInterval`); time from `clock.ts` (`performance.now`) |
| Readouts | `PlayScreen.tsx` | A 20 Hz display tick writes the meter, SURVIVAL, TIME, combo fade and danger pulse straight to the DOM (no React render) |
| Feedback | `feel/useFeel.ts` | Sound, motion and haptics per feedback event and combo break, before paint; heartbeat in danger |
| Performance guard | `App.tsx` (`useAnimationFrame`) | Drops FULL effects to SUBTLE for the session on sustained sub-20 fps |
| Persistence | `storage.ts` | Best combo, sound level, effects level (errors ignored) |
| Focus | Effect on `screen` + mouse/key handlers | Keeps the hidden input focused |
| Keyboard | Effect on `screen` | Ready: any key starts. Playing: Esc pauses. Paused: Esc/Enter resumes. |
| Auto-pause | Effect on `screen` | Pauses on tab hidden / window blur; never auto-resumes |

### 5.9 Sound Map

Synthesised in `feel/audio.ts` (no audio files). Clicks are filtered noise bursts; body and pitch are short tones.

| Event | Sound |
|---|---|
| Correct key | "Thock": 8 ms band-passed noise (~4 kHz) + ~150 Hz body (40 ms); softer during fast bursts |
| Wrong key | "Thud": low-passed noise + ~95 Hz body |
| Word complete | "Chunk": noise + tone at G3, **one semitone higher per combo step** (wraps each octave) |
| Every 10th combo | Chime (880 + 1320 Hz), at most once per second |
| Combo break | "Crack": falling tone 420 → 210 Hz |
| Danger (< 1.5 s) | Heartbeat every 600 ms |

Levels: OFF / LOW / MED / HIGH (master gain 0 / 0.35 / 0.6 / 0.9); at most 6 voices at once; master compressor.

### 5.10 Persistence

| Key | Value |
|---|---|
| `ica-best-combo` | Best combo (number) |
| `ica-sound` | `'off'` / `'low'` / `'med'` / `'high'` (an old `ica-sound-enabled = 'true'` reads as `'low'`) |
| `ica-effects` | `'full'` / `'subtle'` / `'off'`; absent = follow the OS reduced-motion setting |

### 5.11 UI & Styling

Dark monochrome theme (`#090909` / `#ededed`), Manrope + DM Mono, a 2 px `survival-track` meter, `breathe` and `shake` animations, mobile breakpoint at 600 px. Keystrokes go through a hidden `.typing-input`.

---

## 6. Game Mechanics Reference

### 6.1 Constants (`src/game/engine.ts`)

| Constant | Value | Effect |
|---|---|---|
| `COMBO_WINDOW` | 3000 ms | Max gap between words to keep a combo |
| `MAX_HEALTH` | 5000 ms | Survival capacity, refilled per word |
| `WRONG_INPUT_PENALTY` | 750 ms | Survival lost per wrong key |
| `SAFETY_TICK_MS` (`App.tsx`) | 1000 ms | Re-sync tick; real ticks come from `nextDeadline` |
| `DISPLAY_TICK_MS` (`PlayScreen.tsx`) | 50 ms | Meter and readout update rate (no React render) |

Feedback tuning (timings, pitches, caps, thresholds) lives in `src/feel/config.ts`.

### 6.2 Levels (`src/game/words.ts`)

| Words completed | Level | Word length |
|---|---|---|
| 0–11 | 1 | 3–7 |
| 12–29 | 2 | 5–8 |
| 30–59 | 3 | 9–12 |
| 60+ | 4 | 13+ |

> The length ranges are **enforced by tests**. Adding a word that breaks them fails CI.

---

## 7. Issue Audit & Status

| # | Severity | Issue | Status |
|---|---|---|---|
| 1 | 🔴 | Build failed (`TS6133` unused `comboRemaining`) | ✅ Fixed (Phase 0) |
| 2 | 🔴 | No `.gitignore`; 17 MB `ICA.zip` in git history | ✅ `.gitignore` added · ⏸ history purge deferred (needs force-push; optional) |
| 3 | 🟠 | Pause counted paused time; combo lost on resume | ✅ Fixed (Phase 0), redesigned out (Phase 1), regression test |
| 4 | 🟠 | Mobile keyboard may not open (hidden input) | ⏳ Phase 2 |
| 5 | 🟡 | Flat 5 s refill makes level 4 very hard | ⏳ Phase 2 (balance decision) |
| 6 | 🟡 | Duplicate word; lengths not progressive | ✅ Fixed (Phase 0), enforced by tests |
| 7 | 🟡 | Sparse game-over screen; non-letter keys played tick | ✅ Tick fixed (Phase 1) · ⏳ game-over summary in Phase 2 |
| 8 | 🟡 | Remote Google Fonts (render-blocking, privacy) | ⏳ Phase 2 |
| 9 | ⚪ | Monolithic component, no tests, hard-coded version, misleading CSS names | ✅ Fixed (Phase 1) |
| 10 | 🟠 | *New:* Enter/Space on a focused button restarted the game right after starting | ✅ Fixed (Phase 1) |
| 11 | 🟠 | *New:* `localStorage` errors could crash the app on load | ✅ Fixed (Phase 1) |

---

## 8. Implementation Log

### 8.1 Phase 0: Make it Deployable ✅ (commit `127e953`)

| Change | Why |
|---|---|
| Removed unused `comboRemaining` | It broke `npm run build`, which blocks any deployment |
| Shift timers on resume | Paused time was counted as play time |
| Deduplicated and re-bucketed words | Levels should mean "longer words" |
| `.gitignore`, `.nvmrc` | Keep dependencies/build output out of git; pin Node for CI and hosting |

### 8.0 Later releases

R0 (v0.2.1, Foundation) and R1 (v0.3.0, Typing Impact) are logged in [`CHANGELOG.md`](../CHANGELOG.md), with status and measurements in [`IMPROVEMENT-PLAN.md`](./IMPROVEMENT-PLAN.md) §5.1 and §6.1.

### 8.2 Phase 1: Refactor & Tests ✅ (commits `3a0a79d`, `d9228bc`)

#### Why Phase 1 was needed

All logic lived in one 340-line component. That made two bugs easy to introduce and hard to notice: the v0.1.1 build break and the pause bug. Every Phase 2 feature would have added to the same file. Phase 1 **doesn't change what players see**. It makes later changes safe and fast.

#### What was done

| Change | Files | Benefit |
|---|---|---|
| Pure game engine (reducer) | `game/engine.ts` | All rules in one testable place |
| Single clock (`advance`) | `game/engine.ts` | Pause bugs are impossible by design, not just patched |
| Seeded random generator | `game/engine.ts`, `game/words.ts` | Deterministic, StrictMode-safe, testable |
| Hooks for effects | `hooks/useInterval.ts`, `hooks/useSound.ts` | Browser concerns isolated |
| Safe storage | `storage.ts` | No crash when storage is blocked |
| Screen components | `components/*` | `App.tsx` reduced to wiring |
| Unit tests (30) | `game/*.test.ts` | Rules verified automatically |
| CI workflow | `.github/workflows/ci.yml` | Broken code can't silently reach `main` |
| Version from `package.json` | `vite.config.ts`, `vite-env.d.ts` | One source of truth |
| CSS rename `combo-track` → `survival-track` | `styles.css`, `PlayScreen.tsx` | Names match purpose |

#### Fixes found during the refactor

| Fix | Cause |
|---|---|
| Enter/Space no longer restarts right after starting | The keydown started the game, then the browser "clicked" the still-focused wordmark (restart). Fixed with `preventDefault()` on the start key. |
| Non-letter keys no longer play the tick | Old code played the sound before checking that anything changed |
| Combo check uses the exact keystroke time | Input now advances the clock first, instead of relying on the last 50 ms tick |

#### Risk mitigations applied

| Risk | Mitigation |
|---|---|
| Behaviour drift | Tests encode the original rules (penalty, refill, combo window, level thresholds). Markup and CSS classes are copied unchanged. |
| Timing bugs | One clock function; pause regression test; tests control time explicitly (`now` is input), so no flaky timers |
| Over-engineering | No new runtime dependencies; only Vitest added (dev). No state library. |
| Big-bang change | Separate commits per step on branch `phase-1-refactor`; each builds and passes tests |
| Scope creep | Gameplay, visuals and balance deliberately unchanged; Playwright and `requestAnimationFrame` deferred |

#### Deferred from Phase 1 (intentionally)

| Item | Reason |
|---|---|
| Playwright end-to-end test | Adds a browser toolchain; engine tests cover the rules. Revisit with Phase 2 UI changes. |
| `requestAnimationFrame` loop | 50 ms ticks are adequate; the change has no visible benefit yet |
| ESLint | Not needed for correctness now; TypeScript strict mode and tests cover the main risks |

#### Manual verification still recommended

The engine is covered by tests, but browser behaviour (focus, sound, shake) has not been tested automatically. Before merging, play one session: start, type, make mistakes, pause/resume, let the meter run out, play again, toggle sound.

---

## 9. Roadmap

### Phase 2: Polish (~1.5–2 weeks)

| Track | Focus | Effort | Order |
|---|---|---|---|
| **2A: Typing Impact** | Every keystroke feels physical and weighty | ~5 days | First: 2B builds on its effects and settings |
| **2B: Product Polish** | Summary screen, balance, mobile, fonts, sharing | ~4–5 days | Second |

---

### Phase 2A: Typing Impact

> **Status: implemented in v0.3.0 (R1).** Measured results and the places where the build differs from this plan (for measured reasons): [`IMPROVEMENT-PLAN.md` §6.1–6.2](./IMPROVEMENT-PLAN.md). Step 7 (playtest and tuning) is still open.

**Goal:** keystrokes that *land*: a press with weight, words that clunk into place, combos that build tension. The constraint is ICA's identity, *"a quiet place to find your rhythm"*: **weight, not noise.**

#### 2A.1 Why typing feels light today

| Cause | Fix |
|---|---|
| Sine-wave beeps sound like UI alerts, not keys | Synthesised "thock": noise click + low body tone |
| Sound plays one frame late (`useEffect` runs after paint) | Fire effects in `useLayoutEffect`, before paint |
| Letters change colour but don't *move* | A small press animation per letter |
| Every success gets the same response | An escalation ladder (2A.3) |

#### 2A.2 Design Rules

1. **Input is sacred:** no effect delays, hides or blocks typing. The next word accepts keys on the same frame.
2. **Latency over richness:** an instant simple click beats a rich sound arriving late.
3. **Escalate:** response size matches significance (keystroke < word < milestone).
4. **Vary:** small random pitch/volume changes, so the same sound never repeats exactly.
5. **Restrain:** monochrome, short (≤120 ms), small (≤3 px).
6. **Opt-out everywhere:** reduced motion respected; every layer can be turned off.

#### 2A.3 Feedback Ladder

| Tier | Event | Sound | Visual | Haptic* |
|---|---|---|---|---|
| 1 | Correct key | "Thock": ~8 ms noise click + ~150 Hz body, ±4% pitch | Letter brightens (~90 ms); during relaxed typing it also presses 2 px and the word dips 1 px | 8 ms |
| 1 | Wrong key | Dull low-passed thud | Short shake; wrong letter shown faint and struck through, then drops | 20 ms |
| 2 | Word complete | Deeper "chunk"; pitch **rises one semitone per combo step** | The finished word fades and lifts 3 px while the next appears at once; meter refills with a 50 ms glow hold | 15 ms |
| 2 | Combo +1 / break | Break: soft falling "crack" | Combo number pops / drops and dims | — |
| 3 | Milestone (every 10) | Layered chime | 3 px stage kick + one soft meter glow | 30 ms |
| — | Danger (< 1.5 s left) | Quiet heartbeat (~1 per 600 ms) | Meter pulses | — |

\*Android only; iOS Safari does not support vibration.

#### 2A.4 Risk-Resolving Design

Each risk has a safeguard **built into the effect system**, not left to later tuning.

| Risk | Built-in safeguard | How it behaves |
|---|---|---|
| **Overstimulation**, clashing with the "quiet" identity | **Cadence damping** | Tier-1 effects scale down as typing speeds up (fast typists get a smooth "purr", not a rattle). Tiers 2–3 keep full strength, so big moments stay big. |
| | **Effect budget** | At most one tier-3 effect per second; overlapping requests are merged, never stacked. |
| **Added latency** | **Latency budget**: effects fire before paint | Key → sound and key → visual within one frame (~16 ms). **As built:** no compositor animations while typing (they delayed keystrokes, measured); effects use colour and `top`/`left` on small elements; per-key motion runs only during relaxed typing. |
| | **Performance guard** | If 6 frames in a row take > 50 ms (sustained sub-20 fps), effects drop to SUBTLE for the session. (Not 32 ms: that is a normal frame on 30 Hz screens.) |
| **Audio fatigue / harshness** | **Voice limit + compressor** | At most 6 sounds at once (the oldest is cut). A master compressor prevents clipping during fast bursts. Volume is low by default, with LOW / MED / HIGH steps. |
| | **Variation** | Random pitch (±4%) and volume (±10%) on every key. |
| **Motion sickness** | **Reduced motion → SUBTLE** | Follows the OS setting: no shake, kick or squash; brightness and colour cues remain. |
| | **Local motion only** | Only the word area moves, never the whole page. Movement is capped at 3 px. |
| **Photosensitivity** | **No hard flashes** | Glows are low-contrast colour changes. Never more than 3 flashes per second (WCAG 2.3.1). |
| **Readability** | **Untyped letters stay still** | Only the just-typed letter animates. The next word appears instantly, so it is never hidden. |
| **Browser audio quirks** (Safari starts audio suspended) | **Unlock on first key** | The first key press (a user gesture) starts audio. Audio resumes after tab switches. If it still fails, the game continues silently with no errors. |
| **Uneven haptics** | **Progressive enhancement** | Feature-checked; does nothing where unsupported. Nothing depends on it. |
| **Low-end devices** | **CSS-only effects** | No canvas or particles in 2A; the performance guard covers the rest. Test on one mid-range Android. |
| **Scope creep** | **Fixed scope + time-box** | Only the ladder above, 5 days. Extras go to 2A.8. |

#### 2A.5 Player Controls

| Control | Options | Default |
|---|---|---|
| **EFFECTS** (shown as `FX`) | FULL / SUBTLE / OFF | FULL; SUBTLE if the OS asks for reduced motion |
| **SOUND** | OFF / LOW / MED / HIGH | ⚠️ **Decision needed:** currently OFF, which hides most of 2A. Proposed: LOW, starting on the first key press. |

Both are saved via `storage.ts` and shown in the top bar.

#### 2A.6 Technical Plan

| Piece | Location | Purpose |
|---|---|---|
| Engine additions | `game/engine.ts` (+ tests) | `comboBreakId`, `wrongLetter`, `lastWord`, `nextDeadline` |
| Sound voices + voice limit + compressor | `src/feel/audio.ts` | Generated in code; no audio files, bundle size unchanged |
| Event → effect mapping, damping, budget, perf guard | `src/feel/useFeel.ts` | One place for all feel logic (`useLayoutEffect`) |
| Haptics | `src/feel/haptics.ts` | `navigator.vibrate?.()` wrapper |
| Tuning values | `src/feel/config.ts` | All timings, pitches, caps: tune by ear, no logic edits |
| Animations | `styles.css`, `PlayScreen.tsx`, `useFeel.ts` | Keyed spans replay short CSS colour animations; motion uses Web Animations on `top`/`left` |

`useSound.ts` was replaced by `src/feel/`.

#### 2A.7 Build Order & Done Criteria

| Step | Work | Done when |
|---|---|---|
| 0 | **Render pipeline first** ([`IMPROVEMENT-PLAN.md`](./IMPROVEMENT-PLAN.md) §4, P4–P5): stop 20 Hz React renders; meter on `transform` | Idle renders ≈ 0/s; meter still smooth |
| 1 | Move effects before paint; measure latency | Performance trace shows key → sound/visual within one frame |
| 2 | Sound voices, voice limit, compressor | Fast typing (100+ WPM burst) sounds smooth, with no clipping |
| 3 | Letter press, wrong-letter ghost, word transition | No visible input delay; untyped letters never move |
| 4 | Combo pop/break/milestone + effect budget | `comboBreak` test passes; tier 3 never stacks |
| 5 | Danger state | The heartbeat is noticeable but not irritating over 5 minutes |
| 6 | Controls, reduced motion, haptics, perf guard | OS reduced motion → SUBTLE verified; throttled CPU → auto-SUBTLE |
| 7 | Playtest & tune `config.ts` | 3+ players prefer it over v0.2.0 in a side-by-side test; no fatigue complaints |

#### 2A.8 Out of Scope (future)
Sound packs, particles, reactive backgrounds or music.

#### 2A.9 Research Basis

| Principle | Source |
|---|---|
| Juice and layered feedback turn the same mechanics into satisfaction (Vlambeer, *The Art of Screenshake*) | [Wayline](https://www.wayline.io/learn/game-feel/1), [GMTK](https://amara.org/v/C3BGA) |
| Overused shake numbs players, so scale feedback to significance | [Juice checklist](https://gamejuice.pages.dev/articles/game-juice-checklist-30-techniques), [itch.io](https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects) |
| Typing games depend on latency and per-keystroke feedback | [DEV](https://dev.to/clackpit_dev/i-built-a-real-time-typing-game-with-no-traditional-backend-heres-the-architecture-513h), [itch.io](https://itch.io/post/1722211) |
| Clear error feedback stops key-hammering | [DEV](https://dev.to/clackpit_dev/why-i-built-forced-correction-into-my-typing-game-and-why-monkeytype-got-it-wrong-2n8l) |
| Clicks = short filtered noise with exponential decay, not sine tones | [UI sound guide](https://www.ui-skills.com/skills/raphaelsalaja/generating-sounds-with-ai) |
| Low-latency Web Audio (`latencyHint`) | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioContextOptions) |
| Vibration: Chromium only; not in iOS Safari | [caniuse](https://caniuse.com/mdn-api_navigator_vibrate), [W3C](https://w3c.github.io/vibration/reports/implementation.html) |
| Motion must be possible to turn off (WCAG 2.3.3) | [W3C C39](https://w3.org/WAI/WCAG22/Techniques/css/C39), [Deque](https://dequeuniversity.com/resources/wcag2.1/2.3.3-animations-from-interactions) |

> Numbers such as click length and filter ranges come from practitioner guides. They are starting points, finalised by playtesting.

---

### Phase 2B: Product Polish → moved to the Improvement Plan

The original 2B list has been expanded and re-sequenced into releases in [`IMPROVEMENT-PLAN.md`](./IMPROVEMENT-PLAN.md):

| Original 2B item | Now in |
|---|---|
| Fonts (self-host) | **R0** (v0.2.1) |
| Favicon / Open Graph / manifest | **R0** (identity assets); installable manifest optional in **R5** |
| Game-over summary, balance, mobile input, accessibility basics, E2E test | **R2** (v0.4.0) |
| Share | **R4** (v0.6.0), optional |

New items (auto-pause, readability, instant replay, personal bests, word pools, daily run) are described there, together with the identity guardrails every feature must pass.

---

### Phase 3: Optional Backend

Leaderboards (Supabase/Firebase), auth, privacy-friendly analytics. Client-submitted scores can be faked, so add server-side checks or keep leaderboards casual.

---

## 10. Deployment Plan (Public Domain)

### 10.1 Model
Static site: `npm run build` → `dist/`. No server needed.

### 10.2 Hosting: Netlify (current)

ICA is deployed on **Netlify**. The dashboard settings (build command, publish directory, Node version, production branch) are **not yet recorded in the repo**; capturing them is task R0.1 in the Improvement Plan.

| Netlify feature | Use for ICA |
|---|---|
| Git-connected builds | Each push to the production branch builds and deploys |
| Deploy Previews | A URL per pull request, for phone testing and playtesters |
| Failed build keeps the last good deploy live | Safe with tests in the build command |
| Instant rollback | Publish an earlier deploy if a release misbehaves |
| Custom domain + automatic HTTPS | Launch (R5) |

### 10.3 Configuration (`netlify.toml`, added in R0)

`netlify.toml` versions the build (`npm test && npm run build && npm run size`, Node 22) and headers (immutable caching for `/assets/*` and `/fonts/*`, CSP, `nosniff`, referrer and permissions policies). It **overrides the dashboard's build settings**, so compare the two before merging (task R0.1). Background and rollout: [`IMPROVEMENT-PLAN.md` §12](./IMPROVEMENT-PLAN.md).

### 10.4 CI (in place)
`.github/workflows/ci.yml` runs `npm ci → npm test → npm run build → npm run size` on every push to `main` and every PR. Turn on GitHub branch protection for `main` and require this check.

### 10.5 Pre-Launch Checklist
- [x] Build passes locally and in CI
- [x] `.gitignore` in place
- [x] Unit tests pass
- [ ] Manual play-through (Section 8.2)
- [ ] Tested on Chrome, Firefox, Safari and one mobile device
- [ ] Favicon, Open Graph tags
- [ ] Headers in `netlify.toml` deployed and verified
- [ ] Custom domain on HTTPS
- [ ] Lighthouse review

### 10.6 Release Workflow
```
branch → PR → CI (tests + build) + Netlify Deploy Preview → review → merge → auto-deploy (rollback = publish previous deploy)
```
For each release, update `CHANGELOG.md`, bump `version` in `package.json` (the footer updates automatically), and tag (`git tag v0.2.0`).

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **Combo** | Consecutive words completed with less than 3 s between each |
| **Survival meter** | 5 s draining bar; refilled per word, reduced by mistakes |
| **Level** | Difficulty tier 1–4, picks the word pool |
| **Engine** | `game/engine.ts`, the pure module that holds all game rules |
| **Reducer** | Function `(state, event) → newState` with no side effects |
| **Event** | Something that happened (`tick`, `input`, `pause`, …) sent to the reducer |
| **Pure function** | Same input always gives the same output; touches nothing outside itself |
| **Seed / PRNG** | Starting value for a pseudo-random number generator; same seed gives the same sequence |
| **Side effect** | Anything touching the outside world: sound, storage, timers, DOM |
| **Regression test** | A test that makes sure a fixed bug never returns |
| **CI** | Continuous Integration: automatic checks on every push/PR |
| **StrictMode** | React development mode that double-runs some functions to expose impurity |
