// Feel tuning: every timing, pitch and intensity for feedback effects, in one place.
// Tune by ear and eye (playtesting); there is no logic here. Rules: guide §9 · Phase 2A.

export const FEEL = {
  // Survival below this feels "in danger": heartbeat + meter pulse.
  danger: { thresholdMs: 1500, beatMs: 600 },

  // Movement is capped at 3 px (design rule: small, local, never the whole page).
  motion: { dipPx: 1, kickPx: 3, shakePx: 3, liftPx: 3, pressPx: 2 },

  timing: {
    dipMs: 90,
    shakeMs: 180,
    popMs: 140,
    kickMs: 160,
    breakMs: 220,
    glowHoldMs: 50, // the brief "hitstop" hold on word completion (visual only, never input)
    glowFadeMs: 180,
  },

  // Fast typing softens per-key effects so a burst sounds smooth, not like a rattle.
  // Per-key motion only from motionFrom intensity up (≈ 115 ms between keys): in faster bursts it
  // would overlap the next keystroke and delay it (measured), so sound carries the feel there.
  cadence: { fullAtMs: 160, minAtMs: 60, minIntensity: 0.45, motionFrom: 0.75 },

  // At most one big (tier-3) effect per this many ms; extra requests are dropped, never stacked.
  budget: { tier3GapMs: 1000 },

  // Drop to SUBTLE for the session if this many consecutive frames are slower than slowFrameMs.
  // 50 ms (below 20 fps), not 32: 30 Hz screens and phone low-power modes run at ~33 ms per frame.
  perfGuard: { slowFrameMs: 50, consecutive: 6, graceMs: 1000 },

  milestoneEvery: 10,

  sound: {
    levels: { off: 0, low: 0.35, med: 0.6, high: 0.9 }, // master gain
    maxVoices: 6,
    pitchJitter: 0.04, // ±4%
    volumeJitter: 0.1, // ±10%
    comboBaseHz: 196, // G3; rises one pentatonic step per combo, over two octaves, then wraps
    room: 0.22, // send into the small synthesised room (reverb), before each character's own amount
  },

  // Zen ambient pad: a slow, low, filtered chord in G (same key as the combo notes).
  // Fades in when a zen session runs, out on pause/end. Gain is relative to the SOUND level.
  ambient: {
    gain: 0.11,
    fadeInS: 4,
    fadeOutS: 1.2,
    chordEveryMs: 22_000,
    glideS: 3, // time constant of the glide between chords
    filterHz: 650,
    // Gadd9 → Em7 → Cmaj7 → Dsus2 (Hz). All inside G major pentatonic + its gentle neighbours.
    chords: [
      [98.0, 146.83, 220.0, 246.94],
      [82.41, 123.47, 196.0, 293.66],
      [65.41, 130.81, 196.0, 246.94],
      [73.42, 110.0, 220.0, 329.63],
    ],
  },

  // Typing rhythm reading (add-on A5): see RhythmTracker in rules.ts.
  rhythm: { window: 8, minGaps: 4, resetMs: 1500, looseCv: 0.6, holdMs: 1200, fadeMs: 1500 },

  // Vibration lengths (ms). Android only; ignored elsewhere.
  haptics: { correct: 8, wrong: 20, complete: 15, milestone: 30 },
} as const
