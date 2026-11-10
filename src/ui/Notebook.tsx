import { useState, type ReactNode } from 'react'
import { useGame } from '../store/game'
import { CONCEPTS, CONCEPT_ORDER, type ConceptId } from '../content/concepts'

// Disegnini a mano per le pagine del taccuino (SVG, tratto "a penna").
function Doodle({ id }: { id: ConceptId }) {
  const ink = { stroke: '#1d3a63', strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const t = (x: number, y: number, s: string, size = 18) => (
    <text x={x} y={y} fontFamily="Caveat" fontSize={size} fill="#1d3a63" textAnchor="middle">{s}</text>
  )
  const box = (x: number, y: number, w = 54, h = 34) => <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={5} {...ink} />
  let c: ReactNode
  switch (id) {
    case 'autenticazione':
      c = (<>{box(70, 60, 70, 46)}{t(70, 66, 'PC')}<path d="M150 60 h60" {...ink} /><path d="M200 52 l10 8 l-10 8" {...ink} />{box(260, 60, 80, 46)}{t(260, 56, 'utente', 16)}{t(260, 74, '+ password', 16)}{t(160, 110, '"sono io, giuro"', 20)}</>)
      break
    case 'password':
      c = (<>{t(80, 45, 'H@ld3n!', 22)}{t(80, 75, '→ 3 minuti', 18)}{t(250, 45, 'lampada-pioggia', 20)}{t(250, 65, '-tram-luna', 20)}{t(250, 95, '→ secoli!!', 22)}<path d="M160 30 v80" {...ink} strokeDasharray="4 6" /></>)
      break
    case 'rete':
      c = (<>{box(60, 40)}{box(60, 100)}{box(280, 70)}<path d="M87 40 L253 70 M87 100 L253 70" {...ink} />{t(170, 120, 'tutto collegato = si parla', 18)}</>)
      break
    case 'switch':
      c = (<>{box(170, 70, 110, 30)}{t(170, 76, 'SWITCH', 18)}{box(50, 25)}{box(50, 115)}{box(290, 25)}{box(290, 115)}<path d="M77 25 L125 62 M77 115 L125 78 M263 25 L215 62 M263 115 L215 78" {...ink} />{t(170, 130, 'solo il SUO quartiere', 16)}</>)
      break
    case 'pacchetto':
      c = (<><rect x={110} y={30} width={120} height={70} {...ink} /><path d="M110 30 L170 70 L230 30" {...ink} />{t(170, 120, 'da: 1.15  →  a: 2.10', 18)}</>)
      break
    case 'ip':
      c = (<>{t(170, 55, '192.168.1 . 15', 34)}<path d="M70 70 q60 20 140 0" {...ink} /><path d="M235 70 q15 15 30 0" {...ink} />{t(140, 105, 'quartiere', 20)}{t(250, 105, 'casa', 20)}</>)
      break
    case 'router':
      c = (<><ellipse cx={60} cy={75} rx={50} ry={35} {...ink} />{t(60, 80, 'uffici')}<ellipse cx={280} cy={75} rx={50} ry={35} {...ink} />{t(280, 80, 'server')}<path d="M110 75 q60 -50 120 0" {...ink} /><path d="M110 75 h120" {...ink} />{t(170, 120, 'IL PONTE', 22)}</>)
      break
    case 'mac':
      c = (<><rect x={60} y={35} width={220} height={60} rx={6} {...ink} />{t(170, 60, 'scheda di rete', 18)}{t(170, 85, '00:0A:F7:5E:11:07', 20)}{t(170, 125, 'scritto in fabbrica ✓', 18)}</>)
      break
    case 'inventario':
      c = (<>{[0, 1, 2, 3].map((i) => <path key={i} d={`M60 ${35 + i * 22} h220`} {...ink} />)}{t(300, 40, '✓', 22)}{t(300, 62, '✓', 22)}{t(300, 84, '✓', 22)}{t(300, 106, '?!', 22)}</>)
      break
  }
  return <svg viewBox="0 0 340 140" className="w-full max-w-[340px] my-3">{c}</svg>
}

export function NotebookPage({ id }: { id: ConceptId }) {
  const c = CONCEPTS[id]
  return (
    <div className="relative">
      <h3 className="font-hand text-[44px] leading-none text-[#1d3a63]">{c.title}</h3>
      <p className="font-semibold text-[15px] text-ink mt-1">{c.short}</p>
      <Doodle id={id} />
      {c.body.map((b, i) => (
        <p key={i} className="text-[14px] leading-relaxed text-ink/85 mb-2">{b}</p>
      ))}
      <div className="mt-4 bg-[#fff7c2] px-4 py-3 rotate-[-0.8deg] shadow-sm border-l-4 border-[#e8c64a]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">come se fosse…</div>
        <p className="text-[14px] text-ink/80">{c.analogy}</p>
      </div>
      <p className="font-hand text-[22px] leading-tight text-[#b4442e] mt-5 rotate-[1deg]">↳ {c.margin}</p>
    </div>
  )
}

export default function Notebook({ ids, onClose, title = 'Taccuino di Ada' }: { ids: ConceptId[]; onClose: () => void; title?: string }) {
  const known = CONCEPT_ORDER.filter((c) => ids.includes(c))
  const [sel, setSel] = useState<ConceptId | null>(known[known.length - 1] ?? null)
  return (
    <div className="absolute inset-0 z-[78] flex items-center justify-center bg-ink/70 backdrop-blur-[2px]" onClick={onClose}>
      <div className="fade-up relative w-[min(980px,94vw)] h-[min(640px,88vh)] flex" onClick={(e) => e.stopPropagation()}>
        {/* linguette */}
        <div className="absolute -right-[86px] top-10 flex flex-col gap-1.5 z-10">
          {CONCEPT_ORDER.map((c, i) => {
            const on = known.includes(c)
            const colors = ['#E8823A', '#6FBF8E', '#8fb3d9', '#e8c64a', '#d98a8a']
            return (
              <button
                key={c}
                disabled={!on}
                onClick={() => setSel(c)}
                className="w-[96px] text-left pl-3 py-1 font-hand text-lg rounded-r-md shadow disabled:opacity-25 transition-transform hover:translate-x-1"
                style={{ background: on ? colors[i % colors.length] : '#888', transform: sel === c ? 'translateX(8px)' : undefined }}
              >
                {on ? CONCEPTS[c].tab : '· · ·'}
              </button>
            )
          })}
        </div>
        {/* copertina + pagine */}
        <div className="flex-1 flex rounded-[10px] bg-[#2a3a52] p-3 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
          <div className="flex-1 grid grid-cols-2 rounded-[6px] overflow-hidden" style={{ background: '#f3ecd9' }}>
            {/* pagina sinistra: indice */}
            <div className="p-8 border-r border-black/10 overflow-y-auto" style={{ backgroundImage: 'repeating-linear-gradient(transparent 0 27px, rgba(29,58,99,0.12) 27px 28px)' }}>
              <div className="font-hand text-[40px] text-[#1d3a63] leading-none">{title}</div>
              <p className="font-hand text-xl text-ink/60 mt-1">"Se lo stai leggendo, è successo qualcosa. Respira." — A.F.</p>
              <ol className="mt-6 space-y-1">
                {CONCEPT_ORDER.map((c, i) => {
                  const on = known.includes(c)
                  return (
                    <li key={c}>
                      <button disabled={!on} onClick={() => setSel(c)} className={`font-hand text-2xl ${sel === c ? 'text-[#b4442e]' : 'text-[#1d3a63]'} disabled:text-ink/20`}>
                        {i + 1}. {on ? CONCEPTS[c].title : '— pagina ancora vuota —'}
                      </button>
                    </li>
                  )
                })}
              </ol>
              <p className="font-mono text-[10px] text-ink/40 mt-8">Le pagine si scrivono quando incontri un concetto. [N] apri/chiudi</p>
            </div>
            {/* pagina destra */}
            <div className="p-8 overflow-y-auto">
              {sel ? <NotebookPage id={sel} /> : <p className="font-hand text-2xl text-ink/40 mt-20 text-center">Pagine bianche. Per ora.</p>}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="absolute -top-9 right-0 font-mono text-xs text-cream/70 hover:text-cream">Chiudi [N / Esc]</button>
      </div>
    </div>
  )
}

export function GameNotebook() {
  const open = useGame((s) => s.notebookOpen)
  const concepts = useGame((s) => s.progress?.concepts ?? [])
  if (!open) return null
  return <Notebook ids={concepts} onClose={() => useGame.getState().setNotebook(false)} />
}
