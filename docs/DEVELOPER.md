# ICA — Developer Guide

How the code is built and where to change things. To get it running, see `README.md`. For history, roadmap and the reasoning behind decisions, see `ICA-Project-Guide.md` and `IMPROVEMENT-PLAN.md`.

---

## 1. Design principles

These rules drive most of the code. Changes should keep them.

| Principle | In practice |
|---|---|
| **Calm first** (guardrail G1) | Movement is capped at 3 px. Only the word area moves. No flashing, no music in Arcade. Zen's ambient pad is optional and fades in and out. |
| **One new element per feature** (G2) | Settings go into existing controls (the `SOUND` and `FX` cycles, the start-screen pickers), not new panels. |
| **Keystroke latency is the budget** | Nothing per keystroke may delay the next paint. Effects animate colour and `top`/`left`, not `transform`/`opacity` (measured, §6). |
| **Pure core, thin shell** | Game rules are one pure reducer. Time, randomness, DOM and audio are injected from outside. |
| **No backend, no third parties** | Self-hosted fonts, synthesised audio, `localStorage` only. Strict CSP (`netlify.toml`). |
| **Optional extras never break the game** | Audio, haptics and storage are wrapped in `try`. A failure means silence or defaults, never an error. |

---

## 2. Architecture

```
src/
  game/        Pure rules: engine (reducer), word lists. No React, DOM or timers.
  feel/        Feedback: sound synthesis, haptics, tuning config, pure helpers.
  components/  Screens and presentational pieces. Read state, emit callbacks.
  hooks/       Generic timing hooks (interval, animation frame).
  App.tsx      The shell: owns state, clock, keyboard, persistence, wiring.
  storage.ts   Guarded localStorage access and the versioned stats schema.
  clock.ts     now() = performance.now() (monotonic; never jumps).
  format.ts    Display formatting.
  dev/         Dev-only perf overlay (?perf). Not included in production builds.
```

**Dependency direction:** `components → game, feel` and `App → everything`. `game/` imports nothing from the app. `feel/rules.ts` and `feel/config.ts` contain no DOM or audio code, so they can be unit-tested.

### Data flow

```
key press ─► App keydown handler ─► dispatch(GameEvent{ now })
                                         │
                                gameReducer (pure)
                                         │
                       new GameState ────┼──► React renders the active screen
                                         ├──► useFeel: sound / motion / haptics, once per feedbackId
                                         └──► nextDeadline → a single setTimeout for the next 'tick'
```

---

## 3. Game engine (`src/game/engine.ts`)

A pure `gameReducer(state, event)`. All time arrives through events as `now`, and all randomness comes from `state.seed` (mulberry32). That makes every run reproducible in tests.

**Screens:** `ready → playing ⇄ paused → gameover`. From `gameover`, `playAgain` returns to `playing` and `restart` returns to `ready`.

| Event | Effect |
|---|---|
| `start {now, seed, mode?}` | Fresh run from `ready`. |
| `input {value, now}` | Advances the clock first, then applies the keystroke. Sets `feedback` and `feedbackId`. |
| `tick {now}` | Advances the clock (drains survival and the combo window, ends the run at 0). |
| `pause` / `resume` | Stops or restarts the clock (`lastTickAt = null` while stopped). |
| `end` | The player stops the run → `gameover` (the Zen "END"). |
| `playAgain {now, seed}` | New run in the same mode, from `gameover`. |
| `setMode` | Changes the mode, on the `ready` screen only. |
| `restart` | Back to `ready`. Keeps `bestCombo` and `mode`. |

**Time model:** survival, the combo window and elapsed time all drain from one delta in `advance()`. The shell does not poll. `nextDeadline(state)` returns the next moment the state changes on its own, and App schedules one timeout for it, plus a 1 s safety tick.

**Modes:**

| | Arcade | Zen |
|---|---|---|
| Survival | Drains; refills on each word | Never drains (`advance` only adds to `elapsed`) |
| Wrong key | −750 ms, can end the run | No cost; resets the streak to 0 |
| Combo | Extends within a 3 s window | Words in a row without a mistake; no timer |
| Words | Levels 1–4 by words completed | Capped at level 2 (`ZEN_MAX_LEVEL`) |
| Bests | `bestCombo` + `ica-stats` | Not recorded |

**Feedback contract with the UI:** `feedback` (`correct | wrong | complete`) plus a `feedbackId` that increments on every event, so repeated values still fire. `comboBreakId` counts arcade combo expiries. `wrongLetter` and `lastWord` give the UI the details it needs for transitions.

**Helpers:** `getAccuracy` and `getWpm` (WPM = correct characters / 5 per active minute; `null` under 5 s).

**Tuning constants** (top of the file): `COMBO_WINDOW`, `MAX_HEALTH`, `WRONG_INPUT_PENALTY`, `MIN_WPM_MS`, `ZEN_MAX_LEVEL`.

---

## 4. Content: words (`src/game/wordlists/`, `src/game/words.ts`)

Plain-text lists, one word per line (`#` starts a comment), bundled at build time with `?raw`. No runtime fetch.

| File | Level | Length | Unlocked at |
|---|---|---|---|
| `level-1.txt` | 1 | 3–7 | 0 words |
| `level-2.txt` | 2 | 5–8 | 12 |
| `level-3.txt` | 3 | 9–12 | 30 |
| `level-4.txt` | 4 | 13+ | 60 |

- Thresholds are in `getDifficulty()`. `getWord()` never repeats the previous word.
- `words.test.ts` enforces a–z only, length per level, and no duplicates. Run `npm test` after editing a list.
- **Adding a level:** add the file, register it in `WORDS`, raise `MAX_LEVEL`, add its threshold to `getDifficulty`, and add its length rule to the test.

---

## 5. Shell (`src/App.tsx`)

The shell does the following:

- Holds the reducer state, plus UI preferences: sound level and character, FX level, ambient, and the arcade best at run start.
- **Clock:** the deadline timeout and the safety interval, both only while playing.
- **Keyboard routing per screen:**
  - **Ready:** ← → changes mode, ↑ ↓ changes key sound, any other key starts. Enter/Space on a focused button only presses that button.
  - **Playing:** Esc pauses.
  - **Paused:** Esc or Enter resumes.
  - **Result:** Enter/Space plays again after `REPLAY_LOCK_MS`; Esc goes to the menu.
- **Auto-pause** on window blur or when the tab is hidden. It never auto-resumes.
- **Audio:** `sound.unlock()` runs inside the start gesture. The Zen ambient pad runs only while a Zen session is playing.
- **Persistence:** writes stats once per arcade run end.
- **Performance guard:** a `SlowFrameDetector` drops FX FULL to SUBTLE for the session.

**Screens** (`components/`): `ReadyScreen` (mode and sound pickers), `PlayScreen` (arcade), `ZenScreen`, `PauseScreen`, `ResultScreen`. Both play screens render `WordDisplay` and the hidden `<input>` that captures typing, including on mobile keyboards.

---

## 6. Rendering and performance

These rules came from measurement (IMPROVEMENT-PLAN §6.1–6.2). Don't reverse one without measuring again.

- **React re-renders only on real events.** Values that change with time (the meter, SURVIVAL, TIME, combo fade, danger pulse, and the Zen rhythm line) are written directly to the DOM through refs by a **20 Hz display tick** in `PlayScreen` / `ZenScreen`.
- **No continuous compositor animations.** While one runs, Chrome delays keystroke paints by about a frame under load. Short effects animate colour and `top`/`left` on small positioned elements.
- **Cadence damping:** during fast bursts (< ~115 ms between keys), per-key motion is skipped and sound carries the feel (`FEEL.cadence`).
- **Budgets** (`scripts/check-size.mjs`): JS 85 KiB gzip, fonts 45 KiB, first load 130 KiB. Both CI and Netlify run the check. Don't raise a budget to make a failing build pass.

---

## 7. Feedback layer (`src/feel/`)

| File | Role |
|---|---|
| `config.ts` | **All feel tuning:** timings, motion px, cadence, danger, sound levels, ambient pad, rhythm. Data only. |
| `characters.ts` | **Sound characters** (SOFT, THOCK, WOOD, PEBBLE). Data only. |
| `audio.ts` | `SoundEngine` singleton (`sound`): Web Audio synthesis, voice pool, room, ambient pad. |
| `rules.ts` | Pure, tested helpers: level cycles, `pick`, pentatonic `comboFrequency`, `cadenceIntensity`, `EffectBudget`, `VoicePool`, `SlowFrameDetector`, `RhythmTracker`. |
| `useFeel.ts` | Maps state changes to sound, motion and haptics. Uses a layout effect so they land on the same frame as the letter. |
| `haptics.ts` | `navigator.vibrate` wrapper (Android). |

**Feedback ladder** (`useFeel`):

| Tier | Trigger | Response |
|---|---|---|
| 1 | Correct key | Key sound (intensity damped by cadence), keycap press, haptic |
| 1 | Wrong key | Wrong-key sound, ghost letter, 3 px shake. In Zen: a softer sound and no shake. |
| 2 | Word complete | Word-complete tone (pitch climbs the scale), meter glow, combo lift |
| 3 | Every 10th combo | Chime, 3 px kick, stronger glow. At most once per second (`EffectBudget`). |
| — | Combo break (arcade) | Soft falling two-note sound, combo dims |
| — | Survival < 1.5 s | Heartbeat on a fixed phase, meter pulse |

**FX levels:** `full` = everything. `subtle` = no movement (colour cues stay). `off` = no visual effects and no haptics. Set as `data-effects` on `.app-shell`; CSS and `useFeel` both read it.

### Audio graph

```
voices ─► master gain (SOUND level) ─┬──────────────────────────► compressor ─► out
                                     └─► room send ─► convolver ─┘
ambient pad (Zen) ─► low-pass (slow LFO) ─► pad gain ─► master
```

- Every sound is synthesised: a filtered noise burst (the click) plus short oscillator tones (the body). No audio files.
- At most `FEEL.sound.maxVoices` play at once; the oldest is stopped. Each play gets ±4% pitch and ±10% volume variation.
- The `AudioContext` is created lazily on the first gesture and never while sound is OFF.
- Room amount = `FEEL.sound.room × character.room`.
- Combo pitch follows the G major pentatonic scale from `comboBaseHz` over two octaves. The ambient chords are in the same key, so typing in Zen always harmonises with the pad.

### Adding a sound character

1. Add the id to `SoundCharacter` and `SOUND_CHARACTERS` in `rules.ts`.
2. Add a profile in `characters.ts`: `key`, `wrong`, `complete`, `room`, `label` (must be the id in upper case, which a test checks), and `hint`.
3. The picker, keyboard cycling, preview and persistence pick it up automatically. Tune by ear with the preview on the start screen.

---

## 8. Styling (`src/styles.css`)

- Two fonts: Manrope for display text and DM Mono for the UI and the word. Self-hosted. When a font file changes, rename it (fonts are cached as immutable).
- Monochrome palette on `#0a0a0b`. Keep small text at `#6a6a6a` or lighter, for contrast.
- **Keycaps:** `WordDisplay` sets `--len` (letter count) and `--glyph` (letter size relative to its key). `.word-display` derives `--cell` from the viewport and `--len`, so every word fits on one line. Key states: `.typed` (pressed in), `.next` (outlined), `.press` (the latest key; brightens briefly), `.ghost` (rejected letter), `.word-out` (finished word lifting away).
- Effect keyframes sit at the bottom of the file, scoped by `[data-effects=…]`.

---

## 9. Persistence (`src/storage.ts`)

Every read and write is guarded. Invalid values fall back to defaults through `pick()` / `parseStats()`.

| Key | Values | Default |
|---|---|---|
| `ica-sound` | `off \| low \| med \| high` | `low` (a v0.2 `ica-sound-enabled=false` maps to `off`) |
| `ica-sound-character` | `soft \| thock \| wood \| pebble` | `soft` |
| `ica-effects` | `full \| subtle \| off` | follows `prefers-reduced-motion` |
| `ica-mode` | `arcade \| zen` | `arcade` |
| `ica-ambient` | `on \| off` | `on` |
| `ica-best-combo` | number | `0` |
| `ica-stats` | `{v:1, bestWords, bestWpm, runs}` | zeros; values are clamped on read |

**Schema change:** increase `v` and migrate inside `parseStats`. Never throw.

---

## 10. Where to change what

| To change… | Edit |
|---|---|
| Survival time, penalty, combo window | `game/engine.ts` constants |
| Level thresholds, word pools | `game/words.ts`, `game/wordlists/*.txt` |
| Zen word difficulty | `ZEN_MAX_LEVEL` in `engine.ts` |
| Effect timings, motion px, danger threshold | `FEEL.timing`, `FEEL.motion`, `FEEL.danger` |
| Volume per SOUND level, voices, variation, room | `FEEL.sound` |
| How each key sound sounds | `feel/characters.ts` |
| Word-complete pitch scale | `PENTATONIC`, `comboFrequency` in `feel/rules.ts` |
| Ambient pad (chords, level, fades, filter) | `FEEL.ambient` |
| Rhythm sensitivity (window, reset, fade) | `FEEL.rhythm` |
| Haptic lengths | `FEEL.haptics` |
| Replay lock after a run | `REPLAY_LOCK_MS` in `App.tsx` |
| Copy on the start and result screens | `ReadyScreen.tsx` (`MODES`), `ResultScreen.tsx` |
| Colours, key look, layout | `styles.css` |
| Size budgets | `scripts/check-size.mjs` (deliberately) |
| Security headers, caching | `netlify.toml` |

---

## 11. Testing and delivery

- `npm test` (Vitest) covers the engine (rules, modes, time and deadlines, replay), word lists, feel rules (scale, cadence, voice pool, rhythm) and storage (migration, stats).
- Rule changes need tests. The reducer is pure: build a state, `reduce` events with explicit `now` values, and assert.
- The UI has no automated tests yet (R2.10 plans one Playwright smoke test). Check in a browser, and use `?perf` in dev for FPS, React commits, worst frame and long tasks. Measure keystroke latency with the Event Timing API (see IMPROVEMENT-PLAN §6.1).
- **Pipeline:** GitHub CI and the Netlify build both run `npm test && npm run build && npm run size`. If any step fails, the deploy is blocked and the last good deploy stays live.
- **Release:** bump `package.json` `version` (the footer reads it through `__APP_VERSION__`) and move the `CHANGELOG.md` "Unreleased" section under the new version.

---

## 12. Gotchas

- **Audio needs a gesture.** Create or resume audio only from a key press or click (`sound.unlock()`). Effects that run later reuse the unlocked context.
- **StrictMode** runs effects twice on mount in dev. Effects with side effects (stats writes) run on screen changes only, never on mount.
- **The hidden input is the source of truth for typing**, so IME and mobile keyboards work. Keep it focused while playing, and keep `font-size ≥ 16px` (otherwise iOS zooms on focus).
- **Feedback effects key on `feedbackId`, not `feedback`**, so the same feedback twice in a row still triggers.
- **Don't add CSS transitions or animations to elements that update every keystroke** without measuring keystroke-to-paint latency (§6).
