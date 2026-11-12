import { getAccuracy, getWpm, type GameState } from '../game/engine'
import { formatTime } from '../format'

interface ResultScreenProps {
  state: GameState
  bestBefore: number // arcade: best words before this run (for "new best" / "N words from your best")
  ready: boolean // false during the short input lock, so a fast typist can't skip the result by accident
  onPlayAgain: () => void
  onMenu: () => void
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

// R2.1: a clear, kind result. At most five figures, quiet typography, one main action.
export function ResultScreen({ state, bestBefore, ready, onPlayAgain, onMenu }: ResultScreenProps) {
  const { mode, wordsCompleted: words, runBestCombo, elapsed } = state
  const zen = mode === 'zen'
  const wpm = getWpm(state)
  const newBest = !zen && words > bestBefore

  let title = 'Run complete.'
  let line = `${plural(bestBefore - words, 'word')} from your best.`
  if (zen) {
    title = 'Well typed.'
    line = words === 0 ? 'Come back whenever you like.' : `${plural(words, 'word')}, at your own pace.`
  } else if (newBest) {
    title = 'New best.'
    line = bestBefore === 0 ? 'Your first score on the board.' : `${plural(words - bestBefore, 'word')} past your old best.`
  } else if (words === 0) {
    line = 'Every run starts somewhere. Try again?'
  } else if (words === bestBefore) {
    line = 'Level with your best.'
  }

  const figures: [string, string][] = [
    ['WORDS', String(words)],
    [zen ? 'LONGEST STREAK' : 'BEST COMBO', zen ? String(runBestCombo) : `${runBestCombo}x`],
    ['ACCURACY', `${getAccuracy(state)}%`],
    ['TIME', formatTime(elapsed)],
    ['WPM', wpm === null ? '—' : String(wpm)],
  ]

  return (
    <section className="center-stage intro-stage result-stage">
      <p className="eyebrow">{zen ? 'ZEN SESSION' : 'RUN OVER'}</p>
      <h1 className={newBest ? 'result-title new-best' : 'result-title'}>{title}</h1>
      <p className="subheading">{line}</p>
      <dl className="result-figures">
        {figures.map(([label, value]) => (
          <div key={label} className="stat">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="pause-actions">
        <button className="primary-button" onClick={onPlayAgain}>{zen ? 'BEGIN AGAIN' : 'PLAY AGAIN'}</button>
        <button className="quiet-button" onClick={onMenu}>MENU</button>
      </div>
      <p className={ready ? 'typing-hint replay-hint ready' : 'typing-hint replay-hint'}>
        ENTER OR SPACE TO {zen ? 'BEGIN AGAIN' : 'PLAY AGAIN'} <span className="dot">·</span> ESC FOR MENU
      </p>
    </section>
  )
}
