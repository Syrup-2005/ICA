import type { Mode } from '../game/engine'
import { CHARACTERS } from '../feel/characters'
import { SOUND_CHARACTERS, type SoundCharacter } from '../feel/rules'

interface ReadyScreenProps {
  mode: Mode
  character: SoundCharacter
  soundOn: boolean
  ambient: boolean
  onMode: (mode: Mode) => void
  onCharacter: (character: SoundCharacter) => void // also plays a short preview
  onAmbient: () => void
  onStart: () => void
}

const MODES: { id: Mode; label: string; rule: string }[] = [
  { id: 'arcade', label: 'ARCADE', rule: 'Finish each word before the line runs out. Mistakes cost time.' },
  { id: 'zen', label: 'ZEN', rule: 'No timer, no failure. Type for as long as you like, stop whenever.' },
]

// Choose how to play and how the keys sound, then press any key. Keyboard: ← → mode, ↑ ↓ sound.
export function ReadyScreen(props: ReadyScreenProps) {
  const { mode, character, soundOn, ambient, onMode, onCharacter, onAmbient, onStart } = props
  const rule = MODES.find((m) => m.id === mode)?.rule

  return (
    <section className="center-stage intro-stage">
      <p className="eyebrow">A TYPING ARCADE</p>
      <h1>Type. Focus. Repeat.</h1>
      <p className="subheading">A quiet place to find your rhythm.</p>

      <div className="setup">
        <div className="choice" role="radiogroup" aria-label="Mode">
          <span className="choice-label">MODE</span>
          {MODES.map((m) => (
            <button
              key={m.id}
              className="choice-option"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => onMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="choice-note">{rule}</p>

        <div className="choice" role="radiogroup" aria-label="Key sound">
          <span className="choice-label">KEYS</span>
          {SOUND_CHARACTERS.map((c) => (
            <button
              key={c}
              className="choice-option"
              role="radio"
              aria-checked={character === c}
              aria-label={`${CHARACTERS[c].label}: ${CHARACTERS[c].hint}. Plays a preview`}
              onClick={() => onCharacter(c)}
            >
              {CHARACTERS[c].label}
            </button>
          ))}
        </div>
        <p className="choice-note">
          {soundOn ? CHARACTERS[character].hint : 'sound is off · pick a sound to turn it on'}
          {mode === 'zen' && (
            <>
              {' · '}
              <button className="inline-toggle" onClick={onAmbient} aria-pressed={ambient}>
                ambient {ambient ? 'on' : 'off'}
              </button>
            </>
          )}
        </p>
      </div>

      <button className="start-prompt" onClick={onStart}>PRESS ANY KEY TO START <span>↗</span></button>
      <p className="typing-hint keys-hint">← → MODE <span className="dot">·</span> ↑ ↓ SOUND</p>
    </section>
  )
}
