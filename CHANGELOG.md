# Changelog

All notable changes to ICA are recorded here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

## [0.2.1] — 2026-11-06

**R0 "Foundation"** from `docs/IMPROVEMENT-PLAN.md`. Gameplay rules are unchanged.

### Added
- **Auto-pause** when the tab is hidden or the window loses focus. It never auto-resumes; **Esc**, or **Enter** when no button has focus, resumes. The pause screen shows the hint.
- **Favicon** (SVG), 180 px **touch icon** and a 1200×630 **link-preview card** (Open Graph / Twitter tags), rendered from the game's own fonts and colours. `og:image` is made absolute at build time from Netlify's `URL`.
- **`netlify.toml`**: build runs tests, build and size budgets (a failure keeps the last good deploy live); immutable caching for `/assets/*` and `/fonts/*`; CSP and security headers.
- **Size budgets** (`npm run size`, in KiB): JS ≤ 85, fonts ≤ 45, first load ≤ 130. Run in CI and in the Netlify build.
- **Dev-only performance HUD** (`npm run dev`, open `/?perf`): FPS, React renders/s, worst frame, long tasks. Not included in production builds.

### Changed
- **Word lists are plain-text files** (`src/game/wordlists/level-1.txt` … `level-4.txt`, one word per line, `#` comments). Same words, same order; rules still enforced by tests.
- **Fonts are self-hosted:** Manrope (variable) and DM Mono 400, Latin subset, preloaded; OFL licences in `/fonts`. No third-party requests remain.
- Game timing uses a **monotonic clock** (`performance.now()`), so system clock changes can't drain survival.

### Fixed
- Switching tabs or apps for a few seconds could end a run.
- Console 404 for the missing favicon.

### Measured (real Chrome; 150 ms RTT, 1.6 Mbps, 4× CPU; median of 3)
- First/largest contentful paint 1,940 → 1,884 ms (first cold-DNS run: 2,324 → 1,840 ms).
- Third-party origins 2 → 0; console errors 1 → 0; CSP violations 0.
- Transfer unchanged at ≈ 104 KiB (same font bytes, now self-hosted).
- Unchanged, planned: 20 React renders/s while idle (R1) and 16-letter words clipped at 320/360 px (R2).

### Not done (needs owner input)
- R0.1 Netlify dashboard audit (compare with `netlify.toml` before merging).
- R0.7 Analytics (tool not chosen).

### Docs
- Improvement Plan: R0 status (§5.1) and measured baseline (§4.1); first-load budget corrected to 130 KiB gzip; font finding corrected (unused weights were never downloaded).
- Added `docs/IMPROVEMENT-PLAN.md`: UX and engagement plan (releases R0–R6) with identity guardrails, UX gaps found in the code, Netlify operations, proposed `netlify.toml`, measurement approach, risk register and decisions. Plan only, nothing implemented.
- Added a **Performance, Efficiency & Usability workstream** to the plan (§4): measured v0.2.0 baseline, budgets, efficiency tasks P1–P11 and usability tasks. Measured: JS 72.1 kB gzip (React is 67.5 kB of it), ≈ 39 kB of fonts if self-hosted, 20 React renders/s by code. Found: 16-letter words overflow 320/360 px screens (computed from the font's metrics) and untyped letters have 2.67:1 contrast.
- Hosting documented as **Netlify** (earlier drafts said Cloudflare Pages); Phase 2B items re-sequenced into the plan; roadmap rewritten to match.
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
