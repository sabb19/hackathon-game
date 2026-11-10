import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'

// Schermata di caricamento: resta finché modelli e texture non sono pronti.
export default function Loading() {
  const { progress, active } = useProgress()
  const [gone, setGone] = useState(false)
  const done = !active && progress >= 100
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setGone(true), 600)
    return () => clearTimeout(t)
  }, [done])
  if (gone) return null
  return (
    <div className={`absolute inset-0 z-[200] bg-ink flex items-center justify-center transition-opacity duration-500 ${done ? 'opacity-0' : 'opacity-100'}`}>
      <div className="w-[min(420px,80vw)]">
        <div className="font-display uppercase text-4xl tracking-tight text-cream">
          The Last Session<span className="text-signal cursor-blink">_</span>
        </div>
        <div className="font-mono text-[13px] text-cream/60 mt-3">Accensione delle luci del livello B2…</div>
        <div className="mt-4 h-1.5 bg-cream/10">
          <div className="h-full bg-signal transition-all duration-300" style={{ width: `${Math.round(progress)}%` }} />
        </div>
        <div className="font-mono text-[12px] text-cream/40 mt-2 text-right">{Math.round(progress)}%</div>
      </div>
    </div>
  )
}
