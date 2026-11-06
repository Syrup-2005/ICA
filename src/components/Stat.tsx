import type { Ref } from 'react'

// `valueRef` lets time-driven values be written directly (no re-render); leave `value` empty then.
export function Stat({ label, value, valueRef }: { label: string; value?: string; valueRef?: Ref<HTMLElement> }) {
  return <div className="stat"><span>{label}</span><strong ref={valueRef}>{value}</strong></div>
}
