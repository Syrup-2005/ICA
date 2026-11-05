# Changelog

All notable changes to ICA are recorded here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

## [Unreleased]

### Docs
- Added `docs/ROADMAP.md`: overview of status, next steps, milestones, open decisions and dependencies.
- Phase 2 plan split into **2A: Typing Impact** (researched game-feel plan: feedback ladder, audio synthesis, latency, accessibility, risks) and **2B: Product Polish**.
- Phase 2A rewritten into a tighter plan with risk-resolving design built into the effect system (cadence damping, effect budget, performance guard, voice limit + compressor, reduced-motion fallback, flash limits), player controls, and done criteria per step.

## [0.2.0] — 2026-11-05

Covers **Phase 0** (make it deployable) and **Phase 1** (refactor and tests). Gameplay rules and visuals are unchanged.

### Fixed
- **Build failure:** removed unused `comboRemaining` state (`TS6133`), which stopped `npm run build`.
- **Pause bug:** paused time no longer counts toward TIME, survival or the combo window, so the combo survives a pause.
- **Restart on start:** pressing Enter/Space on the ready screen while a button had focus (e.g. after clicking the **ICA.** wordmark) started and then immediately restarted the game.
- **False sound feedback:** non-letter keys (space, digits) no longer play the "correct" tick.
- **Crash risk:** `localStorage` access is now guarded; the game runs when storage is blocked (privacy modes).
- **Word lists:** removed duplicate `based`; words re-bucketed strictly by length (L1 3–7, L2 5–8, L3 9–12, L4 13+).

### Changed
- Game rules moved out of `App.tsx` into a pure engine (`src/game/engine.ts`). One clock function drives all timers.
- Word selection uses a seeded random generator, so the engine is deterministic and testable.
- `App.tsx` split into screen components (`src/components/`) and hooks (`src/hooks/`).
- `src/words.ts` moved to `src/game/words.ts`.
- CSS classes `combo-track*` renamed to `survival-track*` to match their purpose.
- Footer version is read from `package.json` at build time instead of being hard-coded.

### Added
- Vitest unit tests (30), including a regression test for the pause bug. Run with `npm test`.
- GitHub Actions CI: runs tests and the build on every push to `main` and every pull request.
- `.gitignore` and `.nvmrc` (Node 22).
- Project guide: `docs/ICA-Project-Guide.md`.

## [0.1.1] — 2026-11-04
- Survival meter: drains continuously, refilled per word, reduced by wrong input; game over at zero.

## [0.1.0] — 2026-11-04
- Initial MVP: endless typing, levels, combo window, best combo, sound, pause/restart.
