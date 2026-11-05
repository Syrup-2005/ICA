export function GameOverScreen({ wordsCompleted, onPlayAgain }: { wordsCompleted: number; onPlayAgain: () => void }) {
  return (
    <section className="center-stage intro-stage">
      <p className="eyebrow">SESSION ENDED</p>
      <h1>Game Over.</h1>
      <p className="subheading">You completed {wordsCompleted} words.</p>
      <div className="pause-actions">
        <button className="primary-button" onClick={onPlayAgain}>PLAY AGAIN</button>
      </div>
    </section>
  )
}
