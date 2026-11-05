import { useEffect, useRef } from 'react'

// Calls `callback` every `delay` ms; pass null to stop. Always uses the latest callback.
export function useInterval(callback: () => void, delay: number | null): void {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return
    const id = window.setInterval(() => callbackRef.current(), delay)
    return () => window.clearInterval(id)
  }, [delay])
}
