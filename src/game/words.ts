// Word lists live in plain-text files (src/game/wordlists/level-N.txt), one word per line.
// They are bundled at build time (`?raw`), so the game never needs a network request for words.
import level1 from './wordlists/level-1.txt?raw'
import level2 from './wordlists/level-2.txt?raw'
import level3 from './wordlists/level-3.txt?raw'
import level4 from './wordlists/level-4.txt?raw'

export const MAX_LEVEL = 4

// Trims and lowercases each line; skips blank lines and `#` comments.
// Validity (a–z only, length per level, no duplicates) is enforced by words.test.ts.
export function parseWordList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line !== '' && !line.startsWith('#'))
}

export const WORDS: Record<number, string[]> = {
  1: parseWordList(level1),
  2: parseWordList(level2),
  3: parseWordList(level3),
  4: parseWordList(level4),
}

// Random word for a level, never repeating the previous word.
// `random` returns a number in [0, 1); injectable so the engine stays deterministic.
export function getWord(level: number, previousWord = '', random: () => number = Math.random): string {
  const pool = WORDS[level] ?? WORDS[MAX_LEVEL]
  const candidates = pool.length > 1 ? pool.filter((word) => word !== previousWord) : pool
  return candidates[Math.floor(random() * candidates.length)]
}

export function getDifficulty(completedWords: number): number {
  if (completedWords >= 60) return 4
  if (completedWords >= 30) return 3
  if (completedWords >= 12) return 2
  return 1
}
