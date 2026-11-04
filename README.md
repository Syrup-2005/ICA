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

## Current MVP features

- Press any key or click to start
- One word at a time
- Adaptive word-length milestones
- Endless gameplay
- Three-second combo window
- Best combo saved in localStorage
- Elapsed time, completed words and accuracy
- Optional generated sound effects
- Pause and restart

## Notes

The first version intentionally has no backend, account system or external database. Google Fonts are currently loaded from the web; the game itself works without a backend. For a fully offline/self-contained release, replace the remote font import with locally bundled font files.
