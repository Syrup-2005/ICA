// Sound characters (add-on A2): the player picks one before starting. All synthesised, no files.
// Each describes the per-key sound (a short filtered click + a short tone for body), the wrong-key
// sound and the word-complete tone. Tune by ear; there is no logic here.
import type { SoundCharacter } from './rules'

export interface Click {
  filter: BiquadFilterType
  freq: number
  q?: number
  peak: number
  decay: number
}
export interface Body {
  wave: OscillatorType
  freq: number
  toFreq?: number // optional pitch drop over the decay
  peak: number
  decay: number
}
export interface CharacterProfile {
  label: string
  hint: string // a few words for the picker
  key: { click: Click; body: Body }
  wrong: { click: Click; body: Body }
  complete: { wave: OscillatorType; click: Click }
  room: number // extra reverb amount (0–1) on top of FEEL.sound.room
}

export const CHARACTERS: Record<SoundCharacter, CharacterProfile> = {
  soft: {
    label: 'SOFT',
    hint: 'muted, cushioned',
    key: {
      click: { filter: 'lowpass', freq: 1300, peak: 0.42, decay: 0.014 },
      body: { wave: 'sine', freq: 165, peak: 0.3, decay: 0.04 },
    },
    wrong: {
      click: { filter: 'lowpass', freq: 500, peak: 0.3, decay: 0.03 },
      body: { wave: 'sine', freq: 98, peak: 0.28, decay: 0.07 },
    },
    complete: { wave: 'sine', click: { filter: 'lowpass', freq: 1500, peak: 0.25, decay: 0.012 } },
    room: 1,
  },
  thock: {
    label: 'THOCK',
    hint: 'deep, lubed mechanical',
    key: {
      click: { filter: 'bandpass', freq: 2600, q: 2, peak: 0.5, decay: 0.009 },
      body: { wave: 'sine', freq: 128, toFreq: 112, peak: 0.42, decay: 0.05 },
    },
    wrong: {
      click: { filter: 'lowpass', freq: 650, peak: 0.4, decay: 0.03 },
      body: { wave: 'sine', freq: 88, peak: 0.38, decay: 0.07 },
    },
    complete: { wave: 'triangle', click: { filter: 'lowpass', freq: 2400, peak: 0.32, decay: 0.012 } },
    room: 0.6,
  },
  wood: {
    label: 'WOOD',
    hint: 'warm wooden block',
    key: {
      click: { filter: 'bandpass', freq: 1700, q: 4, peak: 0.28, decay: 0.006 },
      body: { wave: 'triangle', freq: 540, toFreq: 480, peak: 0.24, decay: 0.035 },
    },
    wrong: {
      click: { filter: 'bandpass', freq: 600, q: 2, peak: 0.25, decay: 0.02 },
      body: { wave: 'triangle', freq: 220, toFreq: 190, peak: 0.24, decay: 0.06 },
    },
    complete: { wave: 'triangle', click: { filter: 'bandpass', freq: 1800, q: 3, peak: 0.2, decay: 0.008 } },
    room: 0.8,
  },
  pebble: {
    label: 'PEBBLE',
    hint: 'small, glassy click',
    key: {
      click: { filter: 'bandpass', freq: 5200, q: 3, peak: 0.42, decay: 0.006 },
      body: { wave: 'sine', freq: 880, toFreq: 820, peak: 0.1, decay: 0.022 },
    },
    wrong: {
      click: { filter: 'bandpass', freq: 1400, q: 2, peak: 0.3, decay: 0.015 },
      body: { wave: 'sine', freq: 330, toFreq: 290, peak: 0.16, decay: 0.05 },
    },
    complete: { wave: 'sine', click: { filter: 'bandpass', freq: 5000, q: 3, peak: 0.25, decay: 0.006 } },
    room: 1.2,
  },
}
