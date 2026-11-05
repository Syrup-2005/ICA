interface PauseScreenProps {
  wordsCompleted: number
  combo: number
  onResume: () => void
  onRestart: () => void
}

export function PauseScreen({ wordsCompleted, combo, onResume, onRestart }: PauseScreenProps) {
  return (
    <section className="center-stage intro-stage">
      <p className="eyebrow">SESSION PAUSED</p>
      <h1>Take a breath.</h1>
      <p className="subheading">{wordsCompleted} words completed · {combo}x current combo</p>
      <div className="pause-actions">
        <button className="primary-button" onClick={onResume}>RESUME</button>
        <button className="quiet-button" onClick={onRestart}>RESTART</button>
      </div>
    </section>
  )
}
