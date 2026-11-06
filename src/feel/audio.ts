// Synthesised feedback sounds (no audio files). Clicks are short filtered noise bursts;
// body and pitch come from short oscillator tones. Every voice goes through one master gain
// and a compressor, and at most FEEL.sound.maxVoices play at once.
// Audio is optional: any failure leaves the game silent, never broken.
import { FEEL } from './config'
import { VoicePool, comboFrequency, jitter, type SoundLevel } from './rules'

type Partial =
  | { kind: 'noise'; filter: BiquadFilterType; freq: number; q?: number; peak: number; decay: number; delay?: number }
  | { kind: 'tone'; wave: OscillatorType; freq: number; toFreq?: number; peak: number; decay: number; delay?: number }

const ATTACK = 0.002

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private pool = new VoicePool(FEEL.sound.maxVoices)
  private level: SoundLevel = 'off'

  setLevel(level: SoundLevel): void {
    this.level = level
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(FEEL.sound.levels[level], this.ctx.currentTime, 0.01)
  }

  // Call from a user gesture (key press or click) so browsers allow audio to start.
  unlock(): void {
    this.context()
  }

  thock(intensity: number): void {
    this.play([
      { kind: 'noise', filter: 'bandpass', freq: 4000, q: 3, peak: 0.5 * intensity, decay: 0.008 },
      { kind: 'tone', wave: 'sine', freq: jitter(150, FEEL.sound.pitchJitter), peak: 0.35 * intensity, decay: 0.04 },
    ])
  }

  thud(): void {
    this.play([
      { kind: 'noise', filter: 'lowpass', freq: 700, peak: 0.45, decay: 0.03 },
      { kind: 'tone', wave: 'sine', freq: jitter(95, FEEL.sound.pitchJitter), peak: 0.4, decay: 0.07 },
    ])
  }

  chunk(combo: number): void {
    const freq = comboFrequency(combo)
    this.play([
      { kind: 'noise', filter: 'lowpass', freq: 2500, peak: 0.35, decay: 0.012 },
      { kind: 'tone', wave: 'triangle', freq, peak: 0.3, decay: 0.11 },
      { kind: 'tone', wave: 'sine', freq: freq / 2, peak: 0.25, decay: 0.09 },
    ])
  }

  chime(): void {
    this.play([
      { kind: 'tone', wave: 'sine', freq: 880, peak: 0.22, decay: 0.35 },
      { kind: 'tone', wave: 'sine', freq: 1320, peak: 0.12, decay: 0.3, delay: 0.02 },
    ])
  }

  crack(): void {
    this.play([
      { kind: 'tone', wave: 'sine', freq: 420, toFreq: 210, peak: 0.18, decay: 0.12 },
      { kind: 'noise', filter: 'bandpass', freq: 1800, q: 1.5, peak: 0.12, decay: 0.02 },
    ])
  }

  heartbeat(): void {
    this.play([
      { kind: 'tone', wave: 'sine', freq: 62, peak: 0.35, decay: 0.06 },
      { kind: 'tone', wave: 'sine', freq: 58, peak: 0.25, decay: 0.06, delay: 0.14 },
    ])
  }

  private context(): AudioContext | null {
    if (this.level === 'off') return null
    try {
      if (!this.ctx) {
        const ctx = new AudioContext({ latencyHint: 'interactive' })
        const compressor = ctx.createDynamicsCompressor()
        compressor.threshold.value = -18
        compressor.knee.value = 12
        compressor.ratio.value = 4
        compressor.attack.value = 0.002
        compressor.release.value = 0.12
        const master = ctx.createGain()
        master.gain.value = FEEL.sound.levels[this.level]
        master.connect(compressor).connect(ctx.destination)
        const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate)
        const samples = noise.getChannelData(0)
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
        this.ctx = ctx
        this.master = master
        this.noise = noise
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return this.ctx
    } catch {
      return null
    }
  }

  private play(partials: Partial[]): void {
    const ctx = this.context()
    if (!ctx || !this.master || !this.noise) return
    try {
      const t0 = ctx.currentTime
      const sources: AudioScheduledSourceNode[] = []
      const nodes: AudioNode[] = []
      let end = t0
      let last: AudioScheduledSourceNode | null = null
      for (const p of partials) {
        const start = t0 + (p.delay ?? 0)
        const stop = start + ATTACK + p.decay + 0.01
        const endsLast = stop >= end
        end = Math.max(end, stop)
        const gain = ctx.createGain()
        const peak = Math.max(0.0002, jitter(p.peak, FEEL.sound.volumeJitter))
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.linearRampToValueAtTime(peak, start + ATTACK)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + ATTACK + p.decay)
        gain.connect(this.master)
        nodes.push(gain)
        let source: AudioScheduledSourceNode
        if (p.kind === 'noise') {
          const buffer = ctx.createBufferSource()
          buffer.buffer = this.noise
          const filter = ctx.createBiquadFilter()
          filter.type = p.filter
          filter.frequency.value = p.freq
          if (p.q !== undefined) filter.Q.value = p.q
          buffer.connect(filter).connect(gain)
          nodes.push(filter, buffer)
          buffer.start(start, Math.random() * 0.2)
          source = buffer
        } else {
          const osc = ctx.createOscillator()
          osc.type = p.wave
          osc.frequency.setValueAtTime(p.freq, start)
          if (p.toFreq) osc.frequency.exponentialRampToValueAtTime(p.toFreq, start + ATTACK + p.decay)
          osc.connect(gain)
          nodes.push(osc)
          osc.start(start)
          source = osc
        }
        source.stop(stop)
        sources.push(source)
        if (endsLast) last = source
      }
      // Disconnect everything once the longest partial has finished.
      const release = () => nodes.forEach((node) => node.disconnect())
      if (last) last.onended = release
      this.pool.admit(
        {
          end,
          stop: () => {
            for (const s of sources) {
              try {
                s.stop()
              } catch {
                // Already stopped.
              }
            }
            release()
          },
        },
        t0,
      )
    } catch {
      // Audio is optional.
    }
  }
}

export const sound = new SoundEngine()
