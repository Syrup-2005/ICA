import type { Mode } from '../game/engine'

interface PauseScreenProps {
  mode: Mode
  wordsCompleted: number
  combo: number
  onResume: () => void
  onRestart: () => void
  onEnd: () => void
}

export function PauseScreen({ mode, wordsCompleted, combo, onResume, onRestart, onEnd }: PauseScreenProps) {
  const zen = mode === 'zen'
  return (
    <section className="center-stage intro-stage">
      <p className="eyebrow">{zen ? 'ZEN · PAUSED' : 'SESSION PAUSED'}</p>
      <h1>Take a breath.</h1>
      <p className="subheading">
        {wordsCompleted} words completed · {combo}{zen ? ' in a row' : 'x current combo'}
      </p>
      <div className="pause-actions">
        <button className="primary-button" onClick={onResume}>RESUME</button>
        {zen ? (
          <button className="quiet-button" onClick={onEnd}>END SESSION</button>
        ) : (
          <button className="quiet-button" onClick={onRestart}>RESTART</button>
        )}
      </div>
      <p className="typing-hint">ESC OR ENTER TO RESUME</p>
    </section>
  )
}
