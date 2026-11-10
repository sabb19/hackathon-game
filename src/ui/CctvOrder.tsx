import { useEffect, useState } from 'react'
import { useGame } from '../store/game'
import { sfx } from '../audio'
import { lockPointer } from '../world/pointer'

// Minigioco — le registrazioni delle telecamere (capitolo 5, ispirato a Obra Dinn / Her Story).
// 1) Clicca i fotogrammi in ordine di tempo: l'orario è in parte illeggibile, i dettagli (luci, serrande) aiutano.
// 2) Domanda: alle 23:31 qualcuno era fisicamente al piano? (No: l'attacco è arrivato dalla rete.)

type Frame = { id: string; cam: string; time: string; caption: string; draw: 'elevator' | 'archive' | 'desk' | 'stairs' | 'lockdown' }
const FRAMES: Frame[] = [
  { id: 'c', cam: 'CAM-1 · OPEN SPACE', time: '23:3▒', caption: 'Tu alla scrivania. Nessun altro al piano.', draw: 'desk' },
  { id: 'e', cam: 'CAM-2 · CORRIDOIO', time: '23:4▒', caption: 'Serrande abbassate, luci arancioni.', draw: 'lockdown' },
  { id: 'a', cam: 'CAM-2 · CORRIDOIO', time: '20:4▒', caption: "Tu esci dall'ascensore. Luci dell'archivio accese.", draw: 'elevator' },
  { id: 'd', cam: 'CAM-2 · CORRIDOIO', time: '23:4▒', caption: 'Tu davanti alla porta delle scale. Serrande alzate.', draw: 'stairs' },
  { id: 'b', cam: 'CAM-3 · ARCHIVIO', time: '21:▒0', caption: "Le luci dell'archivio si spengono.", draw: 'archive' },
]
const ORDER = ['a', 'b', 'c', 'd', 'e']

// Un fotogramma "di sorveglianza": grigio-verde, grana, sagome semplici
function FrameArt({ kind }: { kind: Frame['draw'] }) {
  const orange = kind === 'lockdown'
  return (
    <svg viewBox="0 0 320 180" className="w-full h-full block" aria-hidden="true">
      <rect width="320" height="180" fill={orange ? '#2a1a10' : '#1a2420'} />
      {/* pavimento in prospettiva */}
      <path d="M0 180 L110 95 L210 95 L320 180 Z" fill={orange ? '#3a2414' : '#25332d'} />
      {kind === 'elevator' && (
        <g>
          <rect x="128" y="40" width="64" height="58" fill="#3a4a44" />
          <rect x="140" y="44" width="40" height="54" fill="#6f8a7f" />
          <circle cx="160" cy="112" r="7" fill="#c9d6cf" /><rect x="153" y="119" width="14" height="30" fill="#c9d6cf" />
          <rect x="250" y="40" width="40" height="30" fill="#e8e0b0" opacity="0.8" />
          <text x="252" y="82" fontSize="10" fill="#9ab0a6" fontFamily="JetBrains Mono">archivio</text>
        </g>
      )}
      {kind === 'archive' && (
        <g>
          <rect x="40" y="30" width="240" height="70" fill="#121815" />
          <rect x="60" y="40" width="40" height="55" fill="#2f3d36" /><rect x="110" y="40" width="40" height="55" fill="#2f3d36" />
          <rect x="230" y="60" width="10" height="16" fill="#c9d6cf" />
          <text x="200" y="120" fontSize="12" fill="#9ab0a6" fontFamily="JetBrains Mono">luci: OFF</text>
        </g>
      )}
      {kind === 'desk' && (
        <g>
          {[40, 130, 220].map((x) => <rect key={x} x={x} y="80" width="70" height="14" fill="#3a4a44" />)}
          <rect x="242" y="62" width="22" height="16" fill="#9fc0d8" />
          <circle cx="252" cy="96" r="7" fill="#c9d6cf" /><rect x="245" y="103" width="14" height="18" fill="#c9d6cf" />
          <text x="20" y="160" fontSize="11" fill="#9ab0a6" fontFamily="JetBrains Mono">persone: 1</text>
        </g>
      )}
      {(kind === 'stairs' || kind === 'lockdown') && (
        <g>
          <rect x="130" y="40" width="60" height="58" fill={orange ? '#4a2a14' : '#3a4a44'} />
          <text x="142" y="36" fontSize="10" fill="#9ab0a6" fontFamily="JetBrains Mono">SCALE</text>
          {/* finestre con o senza serranda */}
          {[20, 250].map((x) => (
            <g key={x}>
              <rect x={x} y="30" width="50" height="50" fill={orange ? '#5a3a1e' : '#2f4a5a'} />
              {orange && Array.from({ length: 8 }, (_, i) => <rect key={i} x={x} y={32 + i * 6} width="50" height="2" fill="#7a5030" />)}
            </g>
          ))}
          {kind === 'stairs' && <g><circle cx="160" cy="110" r="7" fill="#c9d6cf" /><rect x="153" y="117" width="14" height="30" fill="#c9d6cf" /></g>}
          {orange && <circle cx="160" cy="20" r="8" fill="#E8823A" />}
        </g>
      )}
      {/* grana */}
      <rect width="320" height="180" fill="url(#grain)" opacity="0.25" />
      <defs>
        <pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="#fff" opacity="0.15" />
          <rect x="2" y="3" width="1" height="1" fill="#000" opacity="0.3" />
        </pattern>
      </defs>
    </svg>
  )
}

export default function CctvOrder() {
  const [picked, setPicked] = useState<string[]>([])
  const [msg, setMsg] = useState("Clicca i fotogrammi dal più vecchio al più recente.")
  const [phase, setPhase] = useState<'order' | 'question' | 'done'>('order')
  const [qWrong, setQWrong] = useState(false)

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
    const k = (e: KeyboardEvent) => e.key === 'Escape' && phase !== 'done' && close(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  const close = (ok: boolean) => {
    const g = useGame.getState()
    g.setMinigame(null)
    if (ok) {
      g.learn('log')
      g.goto('m4_logs')
    }
    lockPointer()
  }
  const pick = (id: string) => {
    if (phase !== 'order' || picked.includes(id)) return
    sfx.click()
    const next = [...picked, id]
    setPicked(next)
    if (next.length < FRAMES.length) return
    const wrongAt = next.findIndex((x, i) => x !== ORDER[i])
    if (wrongAt === -1) {
      setPhase('question')
      setMsg('Ordine giusto: la notte, fotogramma dopo fotogramma.')
      return
    }
    sfx.denied()
    const hint =
      next.indexOf('d') > next.indexOf('e')
        ? 'Le serrande si abbassano DOPO che passi il badge alle scale, non prima.'
        : next.indexOf('b') < next.indexOf('a')
          ? "All'inizio le luci dell'archivio sono ancora accese: si spengono dopo che arrivi."
          : `Il fotogramma n. ${wrongAt + 1} non è al posto giusto: guarda le cifre leggibili dell'orario.`
    setMsg(hint)
    setTimeout(() => setPicked([]), 1400)
  }
  const answer = (someone: boolean) => {
    if (someone) {
      sfx.denied()
      setQWrong(true)
      return
    }
    sfx.click()
    setPhase('done')
  }

  return (
    <div className="absolute inset-0 z-[70] bg-ink/90 flex flex-col items-center justify-center p-6" onContextMenu={(e) => (e.preventDefault(), phase !== 'done' && close(false))}>
      <div className="w-full max-w-6xl flex items-stretch mb-4">
        <span className="sign-num text-2xl flex items-center">5</span>
        <div className="bg-cream text-ink px-4 py-2 flex-1 flex items-center justify-between">
          <span className="font-display font-black uppercase text-xl">Registrazioni della notte</span>
          <span className="text-[13px] text-ink/60">Esc o tasto destro per lasciare</span>
        </div>
      </div>
      <div className="w-full max-w-6xl grid grid-cols-5 gap-3">
        {FRAMES.map((f) => {
          const n = picked.indexOf(f.id)
          return (
            <button key={f.id} onClick={() => pick(f.id)} className={`text-left bg-[#0d1210] border-2 ${n >= 0 ? 'border-signal' : 'border-[#2b3a33] hover:border-cream/60'} relative`}>
              <div className="aspect-video"><FrameArt kind={f.draw} /></div>
              <div className="absolute top-1 left-1.5 font-mono text-[11px] text-[#cfe0d6]">{f.cam}</div>
              <div className="absolute top-1 right-1.5 font-mono text-[12px] text-[#E8823A]">{f.time}</div>
              {n >= 0 && <div className="absolute top-8 left-2 w-9 h-9 bg-signal text-ink font-display font-black text-[22px] flex items-center justify-center">{n + 1}</div>}
              <p className="p-2 text-[13px] text-cream/85 leading-snug min-h-[54px]">{f.caption}</p>
            </button>
          )
        })}
      </div>
      <div className="w-full max-w-6xl bg-cream text-ink px-5 py-3 mt-4 space-y-2">
        <p className="text-[16px]">{msg}</p>
        {phase === 'order' && picked.length > 0 && <button className="btn" onClick={() => setPicked([])}>Ricomincia</button>}
        {phase === 'question' && (
          <>
            <p className="text-[16px] font-semibold">Alle 23:31 le credenziali di Bruno entrano nel sistema. In quel momento, chi c'era fisicamente al piano?</p>
            <div className="flex gap-2">
              <button className="btn" onClick={() => answer(true)}>Bruno, entrato di nascosto</button>
              <button className="btn btn-signal" onClick={() => answer(false)}>Nessuno oltre a me</button>
            </div>
            {qWrong && <p className="text-[14px] text-[#b4442e]">Guarda il fotogramma dell'open space alle 23:3▒: "persone: 1". Eri solo/a. Nessuna porta si è aperta.</p>}
          </>
        )}
        {phase === 'done' && (
          <>
            <p className="text-[15px]">Esatto: nessuno è entrato dalla porta. Chi ha usato le credenziali di Bruno è entrato <b>dalla rete</b>, da fuori. Le telecamere non bastano: servono i log dei sistemi.</p>
            <button className="btn btn-signal" autoFocus onClick={() => close(true)}>Chiedi i log a Teo</button>
          </>
        )}
      </div>
    </div>
  )
}
