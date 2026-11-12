import type { CSSProperties, RefObject } from 'react'
import type { GameState } from '../game/engine'

// The word as a row of keycaps: typed keys sit pressed in and lit, the next key is outlined,
// the rest wait quietly. Cell size comes from the word's length (CSS --len), so long words fit
// narrow phones; long words also get tighter cells (--glyph: letter size relative to its cell).
// The finished word's letters lift out of their keys as the next word appears.
interface WordDisplayProps {
  state: Pick<GameState, 'word' | 'typed' | 'feedback' | 'feedbackId' | 'wrongLetter' | 'lastWord' | 'wordsCompleted'>
  stageRef: RefObject<HTMLDivElement | null>
}

function glyphRatio(length: number): number {
  if (length > 10) return 0.8
  if (length > 7) return 0.68
  return 0.58
}

export function WordDisplay({ state, stageRef }: WordDisplayProps) {
  const { word, typed, feedback, feedbackId, wrongLetter, lastWord, wordsCompleted } = state
  const style = { '--len': word.length, '--glyph': glyphRatio(word.length) } as CSSProperties
  const letters = [...word]
  const at = typed.length

  return (
    <div className="word-display" aria-hidden="true" ref={stageRef} style={style}>
      {feedback === 'complete' && lastWord && (
        <span key={`out-${wordsCompleted}`} className="keys word-out">
          {[...lastWord].map((letter, i) => <span key={i} className="key">{letter}</span>)}
        </span>
      )}
      <span key={`word-${wordsCompleted}`} className="keys word-current">
        {letters.map((letter, i) => {
          if (i < at) {
            const press = i === at - 1
            // A new key per press so the press animation replays on every letter.
            return <span key={press ? `press-${at}` : i} className={press ? 'key typed press' : 'key typed'}>{letter}</span>
          }
          if (i === at) {
            return (
              <span key={i} className="key next slot">
                {letter}
                {feedback === 'wrong' && wrongLetter && <span key={`ghost-${feedbackId}`} className="ghost">{wrongLetter}</span>}
              </span>
            )
          }
          return <span key={i} className="key">{letter}</span>
        })}
      </span>
    </div>
  )
}
