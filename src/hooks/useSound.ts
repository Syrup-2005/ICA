import { useCallback, useRef } from 'react'
import type { Feedback } from '../game/engine'

const TONES: Record<Exclude<Feedback, 'none'>, { frequency: number; duration: number }> = {
  correct: { frequency: 440, duration: 0.025 },
  wrong: { frequency: 145, duration: 0.08 },
  complete: { frequency: 620, duration: 0.11 },
}
const MILESTONE_TONE = { frequency: 880, duration: 0.11 } // every 10th combo

// Returns a function that plays the tone for a feedback event. Audio failures never affect gameplay.
export function useSound(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null)

  return useCallback((feedback: Feedback, combo: number) => {
    if (!enabled || feedback === 'none') return
    const tone = feedback === 'complete' && combo > 0 && combo % 10 === 0 ? MILESTONE_TONE : TONES[feedback]
    try {
      if (!window.AudioContext) return
      contextRef.current ??= new AudioContext()
      const context = contextRef.current
      if (context.state === 'suspended') void context.resume()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = tone.frequency
      oscillator.type = 'sine'
      gain.gain.setValueAtTime(0.045, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + tone.duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + tone.duration)
    } catch {
      // Audio is optional.
    }
  }, [enabled])
}
