import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store/game'
import { STEPS } from '../content/steps'

// Titolo di capitolo: compare per qualche secondo quando cambia il capitolo (segnaletica, non blocca il gioco).
const SUBTITLE: Record<string, string> = {
  Prologo: 'Il turno di notte',
}

export default function ChapterCard() {
  const chapter = useGame((s) => (s.progress ? STEPS[s.progress.step].chapter : null))
  const view = useGame((s) => s.view)
  const head = chapter?.split(' — ')[0] ?? null
  const prev = useRef<string | null>(null)
  const [show, setShow] = useState<{ head: string; sub: string; key: number } | null>(null)
  useEffect(() => {
    if (!head || head === prev.current) return
    const first = prev.current === null
    prev.current = head
    if (first && head !== 'Prologo') return // ripresa di una partita: niente titolo
    const sub = SUBTITLE[head] ?? chapter!.split(' — ')[1] ?? ''
    setShow({ head, sub, key: Date.now() })
  }, [head, chapter])
  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => setShow(null), 4200)
    return () => clearTimeout(t)
  }, [show])
  if (!show || view !== 'world') return null
  return (
    <div key={show.key} className="absolute inset-x-0 top-[22%] z-[60] flex justify-center pointer-events-none" style={{ animation: 'chapterIn 4.2s ease forwards' }}>
      <style>{`@keyframes chapterIn{0%{opacity:0;transform:translateY(10px)}12%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}`}</style>
      <div className="flex items-stretch shadow-2xl">
        <span className="sign-num text-[44px] px-5 flex items-center">{show.head === 'Prologo' ? '00' : show.head.replace(/\D/g, '').padStart(2, '0')}</span>
        <div className="bg-cream text-ink px-6 py-3">
          <div className="kicker text-[14px] text-ink/60">{show.head}</div>
          <div className="font-display font-black uppercase text-[46px] leading-none">{show.sub}</div>
        </div>
      </div>
    </div>
  )
}
