# ICA: Improvement Plan (UX & Player Engagement)

> **Baseline:** v0.2.0, live on Netlify · **Scope:** improvements, polish and engagement features after Phase 1
> **Companions:** [`ROADMAP.md`](./ROADMAP.md) (overview) · [`ICA-Project-Guide.md`](./ICA-Project-Guide.md) (architecture, Phase 2A detail) · [`../CHANGELOG.md`](../CHANGELOG.md)
> **Last updated:** 2026-11-06 · **Status:** R0 (v0.2.1) and R1 (v0.3.0) implemented on branches `r0-foundation` and `r1-typing-impact`. Open owner items: R0.1, R0.7, D2 (§5.1, §6.1). R2 onward is plan only.

---

## Contents

1. [The Idea to Protect](#1-the-idea-to-protect)
2. [Starting Point](#2-starting-point)
3. [Release Plan at a Glance](#3-release-plan-at-a-glance)
4. [Performance, Efficiency & Usability Workstream](#4-performance-efficiency--usability-workstream)
5. [R0 · v0.2.1 Foundation](#5-r0--v021-foundation)
6. [R1 · v0.3.0 Typing Impact](#6-r1--v030-typing-impact)
7. [R2 · v0.4.0 Run Experience](#7-r2--v040-run-experience)
8. [R3 · v0.5.0 Content & Variety](#8-r3--v050-content--variety)
9. [R4 · v0.6.0 Return Loops (optional)](#9-r4--v060-return-loops-optional)
10. [R5 · v1.0.0 Launch](#10-r5--v100-launch)
11. [R6 · Online Features (gated)](#11-r6--online-features-gated)
12. [Netlify Operations](#12-netlify-operations)
13. [Measuring Engagement](#13-measuring-engagement)
14. [Risk Register](#14-risk-register)
15. [Decisions Needed](#15-decisions-needed)
16. [Not Planned](#16-not-planned)

---

## 1. The Idea to Protect

ICA is **a quiet, endless typing arcade**: one word at a time, monochrome, no backend, *"A quiet place to find your rhythm."* Most "engagement" tactics (streak guilt, pop-ups, currencies, notifications) would destroy exactly that. So every feature in this plan has to pass a filter.

### 1.1 Identity Guardrails

| # | Guardrail | Meaning in practice |
|---|---|---|
| G1 | **Quiet** | No modals, pop-ups, ads or notifications. No sound until the player allows it. Effects are small and short. |
| G2 | **One word, minimal screen** | During play the screen shows the word, a few stats and the meter. A new on-screen element needs a strong reason. **Budget: at most one new element on the play screen per release.** |
| G3 | **Playable with nothing** | No account, backend or network needed to play fully. Online features are optional and the game works if they fail. |
| G4 | **The player's pace** | No punishment for absence, no streak counters, no time-gated rewards, no dark patterns. |
| G5 | **Instant** | One key press to start. Fast load. Nothing ever blocks or delays typing. |
| G6 | **For everyone** | Keyboard-only, readable, reduced-motion respected. |
| G7 | **Light & smooth** | ICA stays tiny and fast on the cheapest phone. The budgets in §4.2 are part of the identity: a feature that breaks them must remove something else. |

### 1.2 Feature Filter (apply to every item and every PR)

1. Does it respect G1–G7? (Any "no" → reject or redesign.)
2. Does it help the player **type, improve, or come back by choice**?
3. Can it be switched off, or ignored, without losing anything?
4. Is it testable (engine rule + unit test, or a manual check in the release checklist)?
5. Is it worth its weight: performance budgets (§4.2), code, ongoing maintenance?

### 1.3 What "engagement" means for ICA

| Pull | Quiet version for ICA |
|---|---|
| **"One more run"** | Fast replay, a clear result, a visible near-miss ("2 words from your best") |
| **Mastery** | Personal bests, WPM and accuracy, all stored locally |
| **Variety** | A bigger word pool; optionally a daily run |
| **Return** | By invitation only: a daily run that never punishes a missed day; shareable results |

---

## 2. Starting Point

### 2.1 What is known and what is not

| Fact | Status |
|---|---|
| `main` contains Phase 0 + Phase 1 (PR #1 merged; v0.2.0) | ✅ Verified in git |
| `netlify.toml` | Added in R0 (branch `r0-foundation`). Once merged it overrides the dashboard build settings. |
| Netlify's build command, publish directory, Node version, deploy branch | ❓ **Not visible to me.** Check the Netlify dashboard (task R0.1). |
| Behaviour on real phones and in Safari/Firefox | ❓ Never tested; only unit-tested and built |
| Browser behaviour | ✅ Automated checks in real Chrome during R0: typing, auto-pause, resume, CSP, fonts. ❓ Sound/shake by hand and real phones still to do. |

### 2.2 Gaps found in the code

| # | Gap | Evidence | Effect on the player |
|---|---|---|---|
| U1 | **Switching tabs loses the run** (fixed in R0) | No `visibilitychange`/`blur` handling; the clock is `Date.now()`-based | A 6-second glance at another tab can end the game |
| U2 | **Low-contrast text** | Measured on `#090909`: untyped letters `#555` = **2.67:1**; small labels `#484848` / `#555` / `#656565` / `#666` = 2.2–3.5:1 (WCAG needs 3:1 for large text, 4.5:1 for small) | The upcoming letters, the thing you read most, are hard to see; labels are 8–11 px |
| U3 | **Game-over shows one number** | `GameOverScreen.tsx`: only "words completed" | No sense of progress or near-miss |
| U4 | **Replay takes two steps** | Play again → ready screen → press a key | Friction between runs |
| U5 | **Pause can't be undone by keyboard** (fixed in R0) | Esc pauses but only the RESUME button resumes | Breaks the keyboard flow |
| U6 | **The combo window is invisible** (fixed in R1) | `engine.comboTimer` exists but the UI doesn't show it | Combos feel random: it just resets |
| U7 | **Rules are never explained** | Ready screen: title + "press any key" | New players don't know mistakes cost time |
| U8 | **Flat 5 s refill** | `MAX_HEALTH` for every word length | A 4-letter word is easy; a 16-letter word needs ~40 WPM with no errors |
| U9 | **Small word pools** | 47 / 49 / 48 / **31** words per level; level 4 is endless | Repeats become obvious within minutes |
| U10 | **Mobile keyboard unverified** | Hidden input with `pointer-events: none` | May not open on iOS Safari |
| U11 | **No identity assets** (fixed in R0) | No favicon, preview image or manifest in `index.html` | Weak first impression, bare link previews |
| U12 | **Remote fonts** (fixed in R0) | `@import` from Google Fonts | Render-blocking; visitor IPs go to Google |
| U13 | **Tone mismatch (to decide)** | Level 1 mixes calm words (`drift`, `hush`) with slang (`rizz`, `yeet`, `simp`) | Slang may clash with the "quiet" feel. A brand decision, not a bug. |
| U14 | **Footer vs mechanic (to decide)** | Footer says "TYPE AT YOUR OWN PACE"; the survival meter sets the pace | Possible mismatch, which an optional calm mode would resolve (§8.3) |
| U15 | **Long words clipped on narrow phones** | Computed: a 16-letter word is 325 px wide; 276 px is available at a 320 px screen and 316 px at 360 px; `overflow: hidden` cuts the end (§4.4) | Level-4 words can be unreadable on small phones |
| U16 | **Small touch targets** | Top-bar buttons ≈ 30 px tall | Easy to miss on a phone |
| U17 | **Zoom, orientation and shortcut hints not audited** | No test yet at 200% zoom or on a landscape phone; Esc is hinted only during play | Unknown problems for some players |
| E1 | **React re-renders 20×/s** (fixed in R1: 1/s) | `useInterval(tick, 50)` creates new state every tick; only the meter, SURVIVAL (10/s) and TIME (1/s) change visibly | Wasted CPU and battery; less headroom for effects |
| E2 | **Meter animates `width`** (fixed in R1) | `transition: width .06s linear` | Layout and paint every frame |
| E3 | **Wall-clock time** (fixed in R0) | `Date.now()` in every dispatch | A system clock change can jump survival |
| E4 | **Fonts remote** (fixed in R0) | Two Google origins plus a render-blocking CSS hop. Unused weights were requested, but browsers download only the faces used, so no bytes were wasted. | ~38% of first load once self-hosted; third-party dependency |

---

## 3. Release Plan at a Glance

```
R0 v0.2.1        R1 v0.3.0        R2 v0.4.0       R3 v0.5.0       R4 v0.6.0        R5 v1.0.0     R6
Foundation  ──▶  Typing Impact ─▶ Run Experience ─▶ Content &  ──▶ Return Loops ──▶ Launch   ──▶ Online
(Netlify, safety,  (game feel)    (results, flow,   Variety        (optional)       (domain,      (gated)
 measurement)                      readability)                                      polish)
```

| Release | Version | Theme | Effort* | Fixes |
|---|---|---|---|---|
| **R0** | 0.2.1 | Netlify hardening, safety net, measurement, size budgets, quick fairness wins | ~2 days | U1, U11, U12, E3, E4 |
| **R1** | 0.3.0 | Render pipeline first, then typing impact (guide §9 · Phase 2A) | ~6.5 days | feel, E1, E2 |
| **R2** | 0.4.0 | Results, replay flow, readability, balance, mobile, small-screen fit | ~5.5 days | U2–U8, U10, U15, U16 |
| **R3** | 0.5.0 | Bigger vocabulary, tone decision, optional calm mode | ~3 days | U9, U13, U14 |
| **R4** | 0.6.0 | Daily run, share, local stats (all optional) | ~4 days | engagement |
| **R5** | 1.0.0 | Custom domain, audits, final polish | ~2.5 days | launch |
| **R6** | 1.x | Leaderboard etc. (only on demand) | TBD | — |

\*Rough estimates for one developer; each release is time-boxed. Unfinished items move to the next release or are dropped, never allowed to stretch the release.

**Why this order:** R0 makes shipping safe and measurable (including a performance baseline and budgets, §4). R1 starts by taking time-driven visuals out of React (P4), so its effects run on a cheap frame, then does the most for how the game *feels*. R2 turns a good run into a satisfying result and quick replay. R3 and R4 add reasons to come back, so they come only after the core is solid.

### 3.1 Rules for every release

- Branch → PR → CI green → **Netlify Deploy Preview** checked → merge → auto-deploy.
- Update `CHANGELOG.md`, bump `package.json` version (footer follows), tag `vX.Y.Z`.
- Game rules change only in `src/game/engine.ts`, with a test.
- Release checklist (§12.4): keyboard-only run, reduced-motion check, one real phone, contrast check, bundle size.

---

## 4. Performance, Efficiency & Usability Workstream

**Goal:** ICA stays tiny, instant and smooth on the cheapest phone, and easy to use on any screen. This is a standing part of every release, not a one-off clean-up. Being light is part of being quiet (guardrail G7).

**Rule: measure first.** No optimisation lands without a before/after number. Several "obvious" targets turned out not to matter (§4.1), so effort goes where the data points.

### 4.1 What the measurements say (v0.2.0, 2026-11-06)

| Finding | Value | How obtained |
|---|---|---|
| JS bundle | 229.7 kB raw · 72.1 kB gzip · 62.1 kB brotli | `npm run build` |
| …of which React + ReactDOM | 217.7 kB raw · 67.5 kB gzip · 58.0 kB brotli | bundled alone with esbuild |
| …so ICA's own code | ≈ 12 kB raw (≈ 4.6 kB gzip), **about 6% of the JS** | difference of the two |
| CSS | 3.6 kB raw · 1.4 kB gzip | build |
| Fonts before R0 | Remote (Google Fonts): 2 extra origins + a CSS hop. Unused weights were requested, but Chrome downloaded only the used faces (24.5 + 14.6 KiB) | measured in Chrome |
| Fonts if self-hosted, used weights only | Manrope variable (Latin) 24.3 kB + DM Mono 400 (Latin) 14.5 kB ≈ **39 kB** woff2 | font packages inspected |
| First-load transfer after R0 (estimate) | ≈ 102 kB: 62 JS + 39 fonts + ~1 CSS/HTML. **Fonts ≈ 38%.** | sum |
| Preact alternative | Preact + compat for the hooks ICA uses: 7.1 kB gzip · 6.4 kB brotli (React: 67.5 / 58.0). Estimated first load ≈ 50 kB. | bundled in isolation; **a whole-app swap was not built or tested** |
| React renders while playing | **20 per second** | measured in Chrome with a React commit counter; matches the code (`useInterval(tick, 50)`) |
| DM Mono character width | 0.600 em | read from the font file |
| Longest words | 16 letters (`incomprehensible`, `misunderstanding`, `multidimensional`, `disproportionate`) | `words.ts` |

**Units:** sizes in this section are KiB (1,024 bytes). Vite's build log uses kB (1,000 bytes), so its figures look ~2% larger.

**Measured in R0** (real Chrome via a scratch Playwright harness; local server with brotli; throttled to 150 ms RTT, 1.6 Mbps, 4× CPU; 412 px viewport; 3 runs each, median):

| Metric | Before R0 | After R0 |
|---|---|---|
| First / largest contentful paint (median) | 1,940 ms | **1,884 ms** |
| …first, cold-DNS run | 2,324 ms | 1,840 ms |
| Transfer on first load | 104.1 KiB | 104.4 KiB (same font bytes, now self-hosted) |
| Third-party origins | 2 (Google Fonts) | **0** |
| Console errors | 1 (favicon 404) | **0** |
| CSP violations (production policy) | n/a | **0** |
| React commits/s while playing, idle | 20 | 20 (unchanged; fixed in R1, P4) |
| 16-letter word width vs space at 320 / 360 px | 325 px vs 276 / 316 px (**clipped**) | unchanged (fixed in R2, U15) |

The font change gains between ~56 ms (warm DNS) and ~480 ms (cold connection to Google's domains). The clearer wins are zero third-party requests and a strict CSP. The harness lives outside the repo for now; it is the starting point for the R2.10 E2E test.

**Still not measured:** Lighthouse on the Netlify URL, a real mid-range Android trace, input latency, memory over a long run.

**What this means:**
1. **ICA's own code is not the weight.** 94% of the JS is React. Shrinking app code is pointless.
2. **Fonts are as heavy as the JS.** Dropping unused weights and self-hosting is the cheapest real win.
3. **The biggest runtime waste is structural:** 20 React renders a second for visuals that change 1–10 times a second.
4. **The biggest "lightweight" lever is the framework itself,** which is a gated decision (P10), not a default.

### 4.2 Budgets (proposed)

LCP, CLS and INP use the published "good" Core Web Vitals thresholds. The rest are proposals to confirm after the P1 baseline.

| Metric | Now | Budget / target | Checked by |
|---|---|---|---|
| JS (gzip) | 72.4 KiB | ≤ 85 KiB (lower it if P10 is adopted) | `npm run size` (CI + Netlify build) |
| Fonts (woff2) | 38.7 KiB (self-hosted) | ≤ 45 KiB | `npm run size` |
| First-load total (gzip) | 113.3 KiB | ≤ 130 KiB (the plan said 120 from a brotli estimate; the check uses gzip, which is ~10% larger) | `npm run size` |
| Third-party requests | 0 since R0 (was 2 Google origins) | 0; analytics is the only exception (small, async) | Network panel + CSP |
| LCP, mobile throttled | 1.88 s median in a local Chrome lab run; Netlify not yet measured | ≤ 2.5 s | Lighthouse / harness |
| CLS | not measured | ≤ 0.1 | Lighthouse |
| Key → visual response | R1: 24–40 ms median in Chrome lab runs (§6.1) | within one frame (~16 ms) in a lab trace; INP ≤ 200 ms | DevTools trace, dev HUD |
| Lighthouse performance (mobile) | not measured | ≥ 90 | each release |
| React renders/s while playing, not typing | 1 (R1; was 20) | ≈ 0–1 | dev HUD counter |
| Long tasks during a run | not measured | none over 50 ms | dev HUD |
| JS heap over a 10-minute run | not measured | flat | DevTools memory |

### 4.3 Efficiency tasks

| # | Task | Evidence | Change | Risk → mitigation | When |
|---|---|---|---|---|---|
| P1 | **Baseline + dev perf HUD** | Nothing measured at runtime yet | Lighthouse (mobile, throttled) on the Netlify URL; DevTools trace of a 2-minute run on a mid-range Android; 10-minute heap check. A **dev-only** HUD (`?perf`, behind `import.meta.env.DEV`) shows FPS, long tasks and render count. | HUD leaks into production → build size diff must be 0 bytes | R0 |
| P2 | **Size budgets in CI** | Bundle can grow silently | Zero-dependency script `scripts/check-size.mjs` fails CI over budget (§4.2) | Flaky limits → ~15% headroom; tighten deliberately | R0 |
| P3 | **Right-sized, self-hosted fonts** (E4, U12) | 5 weights requested, 2 families used; remote request chain | Manrope variable + DM Mono 400 only, Latin subset, `font-display: swap`. Preload the two files used on the first screen (stable names under `public/fonts/`). | Text reflow on swap → preload and check CLS ≤ 0.1; add fallback metric overrides only if CLS fails | R0 |
| P4 | **Time-driven visuals out of React** (E1). ✅ R1; final design differs, see §6.2 | 20 renders/s; only the meter (continuous), SURVIVAL text (10/s) and TIME (1/s) actually change | Engine gets a pure `nextDeadline(state)` (ms until survival hits 0 or the combo expires). The shell sets **one timer** to that deadline, plus a 1 s safety tick, instead of polling every 50 ms. The meter and clock become small leaf components that compute live values from the snapshot (`health − (now − lastTickAt)`) and update through rAF/refs. The app re-renders only on input and deadlines. Leaf components are `memo`'d with primitive props. | Timing drift in the core loop → the engine stays the only authority and every dispatch re-syncs; unit tests for `nextDeadline` (including pause); a test showing old polling and new scheduling end a scripted run at the same moment; E2E | **R1 step 0** (~1.5 d) |
| P5 | **Meter without layout animation** (E2). ✅ R1 as a 20 Hz `transform` write, not a compositor animation (§6.2) | `transition: width .06s linear` animates a layout property every frame | `transform: scaleX()` with `transform-origin: left`; `will-change: transform` on that one element only | Looks different → before/after screenshot compare | with P4 |
| P6 | **Monotonic clock** (E3) | `Date.now()` in every dispatch; a system clock change can jump survival | One `now()` helper returning `performance.now()`. The engine is unaffected because `now` is already injected. | Behaviour across device sleep → covered by auto-pause (R0.5) | R0 |
| P7 | **Audio efficiency** | Planned in Phase 2A | One shared `AudioContext` unlocked on the first key press; one reused noise buffer; nodes disconnected on `ended`; voice cap; heartbeat scheduled on the audio clock | Safari quirks → silent fallback (as in 2A) | R1 |
| P8 | **Long-session soundness** | No data | 10-minute run: heap flat; timers and listeners cleaned up on every screen change | none | measure in R0, fix if found |
| P9 | **Static first paint** (gated) | The ready screen only appears after the JS runs | Identical static markup for the ready screen in `index.html`, replaced by React on load | Flash or duplicate content → identical markup, E2E check | only if LCP > 2.5 s after P3 |
| P10 | **Framework weight** (gated, **not by default**) | React is 94% of the JS | Alias React to `preact/compat`: runtime 7.1 kB gzip vs 67.5, roughly halving first load | Behavioural differences (controlled input, focus, events) → engine untouched; E2E on Chrome, Firefox and Safari plus a real phone; Netlify rollback | decision D10 after P1 |
| P11 | **Delivery checks** | Unverified | Confirm gzip/brotli is served, HTML revalidates, assets are immutable, no third-party requests, modern build `target` | none | R0, with `netlify.toml` |

**On P10:** 62 kB brotli is already small, and React is a known quantity. Swap only if the real-device Lighthouse run (P1) misses the budgets, or if you value the size for its own sake.

### 4.4 Usability tasks (small screens, touch, keyboard)

| # | Finding | Evidence | Change | Risk → mitigation | When |
|---|---|---|---|---|---|
| U15 | **Long words don't fit narrow phones** | **Computed, not yet seen in a browser.** DM Mono is 0.600 em wide, letter-spacing is −0.065 em and the font-size floor is 38 px, so a 16-letter word is **325 px** wide. Available width is 276 px at a 320 px screen and 316 px at 360 px: overflow of **49 px** and **9 px**. 375 px and wider fit. `.app-shell` has `overflow: hidden`, so the last letters are clipped. | Size the word from its length in CSS: set `--chars` inline and use `font-size: min(clamp(…), calc((100vw − padding) / (var(--chars) × 0.54)))`. No JS measuring. | Smaller letters on long words → floor stays above ~30 px (≈ 32 px at 320 px); verify the four longest words at 320 and 360 px | **R2** (high priority) |
| U10+ | **Mobile input quirks** (extends U10) | Unverified on devices | Input `font-size ≥ 16 px` (stops iOS focus-zoom), `autoCorrect="off"`, `enterKeyHint`, `touch-action: manipulation`, `100dvh` layout | Can't verify without devices → Deploy Preview on a real iPhone and Android | R2.8 |
| U16 | **Small touch targets** | Top-bar buttons are ≈ 30 px tall (11 px text + 8 px padding) | Grow the hit area to ≥ 44 px with padding or a pseudo-element, without changing how it looks | Overlapping neighbours → the 24 px gap already between them | R2 |
| U17 | **Zoom, orientation and shortcut hints not audited** | `.center-stage` uses 70 px/90 px vertical padding; Esc is hinted only during play | Test 200% zoom, OS large text and landscape phones (relax padding with `clamp`/`dvh` if needed). Show Esc/Enter hints on the pause and result screens as plain text. | none | R2 test, R5 audit |

### 4.5 Effort impact

| Release | Added | Includes |
|---|---|---|
| R0 | +0.5 day | P1, P2, P3, P6, P11 |
| R1 | +1.5 days | P4, P5 (P7 sits inside the existing audio work) |
| R2 | +0.5 day | U15, U10+, U16, U17 |
| R5 | +0.5 day | Lighthouse and zoom audits |
| Gated | ~0.5 day (P9), ~1 day plus testing (P10) | only on a "go" |

### 4.6 Standing rules

1. **Measure before and after** and put both numbers in the changelog (e.g. "renders/s 20 → ~0", "third-party requests 2 → 0").
2. **Runtime dependencies stay minimal.** Today only React and ReactDOM; fonts are static files. Anything new needs a size delta and a reason.
3. **Budgets are release criteria**, listed in the checklist (§12.4).
4. **Effects obey the budgets too.** Any Phase 2A effect that costs a frame is cut.

---

## 5. R0 · v0.2.1 Foundation

**Goal:** make production safe to change, and fix what loses players' runs unfairly, before adding anything.

| # | Task | Why | Approach | Risk → mitigation |
|---|---|---|---|---|
| R0.1 | **Audit the Netlify setup** | Config is invisible to the repo | Record build command, publish dir, Node version, production branch, deploy-preview setting, domain. Put it in the guide. | none |
| R0.2 | **Add `netlify.toml`** | Settings versioned with the code; tests gate every deploy | See §12.1. Build command `npm test && npm run build`. | It overrides dashboard settings → do R0.1 first and compare; ship in its own PR with a Deploy Preview |
| R0.3 | **Security & cache headers** | Safe defaults, fast repeat visits | `[[headers]]` in `netlify.toml` (§12.1) | A strict CSP can break the page → test on the preview; CSP in its own commit so it's easy to revert |
| R0.4 | **Right-sized, self-hosted fonts** (U12, E4, P3) | Removes the render-blocking Google request chain; lets CSP be strict; ≈ 39 kB total | `@fontsource-variable/manrope` + `@fontsource/dm-mono`, **only what is used** (Manrope variable, DM Mono 400), Latin subset, `font-display: swap`, preload the first-screen files; remove the `@import` | Reflow on swap → check CLS ≤ 0.1; +2 build-time dependencies |
| R0.5 | **Auto-pause when the tab is hidden or the window loses focus** (U1) | A run shouldn't end because you looked away. Fairness first. | Shell listens to `visibilitychange` and `blur`, dispatches the existing `pause` event. **Never auto-resume**; the player resumes. | False pauses (e.g. DevTools) → acceptable, since typing wouldn't register anyway; verify iOS Safari doesn't pause on keyboard open |
| R0.6 | **Identity assets** (U11) | First impression and link previews | Favicon (SVG), `og:title/description/image` (1200×630 monochrome card), `theme-color` already present | OG image must not misrepresent the game → generate from the real UI |
| R0.7 | **Privacy-friendly measurement** (§13) | Can't improve engagement without a baseline | Cookieless analytics + a few aggregate events | Privacy/compliance → no cookies, no personal data, no typed content; disclose in footer; verify local rules |
| R0.8 | **Size budgets in CI** (P2) | Prevent silent bloat | Record current size (**72.1 kB gzipped JS**); zero-dependency script fails CI over the §4.2 budgets | Flaky limits → ~15% headroom |
| R0.9 | **Performance baseline + dev HUD** (P1, P8) | Real numbers before any optimisation | Lighthouse mobile run, DevTools trace on a mid-range Android, 10-minute heap check; dev-only `?perf` HUD; record results in §4.1 | HUD must not ship → build-size diff 0 bytes |
| R0.10 | **Monotonic clock** (E3, P6) | A system clock change shouldn't drain survival | One `now()` helper using `performance.now()` | none (engine already takes `now`) |
| R0.11 | **Delivery checks** (P11) | Free speed | Verify gzip/brotli, immutable assets, no third-party requests | none |

**Done when:** Netlify deploy fails if tests fail (proven with a deliberately failing test on a preview branch); headers verified in the browser; switching tabs mid-run pauses; favicon and preview card show; analytics shows a page view; fonts load from the site itself; baseline numbers are recorded in §4.1; CI fails when a budget is exceeded; no third-party font requests remain.

### 5.1 R0 status (2026-11-06)

| Task | Status | Evidence / note |
|---|---|---|
| R0.1 Audit Netlify setup | ⏳ **Needs owner** (D1) | Dashboard settings are not visible from the repo |
| R0.2 `netlify.toml` | ✅ | Build: `npm test && npm run build && npm run size`. **Compare with the dashboard before merging.** |
| R0.3 Headers | ✅ | Production CSP tested in Chrome: 0 violations, 0 console errors |
| R0.4 Fonts | ✅ | Manrope (variable) + DM Mono 400, Latin, preloaded; OFL licences in `/fonts`; third-party origins 2 → 0 |
| R0.5 Auto-pause | ✅ | Chrome: pauses on window blur and on a hidden tab; Esc resumes. **Scope note:** Esc/Enter resume and its on-screen hint were pulled forward from R2.3, because auto-pause makes them necessary for keyboard players. |
| R0.6 Identity assets | ✅ | `favicon.svg` (fixes a 404), `apple-touch-icon.png`, `og-image.png` (1200×630, rendered from the game's fonts); `og:image` made absolute from Netlify's `URL` |
| R0.7 Analytics | ⏳ **Needs owner** (D3) | When chosen, add its domain to the CSP |
| R0.8 Size budgets | ✅ | `npm run size`: JS 72.4/85, fonts 38.7/45, first load 113.3/130 KiB |
| R0.9 Baseline + HUD | ◐ Partly | Dev HUD (`?perf`, verified absent from production). Local Chrome lab baseline in §4.1. Still to do: Lighthouse on Netlify, real Android trace. |
| R0.10 Monotonic clock | ✅ | `src/clock.ts` (`performance.now()`) |
| R0.11 Delivery checks | ◐ | Headers configured; check `content-encoding` and cache headers on the live site after merge |
| Extra: plain-text word lists | ✅ | Owner request (was part of R3): `src/game/wordlists/level-N.txt`, identical content, rules still test-enforced |

---

## 6. R1 · v0.3.0 Typing Impact

Fully planned in **guide §9 · Phase 2A** (feedback ladder, sound synthesis, safeguards, build order). Not repeated here. Items added by this plan:

| Addition | Reason |
|---|---|
| **Step 0: render pipeline** (P4, P5) | Stop re-rendering the React tree 20×/s and move the meter to `transform`. Do it **before** the effects, so they run on a cheap frame. +1.5 days. |
| **Fade the COMBO number as its window closes** (U6) | Makes the invisible 3 s window visible without adding an element (G2). Uses `engine.comboTimer`. Do it in 2A step 4. |
| **Sound default decision** (§15) | Most of the impact is audio |
| Effects respect **R0.5 auto-pause** | No effects keep firing while paused |

### 6.1 R1 status and measured results (2026-11-06)

**Implemented:** every step of guide §9 · Phase 2A (2A.7 steps 0–6), plus the combo-window fade (U6). Step 7 (human playtest and tuning) is still to do.

| Area | Result |
|---|---|
| Render pipeline | Idle React renders **20/s → 1/s**. The engine ticks only at deadlines (`nextDeadline`), plus a 1 s safety tick; an idle run needs 2 ticks instead of 100, with an identical end state (unit-tested). |
| Feedback ladder | Thock / thud / chunk with combo pitch / chime / crack / heartbeat; letter press, wrong-letter ghost, word fade-out, combo fade/pop/break, meter glow, danger pulse; haptics on touch devices |
| Controls | `SOUND OFF/LOW/MED/HIGH` (default **OFF**, D2 still open; a v0.2 "on" migrates to LOW); `FX FULL/SUBTLE/OFF` (default follows the OS reduced-motion setting). This is R1's one new top-bar element (G2). |
| Safeguards | Voice cap (6) + compressor; ±4% pitch / ±10% volume variation; tier-3 budget (1/s); cadence damping; performance guard (6 frames in a row > 50 ms → SUBTLE for the session) |
| Size | JS 72.4 → **75.8 KiB** gzip (budget 85) |
| Tests | 57 unit tests (was 31) |

**Verified in Chrome** (scratch Playwright harness, production CSP): game over and combo break happen on time with deadline scheduling; danger state below 1.5 s; SUBTLE produces zero moving animations and OFF zero animations; sound starts on the first key with one `AudioContext`, and none is created while OFF; the heartbeat plays in danger; the old setting migrates; the top bar fits at 320 px; no CSP violations or console errors.

**Keystroke latency** (Event Timing: key press → next paint, ms; median / p95 of 3 interleaved runs; values come in 8 ms steps):

| CPU, cadence | v0.2.1 | R1 FX OFF | R1 SUBTLE | R1 FULL |
|---|---|---|---|---|
| 4× slower, 70 ms/key (burst) | 32 / 40 | 32 / 40 | 40 / 48 | 40 / 48 |
| 4× slower, 180 ms/key (~65 WPM) | 32 / 40 | 32 / 48 | 32 / 48 | 40 / 56 |
| 1×, 70 ms/key | 24 / 32 | 24 / 32 | 24 / 32 | 24 / 32 |
| 1×, 180 ms/key | 24 / 32 | 32 / 32 | 24 / 48 | 32 / 48 |

OFF matches v0.2.1. FULL and SUBTLE add at most one 8 ms step at the median and 8–16 ms at p95: the remaining cost of having any per-key visual feedback. Lab numbers on a desktop; **real phones not yet measured.**

**Open items:** human playtest and tuning of `src/feel/config.ts` (step 7), sound default (D2), a real-device check (sound on iOS, haptics on Android).

### 6.2 Changes from the plan, and why (measured)

| Plan said | Built instead | Why |
|---|---|---|
| Animate only `transform`/`opacity` ("GPU-friendly") | Effects animate colour and `top`/`left` on small positioned elements | In Chrome, while any compositor animation is running, keystroke updates landed about a frame later under load. The first R1 build was +30–40 ms median at 4× CPU; the final one is within one 8 ms step. |
| Meter as a compositor animation, values drawn per frame | One 20 Hz display tick writes the meter `transform`, readouts, combo fade and danger pulse | Measured three designs: a per-frame JS loop made every frame heavier; compositor animations delayed keystrokes; the 20 Hz tick matched v0.2.1 latency at 1/20 of the renders |
| Per-key squash and dip on every key | Per-key motion only during relaxed typing (≥ ~115 ms between keys); the colour brighten always | In fast bursts, per-key motion overlaps the next keystroke and delays it; sound carries the feel there (an extension of cadence damping) |
| Word "punches out upward as the next slides in" | The finished word fades and lifts 3 px; the next word appears at once | 3 px movement cap (2A.2) and readability |
| Performance guard: frames > 32 ms | 6 frames in a row > 50 ms | 32 ms is a normal frame on 30 Hz screens and in phone low-power modes (33 ms), which would have downgraded effects for no reason |
| Esc/Enter resume in R2 | Done in R0 | Auto-pause made it necessary |

### 6.3 Proposed add-ons (for discussion, not built)

Ideas that came up during R1. Each is checked against the guardrails (§1.1).

**Status (polish phase, see CHANGELOG [Unreleased]):** A1 ✅ (LOW by default for new players) · A2 ✅ (SOFT / THOCK / WOOD / PEBBLE, chosen on the start screen with a preview) · A3 → folded into **Zen mode** (no live score; stats on the result screen) · A5 ✅ in Zen only, as a rhythm line written by the 20 Hz display tick (no animations, so no keystroke-latency cost) · A6 → only as Zen's optional ambient pad, never in Arcade. A4 not built.

| # | Add-on | What it adds | Guardrail fit | Cost / risk | Suggestion |
|---|---|---|---|---|---|
| A1 | **Sound on by default (LOW)** = decision D2 | Most of R1's impact is audio | G1 OK if it starts quietly on the first key press | Some players are surprised by sound | Recommend yes, LOW |
| A2 | **Sound character choice** (e.g. "soft" / "mechanical") | Personal taste; the synthesis makes variants cheap (no files) | G2: lives inside the SOUND control, no new element | +~1 KiB; more to tune | Later (R3), only if playtesters ask |
| A3 | **Focus mode**: hide stats while typing, show them on pause/result | Even quieter screen | Strengthens G1/G2 | Players lose live feedback on combo/time | Worth a playtest toggle |
| A4 | **Separate haptics toggle** | Control for Android players | Fine | One more setting (G2 pressure) | Only if Android players ask; FX OFF already disables it |
| A5 | **Typing rhythm visual** (subtle pulse in time with your cadence) | Reinforces "find your rhythm" | Risky for G1 (more motion) | Latency risk (§6.1) | Not now |
| A6 | **Ambient drone that reacts to combo** | Atmosphere | Conflicts with G1 ("Background music loops" are in §16) | Audio fatigue | Not recommended |

---

## 7. R2 · v0.4.0 Run Experience

**Goal:** a run ends with a clear, kind result and a one-key way to go again. This is the strongest "one more run" lever that fits ICA.

### 7.1 Items

| # | Task | UX / engagement value | Approach | Risk → mitigation |
|---|---|---|---|---|
| R2.1 ✅ | **Result screen** (U3) | Shows progress and near-misses | Show **words, best combo, accuracy, time, WPM**, plus "NEW BEST" or "N words from your best". Same layout style as now, no extra buttons beyond PLAY AGAIN (and SHARE in R4). | Clutter → max 5 figures, quiet typography. WPM = `correctCharacters / 5 ÷ active minutes`, hidden ("—") for runs under 5 s so tiny runs don't show absurd numbers |
| R2.2 ✅ | **Instant replay** (U4) | Removes friction between runs | `Enter`/`Space`/click on game over starts a fresh run directly (new engine event `playAgain`) | Fast typists skip the result by accident → **0.7 s input lock** after game over (tune in playtest) |
| R2.3 ✅ | **Esc / Enter resumes** (U5) | Keyboard flow | Extend the existing key handler to the `paused` screen | none |
| R2.4 | **Personal bests (local)** | Mastery without accounts | `ica-stats` JSON: best words, best WPM, best combo, total runs. Extends `storage.ts`. | Corrupt/blocked storage → **versioned schema** (`v:1`), validated and clamped on read, falls back to zeros, never throws |
| R2.5 | **Readability pass** (U2) | The core text is hard to read | Raise colours, keep the hierarchy: untyped letters `#555 → #666+` (≥3:1, large text); small labels to `#7a7a7a` (4.6:1, AA); minimum label size 11 px (mobile too) | Loses the "quiet" look → change values only, not layout; compare before/after screenshots; keep typed vs untyped contrast obvious |
| R2.6 | **One-line rules hint** (U7) | New players understand what's going on | One muted line on the ready screen: *"Finish each word before the line runs out. Mistakes cost time."* | Clutter → one line, no tutorial or modal (G1) |
| R2.7 | **Length-scaled survival** (U8) | Fair difficulty at every level | Engine: per-word refill `base + perLetter × length`. Starting guess: ~2.0 s + 0.3 s/letter (4 letters ≈ 3.2 s, 15 ≈ 6.5 s). Meter width = time ÷ that word's capacity. | Feels different to returning players → tune with 5–10 playtesters watching where runs end; unit tests pin the formula; note bests set under v0.3 rules in the changelog |
| R2.8 | **Mobile input** (U10) | Phone players can start typing at all | A visible "tap to type" area; focus the input **synchronously inside the tap**; `100dvh` layout so the word stays above the on-screen keyboard; input `font-size ≥ 16 px`, `autoCorrect="off"`, `touch-action: manipulation` (§4.4) | Can't be verified without devices → test iOS Safari + Android Chrome via **Deploy Preview URL** before release; fallback = tap area re-focuses on every tap |
| R2.9 | **Screen-reader & focus basics** | G6 | Word announced via a polite `aria-live` region on change (not per keystroke); visible focus outlines | Chatty announcements → announce word change only |
| R2.10 | **E2E smoke test** | Catches wiring bugs unit tests can't | One Playwright test: start, type a word, WORDS = 1 (dev dependency only) | Flaky tests → drive time via the engine, keep the test short; if it flakes, quarantine, don't ignore |
| R2.11 | **Fit long words on narrow phones** (U15) | Level-4 words stay fully visible on 320–360 px screens | Size the word from its length in CSS (§4.4) | Smaller letters → keep a readable floor; verify the four 16-letter words |
| R2.12 | **Touch targets** (U16) and iOS input quirks (§4.4) | Easier taps, no focus-zoom | ≥ 44 px hit areas without visual change; input attributes | Verify on real devices |

### 7.2 Code changes

| Area | Change |
|---|---|
| `game/engine.ts` | `refillFor(word)`, `playAgain` event, `startBest` (for "new best"), `getWpm(state)` helper. All tested. |
| `components/GameOverScreen.tsx` | Result figures, replay handling |
| `storage.ts` | Versioned `ica-stats` |
| `styles.css` | Contrast values, min sizes, tap area |
| `App.tsx` | Key handling for paused / game over, input lock |

**Done when:** result screen shows all figures with a "new best" case tested; replay is one key press and the lock prevents accidental skips; contrast ≥ targets (re-measured); a full run works on one iPhone and one Android phone; E2E passes in CI; all unit tests pass; the four 16-letter words are fully visible at 320 and 360 px.

---

## 8. R3 · v0.5.0 Content & Variety

**Goal:** a run stays fresh, and the game's tone is deliberate.

### 8.1 Larger word pools (U9)

| Item | Detail |
|---|---|
| Target | ~120+ words per level, ~100 at level 4, so a long run doesn't visibly cycle |
| Rules | Existing test-enforced length bands (L1 3–7, L2 5–8, L3 9–12, L4 13+); lowercase a–z only; no duplicates |
| Quality | Hand-curated, no offensive or ambiguous words; common words dominate; spelling unambiguous (no US/UK variants) |
| Risk | Content errors slip in → add a test for the rules above, and review the diff by eye. Don't generate lists from an uncurated dictionary. |

### 8.2 Tone decision (U13)

Decide whether the slang words (`rizz`, `yeet`, `simp`, `noob` …) fit the brand. Options: **keep** (playful), **move to a separate "playful" pool** (e.g. mixed in at lower probability), or **remove** (fully calm). Recommendation: keep a small amount, since it gives the game personality, but make this an explicit choice. Ask the owner before changing.

### 8.3 Calm mode (decision gate)

The footer promises "type at your own pace", while the survival meter forces one. An optional **Calm** mode would honour the promise: no drain, no game over, the same word flow, feedback and combo rhythm; the player ends the session.

| Aspect | Detail |
|---|---|
| Value | Warm-up, relaxed play, accessibility for players who find timers stressful, and a gentler first experience |
| Cost | The only item in this plan that changes the core rules: engine `mode` flag, a mode switch on the ready screen, separate best stats |
| Risk | Dilutes the arcade tension; splits effort and statistics → **decision gate**: build only after R2 data and playtest feedback show demand; keep it one switch, not a settings menu |

**Done when:** pools meet size and rule tests; tone decision recorded; calm-mode go/no-go recorded (built only if "go").

---

## 9. R4 · v0.6.0 Return Loops (optional)

**Goal:** give players reasons to return *by choice*. Every item is optional, local, and can be ignored (G3, G4).

| # | Task | Value | Approach | Risk → mitigation |
|---|---|---|---|---|
| R4.1 | **Daily run** | A shared challenge with no backend | `dailySeed(date)` = hash of `WORD_LIST_VERSION` + **UTC date**. The engine already takes a `seed` and draws words deterministically, so every player gets the same words that day. Entry: a quiet text link on the ready screen. Local best per day. | **FOMO/guilt** → no streak, no "you missed a day", no reminders. **Version drift** (cached old build, edited word list) → `WORD_LIST_VERSION` in the seed; a test pins the first 10 words for a fixed date |
| R4.2 | **Share result** | Word of mouth without accounts | Button on the result screen: text like `ICA · 42 words · 9x combo · 94%` + site URL, via `navigator.share` when available, otherwise clipboard. | Permissions/unsupported → fall back to clipboard, then to a visible selectable text. No personal data. Never prompt automatically (G1). |
| R4.3 | **Lifetime stats view** | Mastery over time | A small, quiet screen from the ready screen: runs, total words, bests. Local only. | Clutter → text-only, one screen, no charts; "reset stats" with a confirmation |
| R4.4 | **Near-miss message** | Motivation | "3 words from your best", from R2 data | Nagging → show once on the result screen only |

**Done when:** two browsers on the same UTC date get identical word sequences (verified by test and by hand); sharing works on desktop and mobile; stats survive reload and handle corrupted storage; nothing prompts, interrupts, or counts missed days.

---

## 10. R5 · v1.0.0 Launch

| Task | Detail |
|---|---|
| **Custom domain** | Netlify → Domain management. Use a CNAME/ALIAS or Netlify DNS; HTTPS certificate is automatic. Set one primary domain and redirect the others. |
| **Update CSP/OG URLs** | Absolute URLs for the new domain |
| **Accessibility audit** | Keyboard-only run; screen reader pass; reduced motion; contrast re-measure; 200% zoom and landscape phone (U17); Lighthouse accessibility ≥ 90 as a target |
| **Performance audit** | Lighthouse mobile ≥ 90 against the §4.2 budgets (LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms); 10-minute heap check; third-party requests = 0 apart from analytics |
| **Cross-browser check** | Chrome, Firefox, Safari (macOS + iOS), Android Chrome |
| **Installable (optional)** | Web manifest + icons. An offline service worker only if wanted, and only with auto-update, since a stale cached build is the main risk |
| **Release** | Changelog, `1.0.0`, tag, announce |

**Why last:** a public launch is a first impression, and R1–R3 are what make that impression good. Before then the Netlify URL is enough for testing.

---

## 11. R6 · Online Features (gated)

**Only if** R4 data shows people return and ask for it. Requires an explicit go decision and breaks G3 *unless built as optional*.

| Feature | Approach | Risks → mitigations |
|---|---|---|
| **Global leaderboard** | Netlify Functions + a small data store (e.g. Netlify Blobs or a hosted DB; check current limits and terms). Optional nickname, **no accounts**. | **Cheating:** client scores can be faked. Because the engine is a pure reducer, the server can **replay the submitted input log** and reject impossible runs (e.g. beyond a human WPM ceiling). Scripted bots can still pass, so keep the board casual and label it. |
| | | **Backend down:** feature flag via build env var; the game never depends on it |
| | | **Abuse/privacy:** rate limiting, profanity filter on nicknames, no personal data, privacy notice |
| | | **Cost:** set usage limits and alerts |
| **Daily leaderboard** | Same stack, keyed by the daily seed | Same as above |

---

## 12. Netlify Operations

### 12.1 Proposed `netlify.toml` (R0.2/R0.3, **not yet applied**)

```toml
[build]
  command = "npm test && npm run build"   # failing tests block the deploy
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"

# Hashed build files never change → cache for a year
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
```

Notes:
- **Apply only after R0.1** (compare with the dashboard) and **only after fonts are self-hosted (R0.4)**; otherwise the CSP blocks Google Fonts.
- If an analytics script is added (R0.7), add its domain to `script-src` and `connect-src`.
- `index.html` must **not** be cached long-term, so new releases show up: Netlify's default for HTML revalidates; keep it that way.
- Validate on a **Deploy Preview** before merging.

### 12.2 What Netlify gives us, and how it's used

| Feature | Use |
|---|---|
| **Deploy Previews** (one URL per PR) | Test on real phones and share with playtesters before merging |
| **Failed build keeps the last good deploy live** | With tests in the build command, a bad merge can't take the site down |
| **Instant rollback** (publish an earlier deploy) | First response to a bad release; then fix forward |
| **Build env vars** | Feature flags (e.g. `VITE_ENABLE_DAILY`) to ship dark and switch on |
| **Functions / Blobs** | Only for R6 |

### 12.3 Release flow

```
feature branch ─▶ PR ─▶ GitHub CI (test+build) ─┬─▶ Netlify Deploy Preview ─▶ manual check (desktop + phone)
                                                 └─▶ review ─▶ merge to main ─▶ Netlify builds (tests+build) ─▶ live
                                                                                  └─ tag vX.Y.Z · changelog · (rollback if needed)
```

### 12.4 Per-release checklist

- [ ] Tests, build and CI green; Deploy Preview works
- [ ] Full run on desktop with keyboard only
- [ ] Full run on one iPhone and one Android phone (Preview URL)
- [ ] Reduced-motion on: no shake/kick
- [ ] Contrast re-measured for any colour change
- [ ] Budgets met (CI size script); Lighthouse mobile re-run; third-party requests = 0
- [ ] Idle render rate and long tasks checked in the dev HUD (from R1)
- [ ] Changelog + version + tag
- [ ] Rollback target noted (previous deploy)

---

## 13. Measuring Engagement

Without numbers, "engagement" is opinion. Aim for a **baseline within two weeks** of R0, and set targets only after that. Don't invent targets beforehand.

| Metric | What it tells us |
|---|---|
| Runs per visit | Is "one more run" working? (R2) |
| Share of visits with at least one completed word | Do people understand how to start? (rules hint, mobile input) |
| Level reached (L2 / L3 / L4) per run | Where difficulty bites (R2.7 tuning) |
| Replay within 10 s of game over | Replay friction |
| Return visits (weekly) | Whether R3/R4 pull people back |
| Desktop vs mobile split and completion | Mobile problems (R2.8) |

**Tooling criteria:** cookieless, no personal data, aggregate counts, supports a few custom events, small script, acceptable cost. Netlify's built-in analytics is a paid add-on and server-side, so it has no custom events; a lightweight cookieless tool (e.g. Plausible, GoatCounter or Cloudflare Web Analytics, **verify current terms**) fits better. **Never** send typed text, and keep event names generic (`run_end` with level reached, words). Optionally, real-user Core Web Vitals via the small `web-vitals` library if the tool accepts custom events (check its size first); otherwise lab measurements (Lighthouse, §4.2) are enough.

---

## 14. Risk Register

*Likelihood/impact are my estimates, not measured.*

| # | Risk | L / I | Mitigation | Where |
|---|---|---|---|---|
| 1 | **Identity drift:** features pile up and the game stops being quiet | M / **H** | Guardrails (§1.1), filter (§1.2), one-new-element budget, review every PR against them | All releases |
| 2 | **Bad deploy reaches players** | M / H | Tests in the Netlify build, Deploy Previews, small releases, instant rollback | R0.2, §12 |
| 3 | **Stale app cached** after a release | L / M | Immutable hashed assets, HTML revalidates, no service worker unless needed (and then auto-update) | R0.3, R5 |
| 4 | **CSP breaks the site** | M / M | Test on preview; separate commit; fonts self-hosted first | R0.3, R0.4 |
| 5 | **Effects tire or sicken players** | M / H | Phase 2A safeguards: damping, budget, perf guard, reduced-motion, flash limits | R1 |
| 6 | **Added latency** makes typing feel worse | M / **H** | Effects before paint; no compositor animations while typing; per-key motion only during relaxed typing; measured per release (§6.1) | R1 |
| 7 | **Balance change alienates players** | M / M | Tested formula, playtest observation, changelog note | R2.7 |
| 8 | **Local data corrupt or blocked** | M / L | Versioned, validated, guarded storage; falls back to zeros | R2.4 |
| 9 | **Daily seed mismatch** between versions | M / M | `WORD_LIST_VERSION` in seed; pinned-sequence test | R4.1 |
| 10 | **Guilt-driven engagement creeps in** (streaks, reminders) | L / H | Explicitly rejected (§16) | R4 |
| 11 | **Mobile keyboard fails** on iOS/Android | **H** (unverified) / H | Real-device tests on every release; tap-to-type fallback | R2.8 |
| 12 | **Accessibility regression** | M / M | Per-release checklist; contrast re-measured; reduced motion | §12.4 |
| 13 | **Analytics privacy/compliance** | L / M | Cookieless, no personal data, disclosed; verify regional rules | R0.7 |
| 14 | **Dependency/bundle bloat** | M / M | Runtime deps stay React only; fonts and test tools are the only additions; size budget | R0.8 |
| 15 | **Leaderboard cheating or backend cost** | M / M | Replay validation, optional + flagged, limits and alerts | R6 |
| 16 | **Scope creep and overrun** | **H** / M | Time-box per release; unfinished work moves or drops; "Not planned" list | §3.1, §16 |
| 17 | **Unverified assumptions about the Netlify setup** | M / M | R0.1 audit first; nothing in `netlify.toml` applied before it | R0.1 |
| 18 | **Premature optimisation / complexity creep** | M / M | Measure-first rule; every change needs a before/after number; P4 time-boxed to ~1.5 days | §4.6 |
| 19 | **Render-pipeline rework changes core-loop timing** | M / **H** | Engine stays the only authority; every dispatch re-syncs; `nextDeadline` unit-tested incl. pause; old-vs-new equivalence test; E2E | P4 |
| 20 | **Framework swap (Preact) behaves differently** | L / M | Gated by data; E2E on three browsers and a real phone; Netlify rollback | P10 |
| 21 | **Font change causes reflow or invisible text** | M / M | `swap`, preload first-screen fonts, CLS ≤ 0.1 check | P3 |
| 22 | **Performance regresses over time** | M / M | CI size budgets, dev HUD, Lighthouse each release | P2, §12.4 |
| 23 | **Performance work eats the polish schedule** | M / M | Effort already added to R0/R1/R2/R5 (§4.5); gated items only on "go" | §4.5 |
| 24 | **Long words stay unreadable on small phones** | **H** (computed) / M | CSS sizing from word length; check at 320/360 px before each release | U15, R2.11 |

---

## 15. Decisions Needed

| # | Decision | Options | Recommendation | Needed by |
|---|---|---|---|---|
| D1 | Netlify settings (branch, command, Node) | Provide from the dashboard | Share them so R0.2 can match | R0.1 |
| D2 | Sound default | Off (now) / Low from first key press | **Low:** much of R1's impact is audio | R1 step 2 |
| D3 | Analytics tool | Plausible / GoatCounter / Cloudflare Web Analytics / none | A cookieless one; **none** means no baseline | R0.7 |
| D4 | Slang words | Keep / separate pool / remove | Keep a small amount | R3 |
| D5 | Calm mode | Build / skip | Decide after R2 data | R3 gate |
| D6 | Daily run | Build / skip | Build (cheap, no backend) if D3 shows return visits matter | R4 |
| D7 | Custom domain name | — | Owner's choice | R5 |
| D8 | Online features | Never / only on demand | Only on demand | After R5 |
| D9 | Purge `ICA.zip` (17 MB) from git history | Keep / purge with force-push | Purge before others clone | Any time |
| D10 | Swap React for Preact | No / yes | **No by default**; decide from the P1 real-device numbers | After R0 |
| D11 | Static first-paint shell for the ready screen (P9) | No / yes | Only if LCP > 2.5 s after fonts are fixed | After R0 |

---

## 16. Not Planned

Rejected because they conflict with the guardrails.

| Idea | Why not |
|---|---|
| Ads, pop-ups, newsletter prompts | G1 |
| Mandatory accounts or sign-in to play | G3 |
| Streak counters, "you missed a day", push notifications | G4: guilt-based engagement |
| In-game currency, loot, skins, battle pass | Off-identity; G2 |
| Multiplayer or real-time races | Large scope; off-identity |
| Background music loops | G1; revisit only as optional reactive sound after R1 |
| Heavy particles, full-screen effects | G1/G2 and the 2A safeguards |
| A settings menu with many options | G2: keep controls to sound and effects |
