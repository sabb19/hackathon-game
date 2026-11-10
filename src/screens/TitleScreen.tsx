import { useEffect, useState } from 'react'
import { useGame } from '../store/game'
import { STEPS } from '../content/steps'
import { Panel, SettingsPanel } from '../ui/Overlays'
import Notebook from '../ui/Notebook'
import { sfx } from '../audio'

// Titolo: lo schermo di RELAY in primo piano, nel buio dell'ufficio. Il menu è dentro lo schermo, come un login.
// Tastiera: ↑ ↓ per scegliere, Invio per confermare. Anche il mouse funziona.
type Sub = null | 'settings' | 'archive' | 'credits' | 'confirmNew'
type Item = 'continue' | 'new' | 'archive' | 'settings' | 'credits'

const BOOT = ['RELAY OS 4.2 · Halden Netcare', 'postazione di sorveglianza B2-14', 'collegamento a SECURITY-01 … ok', 'sessione pronta']

export default function TitleScreen() {
  const progress = useGame((s) => s.progress)
  const archive = useGame((s) => s.archive)
  const [sub, setSub] = useState<Sub>(null)
  const canContinue = !!progress && progress.step !== 'end' && progress.step !== 'm0_arrive' // solo una partita vera
  const items: { id: Item; label: string }[] = [
    ...(canContinue ? [{ id: 'continue' as Item, label: 'Continua il turno' }] : []),
    { id: 'new', label: 'Nuovo turno' },
    { id: 'archive', label: 'Archivio' },
    { id: 'settings', label: 'Impostazioni' },
    { id: 'credits', label: 'Crediti' },
  ]
  const [sel, setSel] = useState(0)
  const [boot, setBoot] = useState(0)

  useEffect(() => {
    if (boot >= BOOT.length + 1) return
    const t = setTimeout(() => setBoot((b) => b + 1), boot === 0 ? 300 : 380)
    return () => clearTimeout(t)
  }, [boot])

  const pick = (id: Item) => {
    sfx.click()
    if (id === 'continue') {
      useGame.getState().setView('world')
      useGame.getState().setScreen('game')
    }
    if (id === 'new') return canContinue ? setSub('confirmNew') : useGame.getState().setScreen('intro')
    if (id === 'archive') setSub('archive')
    if (id === 'settings') setSub('settings')
    if (id === 'credits') setSub('credits')
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (sub) return
      if (e.key === 'ArrowDown') setSel((i) => (i + 1) % items.length)
      if (e.key === 'ArrowUp') setSel((i) => (i - 1 + items.length) % items.length)
      if (e.key === 'Enter') pick(items[sel].id)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  const ready = boot > BOOT.length

  return (
    <div className="absolute inset-0 z-20 overflow-hidden" style={{ background: 'radial-gradient(900px 600px at 12% 8%, rgba(232,130,58,0.16), transparent 60%), #06080b' }}>
      {/* bordo della scrivania in basso, appena visibile */}
      <div className="absolute inset-x-0 bottom-0 h-[14%] bg-gradient-to-t from-[#1a140e] to-transparent" />
      {/* il monitor */}
      <div className="absolute left-1/2 top-[47%] -translate-x-1/2 -translate-y-1/2 w-[min(1180px,88vw)] aspect-[16/9]">
        <div className="absolute inset-0 rounded-[14px] bg-[#0d0f12] p-[1.4%] shadow-[0_40px_120px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="relative w-full h-full overflow-hidden rounded-[4px] bg-[#0b1420]">
            {/* contenuto dello schermo */}
            <div className="absolute inset-0 px-[6%] py-[5%] flex flex-col text-[#cfe0f0]">
              <div className="font-mono text-[clamp(11px,1.05vw,15px)] text-[#7f98b2] space-y-1 min-h-[6.5em]">
                {BOOT.slice(0, boot).map((l, i) => (
                  <div key={i}>
                    <span className="text-[#6FBF8E]">✓</span> {l}
                  </div>
                ))}
              </div>
              <h1 className={`font-display font-black uppercase leading-[0.92] text-cream mt-[3%] transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} style={{ fontSize: 'clamp(48px, 7.4vw, 112px)', textShadow: '0 0 24px rgba(159,192,216,0.25)' }}>
                The Last Session
              </h1>
              <nav aria-label="Menu principale" className={`mt-[4%] font-mono text-[clamp(15px,1.55vw,22px)] space-y-[0.35em] transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}>
                {items.map((it, i) => (
                  <button
                    key={it.id}
                    onMouseEnter={() => setSel(i)}
                    onFocus={() => setSel(i)}
                    onClick={() => pick(it.id)}
                    className={`block text-left outline-none ${sel === i ? 'text-signal' : 'text-[#cfe0f0]/75 hover:text-cream'}`}
                  >
                    <span className="inline-block w-[1.4em]">{sel === i ? '>' : ''}</span>
                    {it.label}
                    {sel === i && <span className="inline-block w-[0.6em] h-[1em] align-[-0.12em] ml-1 bg-signal animate-pulse" />}
                    {it.id === 'continue' && progress && <span className="ml-4 text-[0.7em] text-[#7f98b2]">{STEPS[progress.step].chapter}</span>}
                  </button>
                ))}
              </nav>
              <div className="mt-auto flex justify-between font-mono text-[clamp(10px,0.9vw,13px)] text-[#7f98b2]/80">
                <span>↑ ↓ per scegliere · Invio per confermare</span>
                <span>Halden Netcare · uso riservato al personale</span>
              </div>
            </div>
            {/* vetro: righe di scansione, vignettatura, riflesso della lampada */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.07] bg-[repeating-linear-gradient(0deg,#000_0_1px,transparent_1px_3px)]" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(420px 260px at 8% 6%, rgba(255,200,140,0.10), transparent 70%), linear-gradient(115deg, rgba(255,255,255,0.05) 0%, transparent 35%)' }} />
          </div>
        </div>
        {/* piede del monitor */}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-[10%] h-[7%] bg-gradient-to-b from-[#121418] to-[#0a0b0d]" />
        <div className="absolute left-1/2 -translate-x-1/2 top-[107%] w-[26%] h-[2.2%] rounded-sm bg-[#0e1013] shadow-[0_10px_30px_rgba(0,0,0,0.8)]" />
        {/* LED di accensione */}
        <div className="absolute right-[3%] bottom-[0.45%] w-[6px] h-[6px] rounded-full bg-[#6FBF8E] shadow-[0_0_8px_#6FBF8E]" />
      </div>

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
