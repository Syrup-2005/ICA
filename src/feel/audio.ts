// Synthesised feedback sounds (no audio files). Clicks are short filtered noise bursts;
// body and pitch come from short oscillator tones. The sound "character" (src/feel/characters.ts)
// shapes the key, wrong-key and word-complete sounds. Every voice goes through one master gain,
// a small synthesised room (reverb send) and a compressor; at most FEEL.sound.maxVoices play at once.
// Audio is optional: any failure leaves the game silent, never broken.
import { FEEL } from './config'
import { CHARACTERS, type Body, type Click } from './characters'
import { VoicePool, comboFrequency, jitter, type SoundCharacter, type SoundLevel } from './rules'

type Partial =
  | ({ kind: 'noise'; delay?: number } & Click)
  | ({ kind: 'tone'; delay?: number } & Body)

const ATTACK = 0.002
const click = (c: Click, scale = 1, delay?: number): Partial => ({ kind: 'noise', ...c, peak: c.peak * scale, delay })
const tone = (b: Body, scale = 1, delay?: number): Partial => ({ kind: 'tone', ...b, peak: b.peak * scale, delay })

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private roomSend: GainNode | null = null
  private noise: AudioBuffer | null = null
  private readonly pool = new VoicePool(FEEL.sound.maxVoices)
  private level: SoundLevel = 'off'
  private character: SoundCharacter = 'soft'
  private ambient: Ambient | null = null

  setLevel(level: SoundLevel): void {
    this.level = level
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(FEEL.sound.levels[level], this.ctx.currentTime, 0.01)
    if (level === 'off') this.stopAmbient()
  }

  setCharacter(character: SoundCharacter): void {
    this.character = character
    if (this.ctx && this.roomSend) this.roomSend.gain.setTargetAtTime(this.roomAmount(), this.ctx.currentTime, 0.05)
  }

  // Call from a user gesture (key press or click) so browsers allow audio to start.
  unlock(): void {
    this.context()
  }

  private get profile() {
    return CHARACTERS[this.character]
  }

  thock(intensity: number): void {
    const { click: c, body } = this.profile.key
    this.play([click(c, intensity), tone({ ...body, freq: jitter(body.freq, FEEL.sound.pitchJitter) }, intensity)])
  }

  thud(gentle = false): void {
    const { click: c, body } = this.profile.wrong
    const scale = gentle ? 0.55 : 1
    this.play([click(c, scale), tone({ ...body, freq: jitter(body.freq, FEEL.sound.pitchJitter) }, scale)])
  }

  chunk(combo: number): void {
    const freq = comboFrequency(combo)
    const { wave, click: c } = this.profile.complete
    this.play([
      click(c),
      { kind: 'tone', wave, freq, peak: 0.28, decay: 0.16 },
      { kind: 'tone', wave: 'sine', freq: freq / 2, peak: 0.2, decay: 0.12 },
    ])
  }

  // Milestone: a soft two-note bell (a fifth), left to ring in the room.
  chime(): void {
    this.play([
      { kind: 'tone', wave: 'sine', freq: 784, peak: 0.16, decay: 0.6 },
      { kind: 'tone', wave: 'sine', freq: 1174.66, peak: 0.1, decay: 0.55, delay: 0.06 },
    ])
  }

  // Combo break: a soft falling pair of notes, not a crack.
  crack(): void {
    this.play([
      { kind: 'tone', wave: 'sine', freq: 392, peak: 0.12, decay: 0.12 },
      { kind: 'tone', wave: 'sine', freq: 293.66, peak: 0.11, decay: 0.18, delay: 0.09 },
    ])
  }

  heartbeat(): void {
    this.play([
      { kind: 'tone', wave: 'sine', freq: 62, peak: 0.32, decay: 0.06 },
      { kind: 'tone', wave: 'sine', freq: 58, peak: 0.22, decay: 0.06, delay: 0.14 },
    ])
  }

  // A short phrase to hear a character while choosing it (selects it): four keys and a word.
  preview(character: SoundCharacter): void {
    this.setCharacter(character)
    const { key, complete } = this.profile
    const gaps = [0, 0.15, 0.28, 0.43]
    this.play(gaps.map((d, i) => click(key.click, i === 2 ? 0.8 : 1, d)))
    this.play(gaps.map((d, i) => tone({ ...key.body, freq: jitter(key.body.freq, FEEL.sound.pitchJitter) }, i === 2 ? 0.8 : 1, d)))
    this.play([
      click(complete.click, 1, 0.6),
      { kind: 'tone', wave: complete.wave, freq: comboFrequency(3), peak: 0.26, decay: 0.2, delay: 0.6 },
      { kind: 'tone', wave: 'sine', freq: comboFrequency(3) / 2, peak: 0.18, decay: 0.14, delay: 0.6 },
    ])
  }

  // Zen ambient pad. Safe to call repeatedly; does nothing while sound is off.
  startAmbient(): void {
    const ctx = this.context()
    if (!ctx || !this.master || this.ambient) return
    try {
      this.ambient = new Ambient(ctx, this.master)
    } catch {
      this.ambient = null
    }
  }

  stopAmbient(): void {
    this.ambient?.stop()
    this.ambient = null
  }

  private roomAmount(): number {
    return FEEL.sound.room * this.profile.room
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
        compressor.connect(ctx.destination)
        const master = ctx.createGain()
        master.gain.value = FEEL.sound.levels[this.level]
        master.connect(compressor)
        // A small room: convolution with ~1.4 s of decaying stereo noise, generated once.
        const room = ctx.createConvolver()
        room.buffer = roomImpulse(ctx, 1.4)
        const roomSend = ctx.createGain()
        roomSend.gain.value = this.roomAmount()
        master.connect(roomSend).connect(room).connect(compressor)
        const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate)
        const samples = noise.getChannelData(0)
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
        this.ctx = ctx
        this.master = master
        this.roomSend = roomSend
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

function roomImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3
  }
  return buffer
}

// A slow pad: two slightly detuned oscillators per chord note through a breathing low-pass filter.
// Chords change every FEEL.ambient.chordEveryMs with a slow glide, never a hard cut.
class Ambient {
  private readonly ctx: AudioContext
  private readonly out: GainNode
  private readonly oscillators: OscillatorNode[] = []
  private readonly lfo: OscillatorNode
  private timer = 0
  private chord = 0

  constructor(ctx: AudioContext, destination: AudioNode) {
    const { gain, fadeInS, filterHz, chords } = FEEL.ambient
    this.ctx = ctx
    const t = ctx.currentTime
    this.out = ctx.createGain()
    this.out.gain.setValueAtTime(0.0001, t)
    this.out.gain.linearRampToValueAtTime(gain, t + fadeInS)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = filterHz
    filter.Q.value = 0.4
    this.lfo = ctx.createOscillator()
    this.lfo.frequency.value = 0.06 // one slow breath every ~17 s
    const depth = ctx.createGain()
    depth.gain.value = filterHz * 0.4
    this.lfo.connect(depth).connect(filter.frequency)
    this.lfo.start(t)
    filter.connect(this.out).connect(destination)
    for (const freq of chords[0]) {
      for (const [wave, detune] of [['sine', -5], ['triangle', 6]] as const) {
        const osc = ctx.createOscillator()
        osc.type = wave
        osc.frequency.value = freq
        osc.detune.value = detune
        const voice = ctx.createGain()
        voice.gain.value = wave === 'sine' ? 0.22 : 0.08
        osc.connect(voice).connect(filter)
        osc.start(t)
        this.oscillators.push(osc)
      }
    }
    this.timer = window.setInterval(() => this.nextChord(), FEEL.ambient.chordEveryMs)
  }

  private nextChord(): void {
    const { chords, glideS } = FEEL.ambient
    this.chord = (this.chord + 1) % chords.length
    const notes = chords[this.chord]
    const t = this.ctx.currentTime
    this.oscillators.forEach((osc, i) => osc.frequency.setTargetAtTime(notes[Math.floor(i / 2)], t, glideS))
  }

  stop(): void {
    window.clearInterval(this.timer)
    const t = this.ctx.currentTime
    const end = t + FEEL.ambient.fadeOutS
    try {
      this.out.gain.cancelScheduledValues(t)
      this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), t)
      this.out.gain.exponentialRampToValueAtTime(0.0001, end)
      for (const osc of [...this.oscillators, this.lfo]) osc.stop(end + 0.05)
      this.lfo.onended = () => this.out.disconnect()
    } catch {
      // Audio is optional.
    }
  }
}

export const sound = new SoundEngine()
