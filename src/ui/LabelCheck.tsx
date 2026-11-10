import { useEffect, useState } from 'react'
import { useGame } from '../store/game'
import { sfx } from '../audio'
import { lockPointer } from '../world/pointer'

// Minigioco — confronto etichette (capitolo 3, ispirato a Papers, Please).
// A sinistra l'etichetta fisica del dispositivo, a destra l'appunto preso dal Monitor di rete.
// Il nome di rete lo sceglie chiunque; il MAC è scritto in fabbrica. Decidi: è il dispositivo che cerchi?

export type LabelId = 'labelCopier' | 'labelSandbox'
type Row = { k: string; v: string; ref?: string } // ref: valore dell'appunto da confrontare

const WANTED = { name: 'PRINTER-2', mac: '00:0A:F7:5E:11:07', port: 'porta 7' }

const CASES: Record<LabelId, { title: string; where: string; rows: Row[]; handNote?: string; answer: boolean; right: string; wrong: string }> = {
  labelCopier: {
    title: "Stampante dell'archivio",
    where: 'Etichetta sul retro, sotto il vassoio della carta',
    rows: [
      { k: 'Modello', v: 'Kyrio MF-4400' },
      { k: 'Nome di rete', v: 'PRINTER-UFF', ref: WANTED.name },
      { k: 'MAC', v: '9C:93:4E:01:5D:22', ref: WANTED.mac },
      { k: 'Seriale', v: 'KM44-08812' },
    ],
    answer: false,
    right: "Giusto: non è lei. Nome diverso e, soprattutto, MAC diverso. L'unica stampante del piano non è PRINTER-2: quel nome è un travestimento.",
    wrong: "Guarda meglio il MAC: 9C:93… non è 00:0A…. Due dispositivi diversi non hanno mai lo stesso MAC: questa stampante non è quella che cerchi.",
  },
  labelSandbox: {
    title: "Il mini PC nell'armadio",
    where: "Etichetta sul fianco, con un'aggiunta scritta a mano",
    rows: [
      { k: 'Modello', v: 'Mini PC NX-2' },
      { k: 'Nome di rete', v: 'SANDBOX-7', ref: WANTED.name },
      { k: 'MAC', v: '00:0A:F7:5E:11:07', ref: WANTED.mac },
      { k: 'Stato inventario', v: 'DISMESSO 2023' },
    ],
    handNote: 'esercitazione — non spegnere. A.F.',
    answer: true,
    right: "È lui. Il nome è diverso (SANDBOX-7, non PRINTER-2), ma il MAC è identico: sulla rete si spacciava per una stampante. Il nome si cambia in un minuto, il MAC è la sua impronta.",
    wrong: 'Il nome è diverso, è vero… ma il nome si cambia in un minuto. Confronta il MAC, carattere per carattere.',
  },
}

export default function LabelCheck({ id, onSolved }: { id: LabelId; onSolved: () => void }) {
  const c = CASES[id]
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [verdict, setVerdict] = useState<'none' | 'wrong' | 'right'>('none')

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
    const k = (e: KeyboardEvent) => e.key === 'Escape' && verdict !== 'right' && close()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  const close = () => {
    useGame.getState().setMinigame(null)
    lockPointer()
  }
  const decide = (yes: boolean) => {
    if (yes === c.answer) {
      sfx.click()
      setVerdict('right')
      useGame.getState().learn('mac')
    } else {
      sfx.denied()
      setVerdict('wrong')
    }
  }
  const comparable = c.rows.filter((r) => r.ref)
  const allChecked = comparable.every((r) => checked[r.k])

  return (
    <div className="absolute inset-0 z-[70] bg-ink/85 flex flex-col items-center justify-center p-6" onContextMenu={(e) => (e.preventDefault(), verdict !== 'right' && close())}>
      <div className="w-full max-w-4xl flex items-stretch mb-3">
        <span className="sign-num text-2xl flex items-center">3</span>
        <div className="bg-cream text-ink px-4 py-2 flex-1 flex items-center justify-between">
          <span className="font-display font-black uppercase text-xl">Chi sei davvero? · {c.title}</span>
          <span className="text-[13px] text-ink/60">Esc o tasto destro per lasciare</span>
        </div>
      </div>
      <div className="w-full max-w-4xl grid grid-cols-2 gap-6">
        {/* etichetta fisica */}
        <div>
          <div className="kicker text-[12px] text-cream/60 mb-2">{c.where}</div>
          <div className="bg-[#f3f1ea] text-ink p-5 shadow-2xl rotate-[-0.6deg] border border-black/10">
            <div className="flex justify-between items-center border-b-2 border-ink pb-2 mb-3">
              <span className="font-display font-black text-[20px] tracking-wide">HALDEN NETCARE · ASSET</span>
              <span className="font-mono text-[11px]">CE · 230V</span>
            </div>
            {c.rows.map((r) => {
              const state = r.ref && checked[r.k] ? (r.v === r.ref ? 'eq' : 'ne') : null
              return (
                <button
                  key={r.k}
                  disabled={!r.ref || verdict === 'right'}
                  onClick={() => {
                    sfx.click()
                    setChecked((x) => ({ ...x, [r.k]: true }))
                  }}
                  className={`w-full flex justify-between items-baseline px-2 py-1.5 text-left ${r.ref ? 'cursor-pointer hover:bg-signal/20' : ''} ${state === 'eq' ? 'bg-[#cfe9d6]' : state === 'ne' ? 'bg-[#f5cdc2]' : ''}`}
                >
                  <span className="text-[13px] text-ink/60">{r.k}</span>
                  <span className="font-mono text-[16px] font-semibold">{r.v}</span>
                </button>
              )
            })}
            <div className="h-9 mt-3 bg-[repeating-linear-gradient(90deg,#1c1f24_0_2px,transparent_2px_4px,#1c1f24_4px_7px,transparent_7px_9px)]" aria-hidden="true" />
            {c.handNote && <div className="font-hand text-[24px] text-[#b4442e] mt-2 -rotate-2">{c.handNote}</div>}
          </div>
          <p className="text-[13px] text-cream/60 mt-3">Clicca le righe da confrontare con il tuo appunto: verde = uguale, rosso = diverso.</p>
        </div>
        {/* appunto dal monitor + decisione */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="kicker text-[12px] text-cream/60 mb-2">Il tuo appunto (dal Monitor di rete)</div>
            <div className="bg-[#0f1822] text-[#cfe0f0] p-4 font-mono text-[15px] space-y-1 border border-[#2b4a6b]">
              <div>cerco: <b className="text-cream">{WANTED.name}</b></div>
              <div>collegato a: switch sala server, {WANTED.port}</div>
              <div>MAC: <b className="text-signal">{WANTED.mac}</b></div>
            </div>
          </div>
          <div className="bg-cream text-ink p-4 space-y-3">
            {verdict === 'none' && (
              <>
                <p className="text-[16px] font-semibold">È il dispositivo che cerchi?</p>
                {!allChecked && <p className="text-[13px] text-ink/60">Prima confronta nome e MAC sull'etichetta.</p>}
                <div className="flex gap-2">
                  <button disabled={!allChecked} className="btn btn-signal disabled:opacity-40" onClick={() => decide(true)}>Sì, è lui</button>
                  <button disabled={!allChecked} className="btn disabled:opacity-40" onClick={() => decide(false)}>No, non è lui</button>
                </div>
              </>
            )}
            {verdict === 'wrong' && (
              <>
                <p className="text-[15px]">{c.wrong}</p>
                <button className="btn" onClick={() => setVerdict('none')}>Riprova</button>
              </>
            )}
            {verdict === 'right' && (
              <>
                <p className="text-[15px]">{c.right}</p>
                <button className="btn btn-signal" autoFocus onClick={() => (useGame.getState().setMinigame(null), onSolved())}>Continua</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
