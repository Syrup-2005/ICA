export function ReadyScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="center-stage intro-stage">
      <p className="eyebrow">A TYPING ARCADE</p>
      <h1>Type. Focus. Repeat.</h1>
      <p className="subheading">A quiet place to find your rhythm.</p>
      <button className="start-prompt" onClick={onStart}>PRESS ANY KEY TO START <span>↗</span></button>
    </section>
  )
}
