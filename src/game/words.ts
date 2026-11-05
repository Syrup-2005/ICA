export const MAX_LEVEL = 4

// Word pools by level. Lengths: L1 3–7, L2 5–8, L3 9–12, L4 13+ (enforced by tests).
export const WORDS: Record<number, string[]> = {
  // Level 1: Short and familiar words
  1: [
    'ash', 'calm', 'drift', 'echo', 'faint', 'glow', 'hush', 'mist',
    'pulse', 'still', 'trace', 'wave', 'vibe', 'mood', 'chill', 'flex',
    'slay', 'sus', 'based', 'cope', 'yap', 'rizz', 'lore', 'meme',
    'clutch', 'nerf', 'buff', 'loot', 'grind', 'spawn', 'quest', 'noob',
    'cringe', 'viral', 'hype', 'ratio', 'ghost', 'simp', 'yeet',
    'bruh', 'goat', 'cap', 'bet', 'fam', 'lowkey', 'highkey', 'valid',
  ],

  // Level 2: Medium-length words
  2: [
    'anchor', 'breeze', 'canvas', 'distant', 'ember', 'frozen',
    'gentle', 'hollow', 'motion', 'silver', 'velvet', 'window',
    'delulu', 'cooked', 'midkey', 'chaotic',
    'awkward', 'unhinged', 'legend', 'griefer', 'speedrun', 'payload',
    'respawn', 'sandbox', 'headshot', 'loadout', 'backseat',
    'glazing', 'capping', 'yapping', 'locked', 'cooking', 'cursed',
    'blessed', 'savage', 'iconic', 'random', 'energy', 'vibing',
    'offline', 'lurking', 'cracked', 'washed',
    'daydream', 'midnight', 'overcast', 'quietly', 'remember', 'momentum',
  ],

  // Level 3: Long words
  3: [
    'afterglow', 'blueprint', 'evergreen', 'fragments', 'threshold',
    'aesthetic', 'wholesome', 'sidequest', 'scrolling',
    'algorithm', 'attention', 'catastrophe', 'community', 'confidence',
    'connection', 'delusional', 'discovery', 'emotional', 'eventually',
    'existential', 'fascinating', 'friendship', 'generation',
    'impossible', 'incredible', 'influencer',
    'masterpiece', 'meaningful', 'mysterious',
    'overthinking', 'perfection', 'phenomenal', 'relatable',
    'reputation', 'resolution', 'simulation', 'spectacular',
    'subconscious', 'unexpected', 'vocabulary',
    'architecture', 'disconnected', 'independent', 'observation',
    'perception', 'recollection', 'transmission', 'ambidextrous',
  ],

  // Level 4: Challenging words
  4: [
    'constellation', 'accountability', 'anachronistic', 'circumstantial',
    'consequential', 'consciousness', 'contradiction', 'deterioration',
    'extraordinary', 'inconsequential', 'interpretation',
    'misconception', 'misunderstanding', 'multidimensional',
    'overcomplicated', 'philosophical', 'psychological',
    'reconciliation', 'sophisticated', 'transformation',
    'unpredictable', 'unprecedented', 'unintentionally',
    'disproportionate', 'incomprehensible', 'infrastructure',
    'interconnected', 'metamorphosis', 'simultaneously',
    'irreplaceable', 'vulnerability',
  ],
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
