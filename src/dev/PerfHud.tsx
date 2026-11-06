import { Profiler, useEffect, useState, type ReactNode } from 'react'

// Dev-only performance overlay: run `npm run dev` and open the page with `?perf`.
// main.tsx imports this only when import.meta.env.DEV is true, so it is never in production builds.

const stats = { commits: 0, longTasks: 0 }

function Hud() {
  const [view, setView] = useState({ fps: 0, renders: 0, worstFrame: 0, longTasks: 0 })

  useEffect(() => {
    let frames = 0
    let worst = 0
    let last = performance.now()
    let windowStart = last
    let commitsAtStart = stats.commits
    let raf = 0
    const loop = (t: number) => {
      frames++
      worst = Math.max(worst, t - last)
      last = t
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    let observer: PerformanceObserver | undefined
    try {
      observer = new PerformanceObserver((list) => {
        stats.longTasks += list.getEntries().length
      })
      observer.observe({ type: 'longtask' })
    } catch {
      // Long-task timing is Chromium-only.
    }

    const id = window.setInterval(() => {
      const t = performance.now()
      const secs = (t - windowStart) / 1000
      setView({
        fps: Math.round(frames / secs),
        renders: +((stats.commits - commitsAtStart) / secs).toFixed(1),
        worstFrame: Math.round(worst),
        longTasks: stats.longTasks,
      })
      frames = 0
      worst = 0
      windowStart = t
      commitsAtStart = stats.commits
    }, 1000)

    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(id)
      observer?.disconnect()
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed', right: 8, bottom: 8, zIndex: 10, padding: '6px 10px',
        background: 'rgba(20,20,20,.9)', color: '#9f9', font: '11px monospace', pointerEvents: 'none',
      }}
    >
      FPS {view.fps} · RENDERS/S {view.renders} · WORST FRAME {view.worstFrame}ms · LONG TASKS {view.longTasks}
    </div>
  )
}

// Wraps the app in a Profiler that counts React commits, and adds the overlay outside it
// (so the overlay's own updates are not counted).
export function withPerfHud(app: ReactNode) {
  return (
    <>
      <Profiler id="ica" onRender={() => { stats.commits++ }}>{app}</Profiler>
      <Hud />
    </>
  )
}
