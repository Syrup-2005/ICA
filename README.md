# ICA — Typing Arcade

A minimalist, endless typing arcade built with React, TypeScript and Vite.

## Requirements

- Node.js 22 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

## Production build

```bash
npm run build
npm run preview
```

The production website is generated in `dist/`.

## Tests

```bash
npm test
```

See `docs/ICA-Project-Guide.md` for architecture and `CHANGELOG.md` for changes.

## Adding words

Word lists are plain-text files in `src/game/wordlists/`, one word per line (`#` starts a comment):

| File | Level | Word length |
|---|---|---|
| `level-1.txt` | 1 (0–11 words completed) | 3–7 letters |
| `level-2.txt` | 2 (12–29) | 5–8 letters |
| `level-3.txt` | 3 (30–59) | 9–12 letters |
| `level-4.txt` | 4 (60+) | 13+ letters |

Run `npm test` after editing. It fails on anything outside a–z, the wrong length for the level, or a duplicate.

## Size budget

```bash
npm run build && npm run size
```

Fails if the JS, fonts or first-load size exceed the budgets in `scripts/check-size.mjs`. CI and the Netlify build both run it.

## Current MVP features

- Press any key or click to start
- One word at a time
- Adaptive word-length milestones
- Endless gameplay
- Three-second combo window
- Best combo saved in localStorage
- Elapsed time, completed words and accuracy
- Optional generated sound effects
- Pause and restart; auto-pause when you switch tabs or apps (Esc or Enter resumes)

## Notes

ICA intentionally has no backend, account system or external database, and makes no third-party requests: fonts are self-hosted (`public/fonts/`, SIL Open Font License). Deployment is on Netlify, configured by `netlify.toml`.
