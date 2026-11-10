import { useEffect, useState } from 'react'
import { useGame } from '../store/game'
import { STEPS } from '../content/steps'
import { Panel, SettingsPanel } from '../ui/Overlays'
import Notebook from '../ui/Notebook'
import type { TitleItem } from '../world/World'

// Title screen diegetica: il menu sono gli oggetti sulla scrivania.
// badge = nuovo turno · monitor = continua · taccuino = archivio · telefono = impostazioni · tazza = crediti
type Sub = null | 'settings' | 'archive' | 'credits' | 'confirmNew'

const ITEMS: { id: TitleItem; label: string; hint: string }[] = [
  { id: 'monitor', label: 'Continua il turno', hint: 'il monitor' },
  { id: 'badge', label: 'Nuovo turno', hint: 'il badge' },
  { id: 'notebook', label: 'Archivio', hint: 'il taccuino' },
  { id: 'phone', label: 'Impostazioni', hint: 'il telefono' },
  { id: 'mug', label: 'Crediti', hint: 'la tazza' },
]

export default function TitleScreen() {
  const progress = useGame((s) => s.progress)
  const archive = useGame((s) => s.archive)
  const [sub, setSub] = useState<Sub>(null)
  const [hover, setHover] = useState<TitleItem | null>(null)
  const canContinue = !!progress && progress.step !== 'end' && progress.step !== 'm0_arrive' // solo una partita vera

  const pick = (id: TitleItem) => {
    if (id === 'monitor') {
      if (!canContinue) return
      useGame.getState().setView('world')
      useGame.getState().setScreen('game')
    }
    if (id === 'badge') return canContinue ? setSub('confirmNew') : useGame.getState().setScreen('intro')
    if (id === 'notebook') setSub('archive')
    if (id === 'phone') setSub('settings')
    if (id === 'mug') setSub('credits')
  }

  useEffect(() => {
    const onPick = (e: Event) => !sub && pick((e as CustomEvent).detail)
    const onHover = (e: Event) => setHover((e as CustomEvent).detail)
    window.addEventListener('title-pick', onPick)
    window.addEventListener('title-hover', onHover)
    return () => {
      window.removeEventListener('title-pick', onPick)
      window.removeEventListener('title-hover', onHover)
      document.body.style.cursor = ''
    }
  })

  const items = ITEMS.filter((i) => i.id !== 'monitor' || canContinue)
  const h = items.find((i) => i.id === hover)

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* titolo */}
      <div className="absolute left-10 top-10 boot">
        <h1 className="font-display font-black uppercase text-[112px] leading-[0.98] tracking-[0.02em] text-cream drop-shadow-[0_6px_40px_rgba(0,0,0,0.85)]">
          The Last
          <br />
          Session
        </h1>
        <p className="font-display font-bold uppercase tracking-[0.25em] text-[18px] text-cream/80 mt-4">Level B2 · 23:41</p>
      </div>

      {/* etichetta dell'oggetto sotto il mouse */}
      <div className="absolute left-1/2 bottom-28 -translate-x-1/2 h-14">
        {h ? (
          <div key={h.id} className="fade-up flex items-stretch">
            <span className="bg-cream text-ink font-display font-black uppercase text-3xl px-4 py-1.5">{h.label}</span>
          </div>
        ) : (
          <p className="font-display font-bold uppercase tracking-wider text-[16px] text-cream/70 bg-ink/60 px-3 py-1">Clicca gli oggetti sulla scrivania</p>
        )}
      </div>

      {/* menu testuale: alternativa accessibile da tastiera */}
      <nav aria-label="Menu principale" className="absolute left-10 bottom-10 pointer-events-auto flex flex-wrap gap-x-6 gap-y-2">
        {items.map((i) => (
          <button
            key={i.id}
            onClick={() => pick(i.id)}
            onMouseEnter={() => setHover(i.id)}
            onMouseLeave={() => setHover(null)}
            className={`text-left font-display font-black uppercase text-[24px] leading-none transition-colors focus:outline focus:outline-2 focus:outline-signal px-1 ${hover === i.id ? 'text-signal' : 'text-cream/80 hover:text-cream'}`}
          >
            {i.label}
            {i.id === 'monitor' && progress && <span className="block font-sans normal-case font-medium text-[12px] text-cream/55 mt-1">{STEPS[progress.step].chapter}</span>}
          </button>
        ))}
      </nav>

      <div className="pointer-events-auto">
        {sub === 'settings' && <SettingsPanel onClose={() => setSub(null)} />}
        {sub === 'archive' && <Notebook ids={archive} title="Archivio" onClose={() => setSub(null)} />}
        {sub === 'credits' && (
          <Panel title="Crediti" onClose={() => setSub(null)}>
            <div className="text-[15px] space-y-3 text-ink/85">
              <p>THE LAST SESSION — demo per l'hackathon Consorzio Clara × Cisco Networking Academy.</p>
              <p>Concept, game design, narrativa e sviluppo: il team.</p>
              <p className="text-ink/60">Font: Big Shoulders Display, Inter Tight, JetBrains Mono, Caveat. Realizzato con React, Three.js e Tailwind CSS.</p>
            </div>
          </Panel>
        )}
        {sub === 'confirmNew' && (
          <Panel title="Nuovo turno" onClose={() => setSub(null)}>
            <p className="text-[15px] text-ink/85 mb-6">C'è già un turno in corso. Iniziarne uno nuovo cancella i progressi della partita (il taccuino di Ada resta nell'archivio).</p>
            <div className="flex gap-3">
              <button className="btn btn-signal" onClick={() => useGame.getState().setScreen('intro')}>Inizia un nuovo turno</button>
              <button className="btn" onClick={() => setSub(null)}>Annulla</button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}
