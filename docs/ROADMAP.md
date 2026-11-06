# ICA: Roadmap

> **Purpose:** one-page overview of where ICA is and what comes next.
> **Detail:** [`IMPROVEMENT-PLAN.md`](./IMPROVEMENT-PLAN.md) (tasks, risks, Netlify) · [`ICA-Project-Guide.md`](./ICA-Project-Guide.md) (architecture, Phase 2A) · [`../CHANGELOG.md`](../CHANGELOG.md)
> **Last updated:** 2026-11-06 · **Hosting:** Netlify

---

## 1. At a Glance

```
 DONE                    NEXT                    THEN                     LATER                 OPTIONAL
 ──────────────────      ───────────────────     ───────────────────      ──────────────────    ─────────────────
 Phase 0 ✅              R0 v0.2.1               R1 v0.3.0                R3 v0.5.0             R6 Online
 Phase 1 ✅              Foundation              Typing Impact            Content & Variety     (leaderboard,
 v0.2.0 live ✅          (Netlify, safety,       R2 v0.4.0                R4 v0.6.0             only on demand)
                         measurement)            Run Experience           Return Loops
                                                                          R5 v1.0.0 Launch
```

| Release | Version | Theme | Effort | Status |
|---|---|---|---|---|
| Phase 0 + 1 | 0.2.0 | Working build, clean architecture, 30 tests, CI | done | ✅ Merged (PR #1), live on Netlify |
| **R0** | 0.2.1 | Netlify hardening, right-sized fonts, auto-pause, identity assets, measurement, size budgets | ~2 days | ✅ On branch `r0-foundation` (R0.1, R0.7 need input) |
| **R1** | 0.3.0 | Render pipeline first, then typing impact: weighty keystrokes (guide §9 · Phase 2A) | ~6.5 days | Planned |
| **R2** | 0.4.0 | Result screen, instant replay, readability, balance, mobile, small-screen fit | ~5.5 days | Planned |
| **R3** | 0.5.0 | Bigger vocabulary, tone decision, calm-mode gate | ~3 days | Planned |
| **R4** | 0.6.0 | Daily run, share, local stats (optional) | ~4 days | Planned |
| **R5** | 1.0.0 | Custom domain, audits, launch | ~2.5 days | Planned |
| **R6** | 1.x | Online features | TBD | Gated |

*Estimates are rough, for one developer, and each release is time-boxed.*

---

## 2. Where We Are (v0.2.0)

| Area | State |
|---|---|
| Build / tests / CI | ✅ passes · 30 unit tests · GitHub Actions on every push/PR |
| Architecture | ✅ Pure engine (`src/game/`), hooks, screen components |
| Hosting | ✅ Netlify; `netlify.toml` added in R0 (not merged yet) |
| Size | JS 72.1 kB gzip, of which React is 67.5 kB; ICA's own code ≈ 4.6 kB |
| Not yet known | ❓ Runtime performance (Lighthouse, frame rate), real-phone behaviour, Safari/Firefox, Netlify dashboard settings |

---

## 3. What Each Release Delivers

| Release | Player sees | Behind the scenes |
|---|---|---|
| **R0** | Run no longer lost by switching tabs; favicon and link preview; faster first load (≈ 39 kB of self-hosted fonts instead of a third-party chain) | Tests gate every deploy, security/cache headers, CI size budgets, performance baseline, privacy-friendly analytics |
| **R1** | Keystrokes with weight: "thock", letters that press, rising combo pitch, danger pulse | Idle React rendering ≈ 0/s instead of 20/s, compositor-driven meter, sound synthesis, effect budget, performance guard, reduced-motion support |
| **R2** | Result screen with WPM, accuracy and "new best"; replay in one key; readable text; fair difficulty; works on phones, long words fit small screens | Length-scaled survival, versioned local stats, contrast fixes, E2E test |
| **R3** | Fresher words in long runs; deliberate tone; optional calm mode (if approved) | Curated word pools with enforced rules |
| **R4** | Optional daily run, shareable result, lifetime stats | Seeded daily word sequence (no backend) |
| **R5** | ICA on its own domain | Audits (accessibility, performance, browsers) |
| **R6** | Optional leaderboard | Netlify Functions + data store, replay validation |

---

## 4. Guardrails (apply to everything)

Quiet · one word, minimal screen · playable with no account or network · the player's own pace · instant · accessible · light and smooth.
Performance baseline, budgets and tasks: [`IMPROVEMENT-PLAN.md` §4](./IMPROVEMENT-PLAN.md).
Full list, feature filter and "not planned" items: [`IMPROVEMENT-PLAN.md` §1 and §16](./IMPROVEMENT-PLAN.md).

---

## 5. Working Practice

| Practice | Rule |
|---|---|
| Flow | Branch → PR → CI green → **Netlify Deploy Preview** checked on desktop + phone → merge → auto-deploy |
| Safety | Netlify build runs the tests (from R0); rollback = publish the previous deploy |
| Rules | Game rules change only in `src/game/engine.ts`, with a test |
| Tracking | Each release: `CHANGELOG.md`, `package.json` version, git tag |
| Scope | Not in the current release → "future ideas" or dropped; time-box every release |

---

## 6. Open Decisions

Full table (with options and recommendations): [`IMPROVEMENT-PLAN.md` §15](./IMPROVEMENT-PLAN.md).

| Decision | Needed by |
|---|---|
| Share the Netlify settings (branch, build command, Node version) | R0 start |
| Sound default (recommended: low, from the first key press) | R1 |
| Analytics tool (cookieless) or none | R0 |
| Keep or change the slang words | R3 |
| Swap React for Preact (recommended: no, unless the baseline misses the budgets) | after R0 |
| Calm mode: build or skip | R3 gate |
| Custom domain name | R5 |

---

## 7. Dependencies

```
R0 ──▶ R1 ──▶ R2 ──▶ R3 ──▶ R4 ──▶ R5 ──▶ R6 (optional)
 │      │      ▲
 │      └──────┘  R2 reuses R1's effects and settings ("new best" effect, effects toggle)
 └── R0 analytics baseline informs R2 balance and the R3/R4 go/no-go decisions
```
