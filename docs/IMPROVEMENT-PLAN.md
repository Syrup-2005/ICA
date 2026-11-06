# ICA: Improvement Plan (UX & Player Engagement)

> **Baseline:** v0.2.0, live on Netlify · **Scope:** improvements, polish and engagement features after Phase 1
> **Companions:** [`ROADMAP.md`](./ROADMAP.md) (overview) · [`ICA-Project-Guide.md`](./ICA-Project-Guide.md) (architecture, Phase 2A detail) · [`../CHANGELOG.md`](../CHANGELOG.md)
> **Last updated:** 2026-11-06 · **Status:** plan only, nothing in this document has been implemented yet

---

## Contents

1. [The Idea to Protect](#1-the-idea-to-protect)
2. [Starting Point](#2-starting-point)
3. [Release Plan at a Glance](#3-release-plan-at-a-glance)
4. [R0 · v0.2.1 Foundation](#4-r0--v021-foundation)
5. [R1 · v0.3.0 Typing Impact](#5-r1--v030-typing-impact)
6. [R2 · v0.4.0 Run Experience](#6-r2--v040-run-experience)
7. [R3 · v0.5.0 Content & Variety](#7-r3--v050-content--variety)
8. [R4 · v0.6.0 Return Loops (optional)](#8-r4--v060-return-loops-optional)
9. [R5 · v1.0.0 Launch](#9-r5--v100-launch)
10. [R6 · Online Features (gated)](#10-r6--online-features-gated)
11. [Netlify Operations](#11-netlify-operations)
12. [Measuring Engagement](#12-measuring-engagement)
13. [Risk Register](#13-risk-register)
14. [Decisions Needed](#14-decisions-needed)
15. [Not Planned](#15-not-planned)

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

### 1.2 Feature Filter (apply to every item and every PR)

1. Does it respect G1–G6? (Any "no" → reject or redesign.)
2. Does it help the player **type, improve, or come back by choice**?
3. Can it be switched off, or ignored, without losing anything?
4. Is it testable (engine rule + unit test, or a manual check in the release checklist)?
5. Is it worth its weight: bundle size, code, ongoing maintenance?

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
| No `netlify.toml` in the repo | ✅ Verified. Netlify runs on dashboard settings. |
| Netlify's build command, publish directory, Node version, deploy branch | ❓ **Not visible to me.** Check the Netlify dashboard (task R0.1). |
| Behaviour on real phones and in Safari/Firefox | ❓ Never tested; only unit-tested and built |
| Browser play-through of v0.2.0 (focus, sound, shake) | ❓ Not recorded as done |

### 2.2 Gaps found in the code

| # | Gap | Evidence | Effect on the player |
|---|---|---|---|
| U1 | **Switching tabs loses the run** | No `visibilitychange`/`blur` handling; the clock is `Date.now()`-based | A 6-second glance at another tab can end the game |
| U2 | **Low-contrast text** | Measured on `#090909`: untyped letters `#555` = **2.67:1**; small labels `#484848` / `#555` / `#656565` / `#666` = 2.2–3.5:1 (WCAG needs 3:1 for large text, 4.5:1 for small) | The upcoming letters, the thing you read most, are hard to see; labels are 8–11 px |
| U3 | **Game-over shows one number** | `GameOverScreen.tsx`: only "words completed" | No sense of progress or near-miss |
| U4 | **Replay takes two steps** | Play again → ready screen → press a key | Friction between runs |
| U5 | **Pause can't be undone by keyboard** | Esc pauses but only the RESUME button resumes | Breaks the keyboard flow |
| U6 | **The combo window is invisible** | `engine.comboTimer` exists but the UI doesn't show it | Combos feel random: it just resets |
| U7 | **Rules are never explained** | Ready screen: title + "press any key" | New players don't know mistakes cost time |
| U8 | **Flat 5 s refill** | `MAX_HEALTH` for every word length | A 4-letter word is easy; a 16-letter word needs ~40 WPM with no errors |
| U9 | **Small word pools** | 47 / 49 / 48 / **31** words per level; level 4 is endless | Repeats become obvious within minutes |
| U10 | **Mobile keyboard unverified** | Hidden input with `pointer-events: none` | May not open on iOS Safari |
| U11 | **No identity assets** | No favicon, preview image or manifest in `index.html` | Weak first impression, bare link previews |
| U12 | **Remote fonts** | `@import` from Google Fonts | Render-blocking; visitor IPs go to Google |
| U13 | **Tone mismatch (to decide)** | Level 1 mixes calm words (`drift`, `hush`) with slang (`rizz`, `yeet`, `simp`) | Slang may clash with the "quiet" feel. A brand decision, not a bug. |
| U14 | **Footer vs mechanic (to decide)** | Footer says "TYPE AT YOUR OWN PACE"; the survival meter sets the pace | Possible mismatch, which an optional calm mode would resolve (§7.3) |

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
| **R0** | 0.2.1 | Netlify hardening, safety net, measurement, quick fairness wins | ~1.5 days | U1, U11, U12 |
| **R1** | 0.3.0 | Typing impact (full plan in guide §9 · Phase 2A) | ~5 days | feel |
| **R2** | 0.4.0 | Results, replay flow, readability, balance, mobile | ~5 days | U2–U8, U10 |
| **R3** | 0.5.0 | Bigger vocabulary, tone decision, optional calm mode | ~3 days | U9, U13, U14 |
| **R4** | 0.6.0 | Daily run, share, local stats (all optional) | ~4 days | engagement |
| **R5** | 1.0.0 | Custom domain, audit, final polish | ~2 days | launch |
| **R6** | 1.x | Leaderboard etc. (only on demand) | TBD | — |

\*Rough estimates for one developer; each release is time-boxed. Unfinished items move to the next release or are dropped, never allowed to stretch the release.

**Why this order:** R0 makes shipping safe and measurable. R1 does the most for how the game *feels*. R2 turns a good run into a satisfying result and quick replay. R3 and R4 add reasons to come back, so they come only after the core is solid.

### 3.1 Rules for every release

- Branch → PR → CI green → **Netlify Deploy Preview** checked → merge → auto-deploy.
- Update `CHANGELOG.md`, bump `package.json` version (footer follows), tag `vX.Y.Z`.
- Game rules change only in `src/game/engine.ts`, with a test.
- Release checklist (§11.4): keyboard-only run, reduced-motion check, one real phone, contrast check, bundle size.

---

## 4. R0 · v0.2.1 Foundation

**Goal:** make production safe to change, and fix what loses players' runs unfairly, before adding anything.

| # | Task | Why | Approach | Risk → mitigation |
|---|---|---|---|---|
| R0.1 | **Audit the Netlify setup** | Config is invisible to the repo | Record build command, publish dir, Node version, production branch, deploy-preview setting, domain. Put it in the guide. | none |
| R0.2 | **Add `netlify.toml`** | Settings versioned with the code; tests gate every deploy | See §11.1. Build command `npm test && npm run build`. | It overrides dashboard settings → do R0.1 first and compare; ship in its own PR with a Deploy Preview |
| R0.3 | **Security & cache headers** | Safe defaults, fast repeat visits | `[[headers]]` in `netlify.toml` (§11.1) | A strict CSP can break the page → test on the preview; CSP in its own commit so it's easy to revert |
| R0.4 | **Self-host fonts** (U12) | Removes the render-blocking request and the Google dependency; lets CSP be strict | `@fontsource/manrope` + `@fontsource/dm-mono` (only the weights used: 400/500, 400–800), imported in `main.tsx`; remove the `@import` | +2 build-time dependencies; ~font file size → subset to Latin, check bundle |
| R0.5 | **Auto-pause when the tab is hidden or the window loses focus** (U1) | A run shouldn't end because you looked away. Fairness first. | Shell listens to `visibilitychange` and `blur`, dispatches the existing `pause` event. **Never auto-resume**; the player resumes. | False pauses (e.g. DevTools) → acceptable, since typing wouldn't register anyway; verify iOS Safari doesn't pause on keyboard open |
| R0.6 | **Identity assets** (U11) | First impression and link previews | Favicon (SVG), `og:title/description/image` (1200×630 monochrome card), `theme-color` already present | OG image must not misrepresent the game → generate from the real UI |
| R0.7 | **Privacy-friendly measurement** (§12) | Can't improve engagement without a baseline | Cookieless analytics + a few aggregate events | Privacy/compliance → no cookies, no personal data, no typed content; disclose in footer; verify local rules |
| R0.8 | **Bundle budget** | Prevent silent bloat | Record current size (**73 kB gzipped JS**); proposed budget 85 kB; checked in each release | none |

**Done when:** Netlify deploy fails if tests fail (proven with a deliberately failing test on a preview branch); headers verified in the browser; switching tabs mid-run pauses; favicon and preview card show; analytics shows a page view; fonts load from the site itself.

---

## 5. R1 · v0.3.0 Typing Impact

Fully planned in **guide §9 · Phase 2A** (feedback ladder, sound synthesis, safeguards, build order). Not repeated here. Items added by this plan:

| Addition | Reason |
|---|---|
| **Fade the COMBO number as its window closes** (U6) | Makes the invisible 3 s window visible without adding an element (G2). Uses `engine.comboTimer`. Do it in 2A step 4. |
| **Sound default decision** (§14) | Most of the impact is audio |
| Effects respect **R0.5 auto-pause** | No effects keep firing while paused |

---

## 6. R2 · v0.4.0 Run Experience

**Goal:** a run ends with a clear, kind result and a one-key way to go again. This is the strongest "one more run" lever that fits ICA.

### 6.1 Items

| # | Task | UX / engagement value | Approach | Risk → mitigation |
|---|---|---|---|---|
| R2.1 | **Result screen** (U3) | Shows progress and near-misses | Show **words, best combo, accuracy, time, WPM**, plus "NEW BEST" or "N words from your best". Same layout style as now, no extra buttons beyond PLAY AGAIN (and SHARE in R4). | Clutter → max 5 figures, quiet typography. WPM = `correctCharacters / 5 ÷ active minutes`, hidden ("—") for runs under 5 s so tiny runs don't show absurd numbers |
| R2.2 | **Instant replay** (U4) | Removes friction between runs | `Enter`/`Space`/click on game over starts a fresh run directly (new engine event `playAgain`) | Fast typists skip the result by accident → **0.7 s input lock** after game over (tune in playtest) |
| R2.3 | **Esc / Enter resumes** (U5) | Keyboard flow | Extend the existing key handler to the `paused` screen | none |
| R2.4 | **Personal bests (local)** | Mastery without accounts | `ica-stats` JSON: best words, best WPM, best combo, total runs. Extends `storage.ts`. | Corrupt/blocked storage → **versioned schema** (`v:1`), validated and clamped on read, falls back to zeros, never throws |
| R2.5 | **Readability pass** (U2) | The core text is hard to read | Raise colours, keep the hierarchy: untyped letters `#555 → #666+` (≥3:1, large text); small labels to `#7a7a7a` (4.6:1, AA); minimum label size 11 px (mobile too) | Loses the "quiet" look → change values only, not layout; compare before/after screenshots; keep typed vs untyped contrast obvious |
| R2.6 | **One-line rules hint** (U7) | New players understand what's going on | One muted line on the ready screen: *"Finish each word before the line runs out. Mistakes cost time."* | Clutter → one line, no tutorial or modal (G1) |
| R2.7 | **Length-scaled survival** (U8) | Fair difficulty at every level | Engine: per-word refill `base + perLetter × length`. Starting guess: ~2.0 s + 0.3 s/letter (4 letters ≈ 3.2 s, 15 ≈ 6.5 s). Meter width = time ÷ that word's capacity. | Feels different to returning players → tune with 5–10 playtesters watching where runs end; unit tests pin the formula; note bests set under v0.3 rules in the changelog |
| R2.8 | **Mobile input** (U10) | Phone players can start typing at all | A visible "tap to type" area; focus the input **synchronously inside the tap**; `100dvh` layout so the word stays above the on-screen keyboard | Can't be verified without devices → test iOS Safari + Android Chrome via **Deploy Preview URL** before release; fallback = tap area re-focuses on every tap |
| R2.9 | **Screen-reader & focus basics** | G6 | Word announced via a polite `aria-live` region on change (not per keystroke); visible focus outlines | Chatty announcements → announce word change only |
| R2.10 | **E2E smoke test** | Catches wiring bugs unit tests can't | One Playwright test: start, type a word, WORDS = 1 (dev dependency only) | Flaky tests → drive time via the engine, keep the test short; if it flakes, quarantine, don't ignore |

### 6.2 Code changes

| Area | Change |
|---|---|
| `game/engine.ts` | `refillFor(word)`, `playAgain` event, `startBest` (for "new best"), `getWpm(state)` helper. All tested. |
| `components/GameOverScreen.tsx` | Result figures, replay handling |
| `storage.ts` | Versioned `ica-stats` |
| `styles.css` | Contrast values, min sizes, tap area |
| `App.tsx` | Key handling for paused / game over, input lock |

**Done when:** result screen shows all figures with a "new best" case tested; replay is one key press and the lock prevents accidental skips; contrast ≥ targets (re-measured); a full run works on one iPhone and one Android phone; E2E passes in CI; all unit tests pass.

---

## 7. R3 · v0.5.0 Content & Variety

**Goal:** a run stays fresh, and the game's tone is deliberate.

### 7.1 Larger word pools (U9)

| Item | Detail |
|---|---|
| Target | ~120+ words per level, ~100 at level 4, so a long run doesn't visibly cycle |
| Rules | Existing test-enforced length bands (L1 3–7, L2 5–8, L3 9–12, L4 13+); lowercase a–z only; no duplicates |
| Quality | Hand-curated, no offensive or ambiguous words; common words dominate; spelling unambiguous (no US/UK variants) |
| Risk | Content errors slip in → add a test for the rules above, and review the diff by eye. Don't generate lists from an uncurated dictionary. |

### 7.2 Tone decision (U13)

Decide whether the slang words (`rizz`, `yeet`, `simp`, `noob` …) fit the brand. Options: **keep** (playful), **move to a separate "playful" pool** (e.g. mixed in at lower probability), or **remove** (fully calm). Recommendation: keep a small amount, since it gives the game personality, but make this an explicit choice. Ask the owner before changing.

### 7.3 Calm mode (decision gate)

The footer promises "type at your own pace", while the survival meter forces one. An optional **Calm** mode would honour the promise: no drain, no game over, the same word flow, feedback and combo rhythm; the player ends the session.

| Aspect | Detail |
|---|---|
| Value | Warm-up, relaxed play, accessibility for players who find timers stressful, and a gentler first experience |
| Cost | The only item in this plan that changes the core rules: engine `mode` flag, a mode switch on the ready screen, separate best stats |
| Risk | Dilutes the arcade tension; splits effort and statistics → **decision gate**: build only after R2 data and playtest feedback show demand; keep it one switch, not a settings menu |

**Done when:** pools meet size and rule tests; tone decision recorded; calm-mode go/no-go recorded (built only if "go").

---

## 8. R4 · v0.6.0 Return Loops (optional)

**Goal:** give players reasons to return *by choice*. Every item is optional, local, and can be ignored (G3, G4).

| # | Task | Value | Approach | Risk → mitigation |
|---|---|---|---|---|
| R4.1 | **Daily run** | A shared challenge with no backend | `dailySeed(date)` = hash of `WORD_LIST_VERSION` + **UTC date**. The engine already takes a `seed` and draws words deterministically, so every player gets the same words that day. Entry: a quiet text link on the ready screen. Local best per day. | **FOMO/guilt** → no streak, no "you missed a day", no reminders. **Version drift** (cached old build, edited word list) → `WORD_LIST_VERSION` in the seed; a test pins the first 10 words for a fixed date |
| R4.2 | **Share result** | Word of mouth without accounts | Button on the result screen: text like `ICA · 42 words · 9x combo · 94%` + site URL, via `navigator.share` when available, otherwise clipboard. | Permissions/unsupported → fall back to clipboard, then to a visible selectable text. No personal data. Never prompt automatically (G1). |
| R4.3 | **Lifetime stats view** | Mastery over time | A small, quiet screen from the ready screen: runs, total words, bests. Local only. | Clutter → text-only, one screen, no charts; "reset stats" with a confirmation |
| R4.4 | **Near-miss message** | Motivation | "3 words from your best", from R2 data | Nagging → show once on the result screen only |

**Done when:** two browsers on the same UTC date get identical word sequences (verified by test and by hand); sharing works on desktop and mobile; stats survive reload and handle corrupted storage; nothing prompts, interrupts, or counts missed days.

---

## 9. R5 · v1.0.0 Launch

| Task | Detail |
|---|---|
| **Custom domain** | Netlify → Domain management. Use a CNAME/ALIAS or Netlify DNS; HTTPS certificate is automatic. Set one primary domain and redirect the others. |
| **Update CSP/OG URLs** | Absolute URLs for the new domain |
| **Accessibility audit** | Keyboard-only run; screen reader pass; reduced motion; contrast re-measure; Lighthouse accessibility ≥ 90 as a target |
| **Performance audit** | Lighthouse performance on a throttled mobile profile; bundle within budget |
| **Cross-browser check** | Chrome, Firefox, Safari (macOS + iOS), Android Chrome |
| **Installable (optional)** | Web manifest + icons. An offline service worker only if wanted, and only with auto-update, since a stale cached build is the main risk |
| **Release** | Changelog, `1.0.0`, tag, announce |

**Why last:** a public launch is a first impression, and R1–R3 are what make that impression good. Before then the Netlify URL is enough for testing.

---

## 10. R6 · Online Features (gated)

**Only if** R4 data shows people return and ask for it. Requires an explicit go decision and breaks G3 *unless built as optional*.

| Feature | Approach | Risks → mitigations |
|---|---|---|
| **Global leaderboard** | Netlify Functions + a small data store (e.g. Netlify Blobs or a hosted DB; check current limits and terms). Optional nickname, **no accounts**. | **Cheating:** client scores can be faked. Because the engine is a pure reducer, the server can **replay the submitted input log** and reject impossible runs (e.g. beyond a human WPM ceiling). Scripted bots can still pass, so keep the board casual and label it. |
| | | **Backend down:** feature flag via build env var; the game never depends on it |
| | | **Abuse/privacy:** rate limiting, profanity filter on nicknames, no personal data, privacy notice |
| | | **Cost:** set usage limits and alerts |
| **Daily leaderboard** | Same stack, keyed by the daily seed | Same as above |

---

## 11. Netlify Operations

### 11.1 Proposed `netlify.toml` (R0.2/R0.3, **not yet applied**)

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

### 11.2 What Netlify gives us, and how it's used

| Feature | Use |
|---|---|
| **Deploy Previews** (one URL per PR) | Test on real phones and share with playtesters before merging |
| **Failed build keeps the last good deploy live** | With tests in the build command, a bad merge can't take the site down |
| **Instant rollback** (publish an earlier deploy) | First response to a bad release; then fix forward |
| **Build env vars** | Feature flags (e.g. `VITE_ENABLE_DAILY`) to ship dark and switch on |
| **Functions / Blobs** | Only for R6 |

### 11.3 Release flow

```
feature branch ─▶ PR ─▶ GitHub CI (test+build) ─┬─▶ Netlify Deploy Preview ─▶ manual check (desktop + phone)
                                                 └─▶ review ─▶ merge to main ─▶ Netlify builds (tests+build) ─▶ live
                                                                                  └─ tag vX.Y.Z · changelog · (rollback if needed)
```

### 11.4 Per-release checklist

- [ ] Tests, build and CI green; Deploy Preview works
- [ ] Full run on desktop with keyboard only
- [ ] Full run on one iPhone and one Android phone (Preview URL)
- [ ] Reduced-motion on: no shake/kick
- [ ] Contrast re-measured for any colour change
- [ ] Bundle size within budget
- [ ] Changelog + version + tag
- [ ] Rollback target noted (previous deploy)

---

## 12. Measuring Engagement

Without numbers, "engagement" is opinion. Aim for a **baseline within two weeks** of R0, and set targets only after that. Don't invent targets beforehand.

| Metric | What it tells us |
|---|---|
| Runs per visit | Is "one more run" working? (R2) |
| Share of visits with at least one completed word | Do people understand how to start? (rules hint, mobile input) |
| Level reached (L2 / L3 / L4) per run | Where difficulty bites (R2.7 tuning) |
| Replay within 10 s of game over | Replay friction |
| Return visits (weekly) | Whether R3/R4 pull people back |
| Desktop vs mobile split and completion | Mobile problems (R2.8) |

**Tooling criteria:** cookieless, no personal data, aggregate counts, supports a few custom events, small script, acceptable cost. Netlify's built-in analytics is a paid add-on and server-side, so it has no custom events; a lightweight cookieless tool (e.g. Plausible, GoatCounter or Cloudflare Web Analytics, **verify current terms**) fits better. **Never** send typed text, and keep event names generic (`run_end` with level reached, words).

---

## 13. Risk Register

*Likelihood/impact are my estimates, not measured.*

| # | Risk | L / I | Mitigation | Where |
|---|---|---|---|---|
| 1 | **Identity drift:** features pile up and the game stops being quiet | M / **H** | Guardrails (§1.1), filter (§1.2), one-new-element budget, review every PR against them | All releases |
| 2 | **Bad deploy reaches players** | M / H | Tests in the Netlify build, Deploy Previews, small releases, instant rollback | R0.2, §11 |
| 3 | **Stale app cached** after a release | L / M | Immutable hashed assets, HTML revalidates, no service worker unless needed (and then auto-update) | R0.3, R5 |
| 4 | **CSP breaks the site** | M / M | Test on preview; separate commit; fonts self-hosted first | R0.3, R0.4 |
| 5 | **Effects tire or sicken players** | M / H | Phase 2A safeguards: damping, budget, perf guard, reduced-motion, flash limits | R1 |
| 6 | **Added latency** makes typing feel worse | M / **H** | Effects before paint, transform/opacity only, measured per release | R1 |
| 7 | **Balance change alienates players** | M / M | Tested formula, playtest observation, changelog note | R2.7 |
| 8 | **Local data corrupt or blocked** | M / L | Versioned, validated, guarded storage; falls back to zeros | R2.4 |
| 9 | **Daily seed mismatch** between versions | M / M | `WORD_LIST_VERSION` in seed; pinned-sequence test | R4.1 |
| 10 | **Guilt-driven engagement creeps in** (streaks, reminders) | L / H | Explicitly rejected (§15) | R4 |
| 11 | **Mobile keyboard fails** on iOS/Android | **H** (unverified) / H | Real-device tests on every release; tap-to-type fallback | R2.8 |
| 12 | **Accessibility regression** | M / M | Per-release checklist; contrast re-measured; reduced motion | §11.4 |
| 13 | **Analytics privacy/compliance** | L / M | Cookieless, no personal data, disclosed; verify regional rules | R0.7 |
| 14 | **Dependency/bundle bloat** | M / M | Runtime deps stay React only; fonts and test tools are the only additions; size budget | R0.8 |
| 15 | **Leaderboard cheating or backend cost** | M / M | Replay validation, optional + flagged, limits and alerts | R6 |
| 16 | **Scope creep and overrun** | **H** / M | Time-box per release; unfinished work moves or drops; "Not planned" list | §3.1, §15 |
| 17 | **Unverified assumptions about the Netlify setup** | M / M | R0.1 audit first; nothing in `netlify.toml` applied before it | R0.1 |

---

## 14. Decisions Needed

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

---

## 15. Not Planned

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
