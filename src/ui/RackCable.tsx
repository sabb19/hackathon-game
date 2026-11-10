import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store/game'
import { sfx } from '../audio'
import { lockPointer } from '../world/pointer'

// Minigioco — il pannello delle porte del Rack B.
// 1) prendi il cavo staccato (etichetta ROUTER)  2) trova la porta con la stessa etichetta  3) spingi finché non fa clic.
// Si impara: i cavi si riconoscono dalle etichette; il LED della porta dice se il collegamento è attivo (verde) o no.

const W = 1000
const H = 600
const PORTS = Array.from({ length: 24 }, (_, i) => {
  const row = Math.floor(i / 12)
  const col = i % 12
  return { n: i + 1, x: 170 + col * 60 + (col >= 6 ? 20 : 0), y: 250 + row * 110 }
})
// etichette scritte a mano da Ada sopra le porte
const LABEL: Record<number, string> = { 1: 'SEC-01', 2: 'BACKUP', 3: 'WS-NOTTE', 4: 'ROUTER', 5: 'STAMP.', 6: 'WS-BRUNO', 7: '???', 9: 'STAMP.2', 11: 'TELEF.', 13: 'AP-1', 14: 'AP-2', 17: 'CAM-1', 18: 'CAM-2', 21: 'BADGE' }
// porte già occupate (colore del cavo)
const BUSY: Record<number, string> = { 1: '#E8823A', 2: '#E8823A', 3: '#5b9bd5', 5: '#5b9bd5', 6: '#5b9bd5', 7: '#9c9a8f', 9: '#5b9bd5', 11: '#d9c24a', 13: '#6FBF8E', 14: '#6FBF8E', 17: '#c06bd8', 18: '#c06bd8', 21: '#d9c24a' }
const TARGET = 4
const ANCHOR = { x: 120, y: H + 40 } // il cavo arriva dal basso, dal passacavi

type Phase = 'grab' | 'drag' | 'seated' | 'pushing' | 'link' | 'done'

export default function RackCable() {
  const [phase, setPhase] = useState<Phase>('grab')
  const [plug, setPlug] = useState({ x: 200, y: 520 })
  const [msg, setMsg] = useState('Il cavo blu è staccato. Prendilo: tieni premuto sul connettore e trascinalo.')
  const [push, setPush] = useState(0)
  const [bad, setBad] = useState<number | null>(null)
  const [t, setT] = useState(0)
  const svg = useRef<SVGSVGElement>(null)
  const pushTimer = useRef<number | null>(null)

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
    const id = setInterval(() => setT((x) => x + 1), 250)
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close(false)
    window.addEventListener('keydown', k)
    return () => {
      clearInterval(id)
      window.removeEventListener('keydown', k)
    }
  }, [])

  const toSvg = (e: { clientX: number; clientY: number }) => {
    const m = svg.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }
  const portAt = (x: number, y: number) => PORTS.find((p) => Math.abs(p.x - x) < 26 && Math.abs(p.y + 8 - y) < 30)

  const close = (ok: boolean) => {
    const g = useGame.getState()
    g.setMinigame(null)
    if (ok) {
      g.setFlag('cablePlugged')
      g.setInspect(null)
      g.say('teo', 'Ho visto la lucina diventare verde! Torna al PC e rimanda il messaggio di prova.')
      g.goto('m1_verify')
    }
    lockPointer()
  }

  const onDown = (e: React.PointerEvent) => {
    if (phase === 'grab' || phase === 'drag') {
      const p = toSvg(e)
      if (Math.hypot(p.x - plug.x, p.y - plug.y) < 40) {
        setPhase('drag')
        sfx.click()
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        setMsg("Trova la porta giusta: l'etichetta sul cavo dice ROUTER. Le etichette di Ada sono sopra le porte.")
      }
    } else if (phase === 'seated') {
      // tieni premuto per spingere il connettore fino al clic
      setPhase('pushing')
      const start = performance.now()
      pushTimer.current = window.setInterval(() => {
        const k = Math.min(1, (performance.now() - start) / 800)
        setPush(k)
        if (k >= 1) {
          window.clearInterval(pushTimer.current!)
          sfx.click()
          sfx.slam(0)
          setPhase('link')
          setMsg('Clic! Il LED lampeggia arancione: lo switch sta "negoziando" il collegamento…')
          setTimeout(() => {
            setPhase('done')
            setMsg('LED verde: collegamento attivo. Il ponte verso la sala server è di nuovo in piedi.')
            sfx.click()
          }, 1600)
        }
      }, 30)
    }
  }
  const onMove = (e: React.PointerEvent) => {
    if (phase !== 'drag') return
    const p = toSvg(e)
    setPlug({ x: Math.max(40, Math.min(W - 40, p.x)), y: Math.max(120, Math.min(H - 20, p.y)) })
  }
  const onUp = () => {
    if (phase === 'pushing') {
      window.clearInterval(pushTimer.current!)
      if (push < 1) {
        setPhase('seated')
        setPush(0)
        setMsg('Non è entrato fino in fondo. Tieni premuto più a lungo, finché non senti il clic.')
      }
      return
    }
    if (phase !== 'drag') return
    const port = portAt(plug.x, plug.y)
    if (!port) return
    if (BUSY[port.n]) {
      sfx.denied()
      setBad(port.n)
      setMsg(`La porta ${port.n} è già occupata (${LABEL[port.n] ?? 'senza etichetta'}). Cerca l'etichetta ROUTER.`)
      setTimeout(() => setBad(null), 900)
      return
    }
    if (port.n !== TARGET) {
      sfx.denied()
      setBad(port.n)
      setMsg(`La porta ${port.n} è libera, ma l'etichetta non corrisponde. Il cavo deve tornare dove era: ROUTER.`)
      setTimeout(() => setBad(null), 900)
      return
    }
    setPlug({ x: port.x, y: port.y + 6 })
    setPhase('seated')
    sfx.click()
    setMsg('Porta giusta! Ora spingi: tieni premuto sul connettore finché non fa clic.')
  }

  const target = PORTS[TARGET - 1]
  const blink = t % 2 === 0
  const ledFor = (n: number) => {
    if (n === TARGET) return phase === 'done' ? '#6FBF8E' : phase === 'link' ? (blink ? '#E8823A' : '#3a2414') : blink ? '#D9644A' : '#4a1c14'
    if (n === 7) return t % 3 === 0 ? '#E8823A' : '#3a2414' // il cavo grigio di SANDBOX-7: già lì, già strano
    return BUSY[n] ? ((t + n) % 5 === 0 ? '#2c5a3c' : '#6FBF8E') : '#1d2a22'
  }
  // il cavo pende con un po' di peso
  const sag = Math.max(40, 160 - Math.abs(plug.y - ANCHOR.y) * 0.2)
  const cable = `M ${ANCHOR.x} ${ANCHOR.y} C ${ANCHOR.x} ${ANCHOR.y - 120}, ${plug.x} ${plug.y + sag}, ${plug.x} ${plug.y + 22}`

  return (
    <div className="absolute inset-0 z-[70] bg-ink/85 flex flex-col items-center justify-center p-6" onContextMenu={(e) => (e.preventDefault(), close(false))}>
      <div className="w-full max-w-5xl flex items-stretch mb-3">
        <span className="sign-num text-2xl flex items-center">B</span>
        <div className="bg-cream text-ink px-4 py-2 flex-1 flex items-center justify-between gap-4">
          <span className="font-display font-black uppercase text-xl">Rack B · pannello delle porte</span>
          <span className="text-[13px] text-ink/60">Esc o tasto destro per lasciare</span>
        </div>
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-5xl bg-[#121519] select-none touch-none"
        style={{ cursor: phase === 'drag' ? 'grabbing' : phase === 'grab' || phase === 'seated' ? 'grab' : 'default' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      >
        {/* montanti del rack con i fori */}
        {[60, W - 60].map((x) => (
          <g key={x}>
            <rect x={x - 22} y={0} width={44} height={H} fill="#1d2126" />
            {Array.from({ length: 24 }, (_, i) => <rect key={i} x={x - 6} y={12 + i * 25} width={12} height={8} rx={2} fill="#0b0d10" />)}
          </g>
        ))}
        {/* switch sopra: frontale con le scritte */}
        <rect x={110} y={70} width={W - 220} height={80} fill="#2a2f35" />
        <text x={130} y={118} fill="#9aa3ad" fontSize={22} fontFamily="Big Shoulders Display" fontWeight={800} letterSpacing={2}>SWITCH UFFICI · 24 PORTE</text>
        {[0, 1, 2, 3].map((i) => <circle key={i} cx={W - 160 + i * 22} cy={110} r={5} fill={i === 0 ? '#6FBF8E' : '#1d2a22'} />)}
        {/* pannello delle porte */}
        <rect x={110} y={190} width={W - 220} height={250} fill="#2f343a" />
        {PORTS.map((p) => (
          <g key={p.n}>
            {/* etichetta scritta a mano */}
            {LABEL[p.n] && (
              <g>
                <rect x={p.x - 27} y={p.y - 62} width={54} height={18} fill="#efe6c8" opacity={0.92} />
                <text x={p.x} y={p.y - 48} textAnchor="middle" fontSize={12} fontFamily="Caveat" fontWeight={700} fill={p.n === 7 ? '#b4442e' : '#1d3a63'}>{LABEL[p.n]}</text>
              </g>
            )}
            {/* LED di collegamento */}
            <circle cx={p.x} cy={p.y - 32} r={5} fill={ledFor(p.n)} />
            {/* presa */}
            <rect x={p.x - 20} y={p.y - 20} width={40} height={34} rx={3} fill={bad === p.n ? '#D9644A' : '#0d0f12'} stroke={p.n === TARGET && phase === 'drag' ? '#E8823A' : '#454b52'} strokeWidth={p.n === TARGET && phase === 'drag' ? 2 : 1.2} />
            <rect x={p.x - 7} y={p.y + 8} width={14} height={6} fill="#1c1f24" />
            <text x={p.x} y={p.y + 34} textAnchor="middle" fontSize={13} fontFamily="JetBrains Mono" fill="#9aa3ad">{p.n}</text>
            {/* cavi già collegati: scendono verso il basso */}
            {BUSY[p.n] && (
              <g>
                <rect x={p.x - 13} y={p.y - 14} width={26} height={28} rx={3} fill={BUSY[p.n]} />
                <path d={`M ${p.x} ${p.y + 14} C ${p.x} ${p.y + 120}, ${p.x + (p.n % 2 ? 30 : -30)} ${H - 40}, ${p.x + (p.n % 2 ? 40 : -40)} ${H + 20}`} stroke={BUSY[p.n]} strokeWidth={9} fill="none" strokeLinecap="round" />
              </g>
            )}
          </g>
        ))}
        {/* il cavo del giocatore */}
        <path d={cable} stroke="#3d7bd0" strokeWidth={10} fill="none" strokeLinecap="round" />
        <g transform={`translate(${plug.x},${plug.y})`}>
          {/* connettore RJ45 con la levetta */}
          <rect x={-15} y={-14 - (phase === 'pushing' ? -push * 6 : 0)} width={30} height={34} rx={3} fill="#cfe0f0" stroke="#7f98b2" strokeWidth={1.5} opacity={0.95} />
          <rect x={-6} y={-20} width={12} height={8} fill="#cfe0f0" stroke="#7f98b2" strokeWidth={1} />
          {/* etichetta del cavo */}
          <g transform="translate(26, 6) rotate(-8)">
            <rect x={0} y={-11} width={64} height={20} fill="#efe6c8" />
            <text x={32} y={4} textAnchor="middle" fontSize={13} fontFamily="Caveat" fontWeight={700} fill="#1d3a63">ROUTER</text>
          </g>
          {(phase === 'grab' || phase === 'seated') && <circle r={34} fill="none" stroke="#E8823A" strokeWidth={2} strokeDasharray="6 5" opacity={blink ? 0.9 : 0.4} />}
          {phase === 'pushing' && <circle r={30} fill="none" stroke="#E8823A" strokeWidth={5} strokeDasharray={`${push * 188} 188`} transform="rotate(-90)" />}
        </g>
        {/* aiuto visivo: la porta di destinazione dopo un errore */}
        {phase === 'drag' && bad !== null && <circle cx={target.x} cy={target.y - 32} r={14} fill="none" stroke="#E8823A" strokeWidth={2} />}
      </svg>
      <div className="w-full max-w-5xl bg-cream text-ink px-5 py-3 flex items-center gap-4">
        <p className="flex-1 text-[16px] leading-snug">{msg}</p>
        {phase === 'done' && (
          <button className="btn btn-signal" onClick={() => close(true)} autoFocus>
            Fatto
          </button>
        )}
      </div>
      {phase === 'done' && (
        <p className="w-full max-w-5xl text-[14px] text-cream/75 mt-3">
          <b className="text-cream">Il LED di una porta</b> dice se c'è collegamento: spento = niente cavo o niente segnale, verde = collegamento attivo, lampeggio = dati che passano.
          E le etichette? Senza, in un rack con centinaia di cavi nessuno saprebbe cosa staccare. Ada le scriveva tutte. Quasi tutte.
        </p>
      )}
    </div>
  )
}
