import { describe, expect, it } from 'vitest'
import { MAX_LEVEL, WORDS, getDifficulty, getWord, parseWordList } from './words'

describe('parseWordList', () => {
  it('trims, lowercases and skips blank lines and # comments (LF and CRLF)', () => {
    const text = '# header\r\n\r\n  Calm  \r\nDRIFT\n# note\n\nhush\n'
    expect(parseWordList(text)).toEqual(['calm', 'drift', 'hush'])
  })
})

const LENGTH_RANGES: Record<number, [number, number]> = { 1: [3, 7], 2: [5, 8], 3: [9, 12], 4: [13, Infinity] }

describe('word pools', () => {
  it('has a pool for every level', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) expect(WORDS[level]?.length).toBeGreaterThan(1)
  })

  it('contains no duplicate words', () => {
    const all = Object.values(WORDS).flat()
    expect(new Set(all).size).toBe(all.length)
  })

  it('keeps every word lowercase a–z and within its level length range', () => {
    for (const [level, words] of Object.entries(WORDS)) {
      const [min, max] = LENGTH_RANGES[Number(level)]
      for (const word of words) {
        expect(word, `level ${level}: ${word}`).toMatch(/^[a-z]+$/)
        expect(word.length, `level ${level}: ${word}`).toBeGreaterThanOrEqual(min)
        expect(word.length, `level ${level}: ${word}`).toBeLessThanOrEqual(max)
      }
    }
  })
})

describe('getWord', () => {
  it('never repeats the previous word', () => {
    for (const previous of WORDS[1]) {
      for (const r of [0, 0.5, 0.999999]) expect(getWord(1, previous, () => r)).not.toBe(previous)
    }
  })

  it('falls back to the hardest pool for unknown levels', () => {
    expect(WORDS[MAX_LEVEL]).toContain(getWord(99, '', () => 0))
  })
})

describe('getDifficulty', () => {
  it.each([
    [0, 1], [11, 1], [12, 2], [29, 2], [30, 3], [59, 3], [60, 4], [500, 4],
  ])('%i completed words → level %i', (words, level) => {
    expect(getDifficulty(words)).toBe(level)
  })
})
