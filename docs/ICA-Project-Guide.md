# ICA — Typing Arcade: Project Guide

> **Scope:** codebase guide, architecture, issue audit, implementation log, roadmap and deployment plan.
> **Version documented:** v0.2.0 (Phase 0 and Phase 1 complete)
> **Last updated:** 2026-11-05 · Change history: [`CHANGELOG.md`](../CHANGELOG.md)

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
├── .github/workflows/ci.yml   # CI: npm ci → npm test → npm run build
├── .gitignore                 # node_modules, dist, zips, env files
├── .nvmrc                     # Node 22 (used by CI and hosting)
├── CHANGELOG.md               # Version history
├── README.md
├── docs/ICA-Project-Guide.md  # This document
├── index.html                 # HTML shell → /src/main.tsx
├── package.json               # Scripts: dev, build, preview, test
├── vite.config.ts             # React plugin + __APP_VERSION__ injection
├── tsconfig*.json             # TypeScript configs (app + node)
└── src/
    ├── main.tsx               # Mounts <App/>
    ├── App.tsx                # Wiring: state ↔ effects ↔ screens
    ├── storage.ts             # Safe localStorage read/write
    ├── styles.css             # All styles
    ├── vite-env.d.ts          # Type for __APP_VERSION__
    ├── game/                  # PURE LOGIC — no React, no browser APIs
    │   ├── engine.ts          # Rules: state, events, reducer, timers
    │   ├── engine.test.ts
    │   ├── words.ts           # Word pools, getWord, getDifficulty
    │   └── words.test.ts
    ├── hooks/                 # SIDE EFFECTS
    │   ├── useInterval.ts     # Game clock tick
    │   └── useSound.ts        # Web Audio tones
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
| Unit tests | `npm test` | 30 tests, runs in seconds |
| Production build | `npm run build` | Type-checks (including tests), then outputs `dist/` |
| Preview build | `npm run preview` | Serves `dist/` locally |

**Status:** ✅ build passes · ✅ 30/30 tests pass · ✅ CI configured.

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
| Clock | `useInterval` | Dispatches `tick` every 50 ms while `playing` |
| Sound | `useSound` + effect on `feedbackId` | One tone per feedback event |
| Shake | Effect on `feedbackId` | 180 ms CSS shake on `'wrong'` |
| Persistence | Effects on `bestCombo`, `soundEnabled` | `storage.ts` (errors ignored) |
| Focus | Effect on `screen` + mouse/key handlers | Keeps the hidden input focused |
| Keyboard | Effect on `screen` | Ready: any key starts. Playing: Esc pauses. |

### 5.9 Sound Map

| Feedback | Frequency | Duration |
|---|---|---|
| `correct` | 440 Hz | 25 ms |
| `wrong` | 145 Hz | 80 ms |
| `complete` | 620 Hz | 110 ms |
| `complete` on every 10th combo | 880 Hz | 110 ms |

### 5.10 Persistence

| Key | Value |
|---|---|
| `ica-best-combo` | Best combo (number) |
| `ica-sound-enabled` | `'true'` / `'false'` |

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
| `TICK_MS` (`App.tsx`) | 50 ms | Clock update rate |

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

### Phase 2: Product Polish (~1 week)

| Area | Task | Issue |
|---|---|---|
| Game-over summary | Words, best combo, accuracy, time, WPM, "new best!" | #7 |
| Balance | Survival refill scales with word length (engine constant + test) | #5 |
| Mobile | Visible tap area so the keyboard opens | #4 |
| Fonts | Self-host (`@fontsource/*`) | #8 |
| Accessibility | `prefers-reduced-motion`, `aria-live` word, focus outlines | — |
| Sharing | Favicon, Open Graph image, web manifest | — |
| E2E | One Playwright smoke test | Deferred from Phase 1 |

> With the engine in place, most Phase 2 rule changes are a constant or a few lines in `engine.ts` plus a test.

### Phase 3: Optional Backend

Leaderboards (Supabase/Firebase), auth, privacy-friendly analytics. Client-submitted scores can be faked, so add server-side checks or keep leaderboards casual.

---

## 10. Deployment Plan (Public Domain)

### 10.1 Model
Static site: `npm run build` → `dist/`. No server needed.

### 10.2 Hosting Options

| Option | Cost | HTTPS | Custom domain | PR previews |
|---|---|---|---|---|
| **Cloudflare Pages** ⭐ | Free | Auto | Easy | Yes |
| Netlify / Vercel | Free tier | Auto | Easy | Yes |
| GitHub Pages | Free | Auto | Yes | No (needs `base` unless custom domain) |

### 10.3 Cloudflare Pages Steps

1. Merge `phase-1-refactor` into `main` and push to GitHub. CI runs automatically.
2. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → select the repo.
3. Build settings:

   | Setting | Value |
   |---|---|
   | Build command | `npm run build` |
   | Output directory | `dist` |
   | Node version | read from `.nvmrc` (22); or set `NODE_VERSION=22` |

4. Each push to `main` deploys to `https://<project>.pages.dev`; PRs get preview URLs.
5. **Custom domain:** Pages project → Custom domains → add `ica.yourdomain.com`. If DNS is on Cloudflare, records are automatic; otherwise add `CNAME ica → <project>.pages.dev`. HTTPS is automatic.
6. **Headers:** add `public/_headers`:
   ```
   /assets/*
     Cache-Control: public, max-age=31536000, immutable

   /*
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
     X-Frame-Options: DENY
     Content-Security-Policy: default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'
   ```
   (Remove the Google domains once fonts are self-hosted.)

### 10.4 CI (in place)
`.github/workflows/ci.yml` runs `npm ci → npm test → npm run build` on every push to `main` and every PR. Turn on GitHub branch protection for `main` and require this check.

### 10.5 Pre-Launch Checklist
- [x] Build passes locally and in CI
- [x] `.gitignore` in place
- [x] Unit tests pass
- [ ] Manual play-through (Section 8.2)
- [ ] Tested on Chrome, Firefox, Safari and one mobile device
- [ ] Favicon, Open Graph tags
- [ ] `_headers` deployed and verified
- [ ] Custom domain on HTTPS
- [ ] Lighthouse review

### 10.6 Release Workflow
```
branch → PR → CI (tests + build) + preview URL → review → merge → auto-deploy
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
