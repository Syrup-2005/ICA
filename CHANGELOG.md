# Changelog

All notable changes to ICA are recorded here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

## [Unreleased]

**Polish: calmer feel, Zen mode, run results** (add-ons A1, A2, A5 and R2.1–R2.3, plus parts of R2.4/R2.5/R2.6/R2.11/R2.12).

### Added
- **Zen mode** (choose ARCADE or ZEN on the start screen): no timer, no failure, endless. Mistakes cost nothing and quietly reset the streak; words stay at comfortable lengths (3–8 letters). Pause with Esc, stop any time with END (top bar) or END SESSION (pause screen). A soft synthesised ambient pad plays while a session runs (toggle on the start screen; fades out on pause and end).
- **Typing rhythm line** (A5, Zen): a thin line under the word widens as the gaps between your keystrokes even out (steady / settling / finding). Pauses to think start a new phrase rather than counting against you. Drawn by the 20 Hz display tick, no animations.
- **Key sound choice** (A2), on the start screen before you play: SOFT (muted, cushioned), THOCK (deep mechanical), WOOD (warm block), PEBBLE (small glassy click). Picking one plays a short preview. Keyboard: ← → mode, ↑ ↓ sound.
- **Result screen** (R2.1): words, best combo (Zen: longest streak), accuracy, time, WPM (— for runs under 5 s), plus "New best." or "N words from your best". Arcade bests are saved as versioned `ica-stats` (validated and clamped on read).
- **Instant replay** (R2.2): Enter/Space plays again (same mode), after a 0.7 s lock so a fast typist can't skip the result by accident. Esc goes to the menu.

### Changed
- **Words are shown as keycaps:** typed keys sit pressed in and lit, the next key is outlined. Cell size follows word length, so 16-letter words fit a 320 px screen (R2.11).
- **Calmer sounds:** combo notes climb a major pentatonic scale over two octaves (was semitones), a small synthesised room adds space, the combo break is a soft falling pair of notes, and the milestone chime rings longer. In Zen a wrong key is a soft tap with no shake.
- **Sound on by default at LOW** (A1 / decision D2) for new players; a saved choice, including a v0.2 "off", is kept.
- Readability (R2.5): small labels and footers raised to `#6a6a6a`–`#8a8a8a` and 10 px minimum; buttons ≥ 44 px tall (R2.12); input `autoCorrect="off"` and 16 px (no iOS focus zoom); `100dvh` layout.
- Esc/Enter resume (R2.3) also covers Zen; it was already done for Arcade in R0.

### Size and tests
- JS 75.8 → 79.9 KiB gzip (budget 85). Tests 57 → 78.

## [0.3.0] — 2026-11-06

**R1 "Typing Impact"** (guide §9 · Phase 2A; status and measurements in `docs/IMPROVEMENT-PLAN.md` §6.1). Game rules are unchanged.

### Added
- **Feedback ladder:** key "thock", wrong-key "thud", word "chunk" whose pitch climbs with the combo, milestone chime (every 10), combo-break "crack", heartbeat below 1.5 s survival. All synthesised (no audio files), with a 6-voice cap, a compressor and slight per-key variation.
- **Visual feedback:** typed letter brightens (and presses during relaxed typing), the rejected letter appears struck through and fades, the finished word fades away, the meter glows on refill and pulses in danger, the COMBO number pops on +1, dims on a break and fades as its 3 s window closes.
- **Controls:** `SOUND OFF/LOW/MED/HIGH` (default OFF; a saved v0.2 "on" becomes LOW) and `FX FULL/SUBTLE/OFF` (default follows the OS reduced-motion setting). SUBTLE removes all movement; OFF removes all visual effects and haptics.
- **Haptics** on touch devices that support vibration (Android).
- **Safeguards:** cadence damping (per-key motion steps aside during fast bursts), at most one milestone effect per second, and a performance guard (sustained sub-20 fps → SUBTLE for the session).

### Changed
- **The clock ticks only when something happens** (`nextDeadline`: survival runs out or the combo window closes), plus a 1 s safety tick, instead of every 50 ms. An idle run takes 2 ticks instead of 100 and ends in exactly the same state (tested).
- **Idle React renders 20/s → 1/s:** the meter, SURVIVAL, TIME, combo fade and danger pulse are written by a light 20 Hz display tick, not by React.
- Effects animate colour and `top`/`left`, not `transform`/`opacity`. Measured: running compositor animations delayed keystroke updates by about a frame under load.
- Wrong-key shake reduced from 5 px to 3 px (movement cap).

### Measured (Chrome, Event Timing: key → next paint, median / p95)
- FX OFF matches v0.2.1 (e.g. 32/40 ms at 4× CPU, 24/32 ms at 1×). FULL and SUBTLE add at most one 8 ms step at the median and 8–16 ms at p95.
- JS 72.4 → 75.8 KiB gzip (budget 85). Tests 31 → 57.

### Not done (needs owner input)
- Sound default (D2): built as OFF.
- Human playtest and tuning of `src/feel/config.ts` (Phase 2A step 7); real-device check (iOS sound, Android haptics).
- Proposed add-ons A1–A6 are listed for discussion in `docs/IMPROVEMENT-PLAN.md` §6.3 (none built).

### Docs
- Guide: new **Feedback Layer** section (§5.12): how the feedback flows, the settings, the rules for adding or changing an effect, and the tuning workflow.
- Guide brought up to date with R0/R1: overview, tech stack (self-hosted fonts, synthesised audio, Netlify), architecture diagram, layer rules, styling notes, test counts, issue statuses.
- Plan: gaps fixed in R0/R1 marked (§2.2). Roadmap: status and "where we are" updated to v0.3.0.

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
