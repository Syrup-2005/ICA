# ICA: Roadmap & Implementation Plan

> **Purpose:** a single overview of where ICA is, what comes next and why.
> **Details:** [`ICA-Project-Guide.md`](./ICA-Project-Guide.md) · **History:** [`../CHANGELOG.md`](../CHANGELOG.md)
> **Last updated:** 2026-11-06

---

## 1. At a Glance

```
 DONE                  NOW                 NEXT                      LATER                 OPTIONAL
 ─────────────────     ───────────────     ──────────────────────    ──────────────────    ─────────────────
 Phase 0  ✅           Step 0              Phase 2A                  Phase 2B              Phase 3
 Deployable build      Merge + verify      Typing Impact             Product Polish        Backend
 Phase 1  ✅           + soft launch       (game feel)               → v1.0 Public launch  (leaderboards)
 Refactor + tests      v0.2.0              v0.3.0                    v0.4.0 → v1.0
```

| Milestone | Version | Theme | Effort | Status |
|---|---|---|---|---|
| Phase 0 | 0.2.0 | Make it build and deploy | ~1 h | ✅ Done |
| Phase 1 | 0.2.0 | Clean architecture + tests + CI | 1–2 days | ✅ Done |
| **Step 0** | 0.2.0 | Merge, verify, soft launch | ~half a day | ▶ **Next** |
| Phase 2A | 0.3.0 | Typing feels weighty and impactful | ~5 days | Planned |
| Phase 2B | 0.4.0 | Summary, balance, mobile, polish | ~4–5 days | Planned |
| Launch | 1.0.0 | Custom domain, public release | ~half a day | Planned |
| Phase 3 | 1.x | Leaderboards, accounts, analytics | TBD | Optional |

---

## 2. Where We Are (v0.2.0)

| Area | State |
|---|---|
| Build | ✅ Passes |
| Tests | ✅ 30 unit tests (game rules, pause regression, word lists) |
| CI | ✅ GitHub Actions: tests + build on every push/PR |
| Architecture | ✅ Pure engine (`src/game/`), hooks, screen components |
| Code location | Branch `phase-1-refactor` (not yet merged into `main`) |
| Hosting | ❌ Not deployed yet |
| Manual browser check | ❌ Not done yet (focus, sound, shake) |

**In short:** the code base is healthy and safe to build on. Nothing is public yet.

---

## 3. Step 0: Merge, Verify, Soft Launch ▶ NEXT

**Why first:** everything after this builds on `main`. Deploying early gives a real URL to test on phones and share with playtesters, which Phase 2A needs for tuning.

| # | Task | Why | Done when |
|---|---|---|---|
| 0.1 | Manual play-through (`npm run dev`) | Tests cover rules, not browser behaviour | Start, type, mistakes, pause/resume, game over and play again all work; sound toggles |
| 0.2 | Push branch, open PR, merge into `main` | Gets the work into the main line, checked by CI | CI green; merged |
| 0.3 | Enable branch protection on `main` (require CI) | Stops broken code being merged | Setting on in GitHub |
| 0.4 | Connect Cloudflare Pages (guide §10.3) | A free, automatic deploy on every push | Live at `https://<project>.pages.dev` |
| 0.5 | Tag `v0.2.0` | A fixed point to compare against later | Tag pushed |
| 0.6 | **Decide sound default** (see §8) | Blocks Phase 2A step 2 | Decision recorded |

---

## 4. Phase 2A: Typing Impact (v0.3.0) · ~5 days

**Goal:** every keystroke feels physical: a weighty "thock", words that clunk into place, combos that build tension. It must stay true to ICA's quiet, minimal identity: *weight, not noise*.

**Why now:** this is the most noticeable improvement for players. Phase 2B's game-over screen and accessibility work reuse its effects and settings.

| Step | Work | Explanation | Done when |
|---|---|---|---|
| 1 | Effects before paint | Sound currently plays one frame late; fix responsiveness before adding anything | Key → sound/visual within one frame |
| 2 | New sound engine | Replace "beeps" with a synthesised key "thock", word "chunk" and combo pitch ladder; voice limit and compressor prevent harshness | 100+ WPM bursts sound smooth, with no clipping |
| 3 | Letter & word animation | Typed letters "press"; wrong letters appear struck through and drop; words punch out | No input delay; untyped letters never move |
| 4 | Combo escalation | Combo pop, break sound, milestone every 10 (adds one engine event + test) | Tests pass; big effects never stack |
| 5 | Danger state | Heartbeat + meter pulse when survival < 1.5 s | Noticeable but not annoying over 5 minutes |
| 6 | Controls & safety | EFFECTS (Full/Subtle/Off), volume, reduced-motion support, Android haptics, performance guard | OS reduced motion → Subtle; slow device → auto-Subtle |
| 7 | Playtest & tune | Feel is tuned by playing, using one config file | 3+ players prefer it over v0.2.0 |

**Built-in safeguards:** cadence damping, effect budget, performance guard, flash limits, reduced-motion fallback (guide §9, 2A.4).

---

## 5. Phase 2B: Product Polish (v0.4.0) · ~4–5 days

**Goal:** close the remaining gaps from the audit and make the game ready to share.

| Task | Explanation | Audit issue |
|---|---|---|
| Game-over summary | Show words, best combo, accuracy, time, WPM and "new best!", so players see their progress and want another run | #7 |
| Survival balance | Refill time scales with word length, so level 4 (13–16 letters) is hard but fair | #5 |
| Mobile input | A visible tap area so the phone keyboard reliably opens | #4 |
| Self-hosted fonts | Faster first load; no visitor data sent to Google | #8 |
| Accessibility | Screen readers announce the word; visible keyboard focus | — |
| Sharing assets | Favicon, preview image for social links, web manifest | — |
| End-to-end test | One automated browser test of a full run | Deferred from Phase 1 |

**Order inside 2B:** balance → summary → mobile → fonts → accessibility → sharing → E2E test.

---

## 6. Public Launch (v1.0.0) · ~half a day

**Goal:** ICA on its own domain with HTTPS, security headers and a checked release.

| Task | Explanation |
|---|---|
| Buy and connect a domain | e.g. `ica.yourdomain.com` via Cloudflare Pages (auto-HTTPS) |
| Add `public/_headers` | Caching + security headers (guide §10.3) |
| Pre-launch checklist | Browsers, mobile, Lighthouse, headers (guide §10.5) |
| Release | Update the changelog, bump to `1.0.0`, tag, announce |

**Why after 2B:** first impressions count. Launch publicly once the game feels good and works on phones. The soft-launch URL from Step 0 covers testing until then.

---

## 7. Phase 3: Optional Backend (v1.x)

Only if there is demand after launch.

| Feature | Explanation | Main consideration |
|---|---|---|
| Global leaderboard | Compare best combos/scores worldwide | Scores sent from the browser can be faked; add server checks or keep it casual |
| Accounts | Keep progress across devices | Adds privacy and login work |
| Analytics | Learn how long people play and where they quit | Choose a privacy-friendly tool (Plausible / Cloudflare) |

**Possible future ideas:** sound packs, particle effects, reactive backgrounds/music, daily challenge word set, custom word lists, themes.

---

## 8. Open Decisions

| Decision | Options | Recommendation | Needed by |
|---|---|---|---|
| Sound default | Off (current) / Low on first key press | **Low:** most of 2A's impact is audio | Phase 2A step 2 |
| Hosting | Cloudflare Pages / Netlify / Vercel | **Cloudflare Pages** | Step 0.4 |
| Domain name | — | Your choice | Launch |
| Purge `ICA.zip` from git history | Keep / Purge (force-push) | Purge before others clone the repo, or leave it | Any time |

---

## 9. How Work Gets Done

| Practice | Rule |
|---|---|
| Branches | One branch per phase or step; never commit directly to `main` |
| Changes | Small commits; each builds and passes tests |
| Review | Pull request → CI green → preview URL checked → merge |
| Game rules | Change them only in `src/game/engine.ts`, with a test |
| Feel tuning | Only in `src/feel/config.ts` (from Phase 2A) |
| Tracking | Every release updates `CHANGELOG.md` and `package.json` version, plus a git tag |
| Scope | Anything not in the current phase goes to "future ideas" (§7) |

---

## 10. Dependencies

```
Step 0 ──▶ Phase 2A ──▶ Phase 2B ──▶ v1.0 Launch ──▶ Phase 3 (optional)
  │            │            ▲
  │            └────────────┘  2B reuses 2A's effects + settings
  └── soft-launch URL used for 2A playtesting and mobile checks
```

| Item | Depends on |
|---|---|
| Phase 2A step 2 (sounds) | Sound-default decision |
| 2B game-over "new best!" | 2A tier-3 effect |
| 2B accessibility | 2A EFFECTS setting |
| v1.0 launch | 2B mobile + fonts done; domain purchased |
| Phase 3 | v1.0 live; real player demand |
