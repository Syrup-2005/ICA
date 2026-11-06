import { useEffect, useLayoutEffect, useRef } from 'react'

// Calls `callback(frameMs)` on every animation frame while `active`. Always uses the latest callback.
export function useAnimationFrame(callback: (frameMs: number) => void, active: boolean): void {
  const callbackRef = useRef(callback)

  useLayoutEffect(() => {
    callbackRef.current = callback
  })

  useEffect(() => {
    if (!active) return
    let id = 0
    let last = performance.now()
    const loop = (t: number) => {
      callbackRef.current(t - last)
      last = t
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [active])
}
