import { useEffect, useMemo, useRef, useState } from 'react'
import { cableKey, useGame } from '../../store/game'
import { LAB_DEVICES, PHYSICAL_LINK, type LabDevice } from '../../content/network'
import { CONCEPTS, type ConceptId } from '../../content/concepts'
import { stepIndex } from '../../content/steps'
import { lockPointer } from '../../world/pointer'
import { Icon } from '../icons'

// Laboratorio di rete — percorso in 3 tappe, ognuna: capisci → provi → vedi → passo successivo.
// 1 IL QUARTIERE: PC, switch, stampante. Trascina il cavo PC→switch, manda un messaggio alla stampante.
// 2 IL PONTE: compare il quartiere dei server. Il messaggio si ferma allo switch. Collega switch→router.
// 3 IL GUASTO: il router c'è, ma il cavo fisico verso la sala server è staccato. Vai al rack.

const dev = (id: string) => LAB_DEVICES.find((d) => d.id === id)!
const isInfra = (d: LabDevice) => d.kind === 'switch' || d.kind === 'router'
const W = 960
const H = 440
const NET_COLOR = { 1: '#5b9bd5', 2: '#E8823A' } as const

interface Trace {
  ok: boolean
  path: string[]
  bubbles: string[] // fumetto per ogni tappa
  verdict: string
  next?: string // cosa fare adesso
  reachedRouter?: boolean
  target: string
}

function bfs(adj: Map<string, string[]>, from: string, to: string): string[] | null {
  const prev = new Map<string, string | null>([[from, null]])
  const q = [from]
  while (q.length) {
    const n = q.shift()!
    if (n === to) {
      const path: string[] = []
      for (let c: string | null = n; c; c = prev.get(c) ?? null) path.unshift(c)
      return path
    }
    if (n !== from && !isInfra(dev(n))) continue
    for (const m of adj.get(n) ?? []) {
      if (prev.has(m) || (!isInfra(dev(m)) && m !== to)) continue
      prev.set(m, n)
      q.push(m)
    }
  }
  return null
}

function trace(adj: Map<string, string[]>, target: string): Trace {
  const dst = dev(target)
  const pcLinks = adj.get('pc') ?? []
  if (!pcLinks.length)
    return { ok: false, path: ['pc'], bubbles: ['Nessun cavo… il messaggio non può partire.'], verdict: 'Il tuo PC non è collegato a niente.', next: 'Trascina un cavo dalla presa del tuo PC alla presa dello switch.', target }
  if (dst.net === 1) {
    const path = bfs(adj, 'pc', target)
    if (path) return { ok: true, path, bubbles: ['Parto! Destinatario: 192.168.1.30', '1.30? È nel mio quartiere: lo consegno.', 'Arrivato! Ci sono.'], verdict: 'Il messaggio è arrivato: lo switch smista i messaggi dentro il suo quartiere.', target }
    return { ok: false, path: ['pc'], bubbles: ['Non trovo la strada.'], verdict: 'La stampante non è raggiungibile.', next: 'Collega il PC allo switch degli uffici.', target }
  }
  if (pcLinks.includes(target))
    return { ok: false, path: ['pc'], bubbles: ['Questo cavo porta in un altro quartiere…'], verdict: 'PC e SECURITY-01 sono in quartieri diversi: senza il ponte non si capiscono.', next: 'Togli il cavo diretto (cliccalo) e passa dallo switch e dal router.', target }
  const toRouter = bfs(adj, 'pc', 'router')
  const fromRouter = toRouter ? bfs(adj, 'router', target) : null
  if (toRouter && fromRouter)
    return { ok: true, path: [...toRouter, ...fromRouter.slice(1)], bubbles: ['Parto! Destinatario: 192.168.2.10', '2.10 non è mio: lo passo al ponte.', 'Conosco il quartiere 2: di qua!', '2.10 è mio: consegno.', 'Arrivato! Ci sono.'], verdict: 'Il messaggio ha attraversato due quartieri grazie al router.', reachedRouter: true, target }
  if (!toRouter) {
    const viaSwitch = pcLinks.includes('sw1')
    return {
      ok: false,
      path: viaSwitch ? ['pc', 'sw1'] : ['pc'],
      bubbles: viaSwitch ? ['Parto! Destinatario: 192.168.2.10', '192.168.2? Non è il mio quartiere… e non c\'è un ponte!'] : ['Non trovo la strada.'],
      verdict: 'Lo switch conosce solo il suo quartiere. Per uscire serve il ponte: il router.',
      next: 'Trascina un cavo dallo switch degli uffici al router.',
      target,
    }
  }
  return {
    ok: false,
    path: toRouter,
    bubbles: ['Parto! Destinatario: 192.168.2.10', '2.10 non è mio: lo passo al ponte.', 'Lo mando di là… ma nessuno risponde!'],
    verdict: 'Il ponte funziona, ma il cavo tra router e sala server è staccato: fisicamente, nel rack.',
    next: 'Vai in sala server e ricollega il cavo (Rack B, porta 4).',
    reachedRouter: true,
    target,
  }
}

// Scheda "prima di provare": il concetto spiegato semplice, dal taccuino di Ada.
function ConceptCard({ ids, title, onOk }: { ids: ConceptId[]; title: string; onOk: () => void }) {
  return (
    <div className="absolute inset-0 z-20 bg-ink/70 flex items-center justify-center p-6" onClick={onOk}>
      <div className="max-w-xl w-full bg-cream text-ink fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-stretch">
          <span className="sign-num text-3xl flex items-center">?</span>
          <span className="font-display font-black uppercase text-2xl px-4 py-2">{title}</span>
        </div>
        <div className="p-5 space-y-4">
          {ids.map((id) => (
            <div key={id}>
              <div className="font-display font-black uppercase text-xl">{CONCEPTS[id].title}: <span className="normal-case font-sans font-semibold text-[16px]">{CONCEPTS[id].short}</span></div>
              <p className="text-[15px] leading-relaxed mt-1">{CONCEPTS[id].body[0]}</p>
              <p className="text-[15px] italic text-ink/70 border-l-4 border-signal pl-3 mt-2">{CONCEPTS[id].analogy}</p>
            </div>
          ))}
          <button className="btn btn-signal" onClick={onOk}>Ho capito, proviamo</button>
        </div>
      </div>
    </div>
  )
}

function DeviceIcon({ d, hot }: { d: LabDevice; hot: boolean }) {
  const stroke = hot ? '#E8823A' : '#c9d4df'
  const fill = '#16212d'
  return (
    <g>
      {hot && <circle r={54} fill="none" stroke="#E8823A" strokeWidth={2} strokeDasharray="6 6" className="animate-pulse" />}
      {d.kind === 'pc' && (<><rect x={-30} y={-28} width={60} height={42} rx={3} fill={fill} stroke={stroke} strokeWidth={2.5} /><rect x={-23} y={-21} width={46} height={28} fill="#2B4A6B" /><rect x={-12} y={16} width={24} height={6} fill={stroke} /></>)}
      {d.kind === 'printer' && (<><rect x={-32} y={-12} width={64} height={32} rx={3} fill={fill} stroke={stroke} strokeWidth={2.5} /><rect x={-20} y={-27} width={40} height={15} fill="#E8DFC9" /></>)}
      {d.kind === 'switch' && (<><rect x={-46} y={-17} width={92} height={34} rx={3} fill={fill} stroke={stroke} strokeWidth={2.5} />{[...Array(6)].map((_, i) => <rect key={i} x={-37} y={-5} width={9} height={9} transform={`translate(${i * 13},0)`} fill="#6FBF8E" />)}</>)}
      {d.kind === 'router' && (<><circle r={32} fill={fill} stroke={stroke} strokeWidth={2.5} /><path d="M-20 8 q20 -28 40 0 M-20 8 h40 M-13 8 v-7 M0 8 v-13 M13 8 v-7" stroke="#E8DFC9" strokeWidth={2.2} fill="none" /></>)}
      {d.kind === 'server' && (<><rect x={-24} y={-34} width={48} height={68} rx={3} fill={fill} stroke={stroke} strokeWidth={2.5} />{[0, 1, 2].map((i) => <g key={i}><rect x={-16} y={-26 + i * 19} width={32} height={12} fill="#2B4A6B" /><circle cx={11} cy={-20 + i * 19} r={2.2} fill="#E8823A" /></g>)}</>)}
    </g>
  )
}

export default function NetLab() {
  const p = useGame((s) => s.progress)!
  const [drag, setDrag] = useState<{ from: string; x: number; y: number } | null>(null)
  const [hoverDev, setHoverDev] = useState<string | null>(null)
  const [hoverCable, setHoverCable] = useState<string | null>(null)
  const [result, setResult] = useState<Trace | null>(null)
  const [anim, setAnim] = useState<{ t: number; tr: Trace } | null>(null)
  const [card, setCard] = useState<null | 1 | 2>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const g = useGame.getState()

  const si = stepIndex(p.step)
  const plugged = si >= stepIndex('m1_verify')
  const done = si >= stepIndex('m2_monitor')
  // tappa: 1 quartiere, 2 ponte, 3 guasto fisico, 4 verifica
  const stage = !p.flags.pingPrinter ? 1 : si < stepIndex('m1_plug') ? 2 : !plugged ? 3 : 4
  const visible = stage === 1 ? ['pc', 'sw1', 'printer'] : LAB_DEVICES.map((d) => d.id)
  const target = stage === 1 ? 'printer' : 'security'

  // la scheda del concetto compare all'inizio delle tappe 1 e 2 (una volta sola)
  useEffect(() => {
    if (stage === 1 && !p.flags.labCard1) setCard(1)
    if (stage === 2 && !p.flags.labCard2) setCard(2)
  }, [stage])
  const closeCard = () => {
    if (card === 1) g.setFlag('labCard1')
    if (card === 2) g.setFlag('labCard2')
    if (card === 2) {
      g.learn('ip')
      g.learn('router')
    }
    setCard(null)
  }

  const adj = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const k of [...p.cables, ...(plugged ? [PHYSICAL_LINK] : [])]) {
      const [a, b] = k.split('|')
      m.set(a, [...(m.get(a) ?? []), b])
      m.set(b, [...(m.get(b) ?? []), a])
    }
    return m
  }, [p.cables, plugged])

  const toSvg = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  const deviceAt = (x: number, y: number) => LAB_DEVICES.find((d) => visible.includes(d.id) && Math.hypot(d.x - x, d.y - y) < 55)?.id ?? null

  const finishDrag = (to: string | null) => {
    if (!drag) return
    const from = drag.from
    setDrag(null)
    if (!to || to === from) return
    if (cableKey(from, to) === PHYSICAL_LINK) return
    if (!p.cables.includes(cableKey(from, to))) {
      g.toggleCable(from, to)
      setResult(null)
    }
  }

  const send = () => {
    setResult(null)
    setAnim({ t: 0, tr: trace(adj, target) })
  }

  const finish = (tr: Trace) => {
    setAnim(null)
    setResult(tr)
    const s = useGame.getState()
    if (tr.ok && tr.target === 'printer') {
      s.learn('rete')
      s.learn('switch')
      s.learn('pacchetto')
      if (!s.progress?.flags.pingPrinter) {
        s.setFlag('pingPrinter')
        s.say('teo', 'Arrivato! Lo switch consegna i messaggi dentro il quartiere. Ora la parte difficile: SECURITY-01.')
      }
    }
    if (tr.target === 'security') {
      s.setFlag('triedSecurity')
      if (!tr.ok && tr.path.includes('sw1')) s.learn('ip')
    }
    if (tr.reachedRouter) s.learn('router')
    if (!tr.ok && tr.reachedRouter && s.progress?.step === 'm1_lab') s.goto('m1_plug')
    if (tr.ok && tr.target === 'security' && s.progress?.step === 'm1_verify') s.goto('m2_monitor')
  }

  useEffect(() => {
    if (!anim) return
    const total = anim.tr.path.length - 1
    const start = performance.now()
    const HOP = 1300 // tempo per tappa: abbastanza per leggere il fumetto
    const iv = setInterval(() => {
      const tt = (performance.now() - start) / HOP
      if (tt >= Math.max(total, 0) + 0.9) {
        clearInterval(iv)
        finish(anim.tr)
      } else setAnim((a) => (a ? { ...a, t: tt } : a))
    }, 16)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim?.tr])

  // posizione del messaggio e fumetto corrente
  let packet: { x: number; y: number } | null = null
  let bubble: { x: number; y: number; text: string; bad: boolean } | null = null
  if (anim) {
    const n = anim.tr.path.length
    const seg = Math.min(Math.floor(anim.t), n - 1)
    const f = Math.min(1, (anim.t - seg) * 1.6) // si muove, poi resta fermo a "parlare"
    const a = dev(anim.tr.path[seg])
    const b = dev(anim.tr.path[Math.min(seg + 1, n - 1)])
    packet = seg < n - 1 ? { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f } : { x: a.x, y: a.y }
    const at = seg < n - 1 && f >= 1 ? b : a
    const idx = seg < n - 1 && f >= 1 ? seg + 1 : seg
    const last = idx === n - 1
    bubble = { x: at.x, y: at.y - 78, text: anim.tr.bubbles[Math.min(idx, anim.tr.bubbles.length - 1)], bad: last && !anim.tr.ok }
  }

  const instruction = {
    1: !adj.get('pc')?.includes('sw1') ? 'Trascina un cavo dalla presa del tuo PC alla presa dello switch.' : 'Ora premi "Invia messaggio di prova".',
    2: !adj.get('sw1')?.includes('router') ? (p.flags.triedSecurity ? 'Trascina un cavo dallo switch degli uffici al router (il ponte).' : 'Prova a inviare il messaggio a SECURITY-01: cosa succede?') : 'Riprova a inviare il messaggio.',
    3: 'Il cavo verso la sala server è staccato. Alzati e vai a ricollegarlo nel rack.',
    4: done ? 'Fatto: il tuo PC raggiunge SECURITY-01.' : 'Il cavo è ricollegato: riprova a inviare il messaggio.',
  }[stage]
  const hot = stage === 1 && !adj.get('pc')?.includes('sw1') ? ['pc', 'sw1'] : stage === 2 && p.flags.triedSecurity && !adj.get('sw1')?.includes('router') ? ['sw1', 'router'] : []

  return (
    <div className="h-full grid grid-cols-[1fr_300px] bg-[#0f1822] text-cream relative">
      {card === 1 && <ConceptCard title="Tappa 1 · Il quartiere" ids={['rete', 'switch']} onOk={closeCard} />}
      {card === 2 && <ConceptCard title="Tappa 2 · Il ponte" ids={['ip', 'router']} onOk={closeCard} />}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full select-none touch-none"
        onPointerMove={(e) => drag && setDrag({ ...drag, ...toSvg(e) })}
        onPointerUp={(e) => {
          const pt = toSvg(e)
          finishDrag(deviceAt(pt.x, pt.y))
        }}
        onPointerLeave={() => setDrag(null)}
      >
        {/* quartieri */}
        <rect x={15} y={20} width={380} height={H - 40} rx={10} fill={NET_COLOR[1]} opacity={0.1} stroke={NET_COLOR[1]} strokeOpacity={0.6} strokeDasharray="8 6" />
        <text x={32} y={50} fill={NET_COLOR[1]} fontSize={18} fontFamily="Big Shoulders Display" fontWeight={900} letterSpacing={1}>QUARTIERE UFFICI</text>
        <text x={32} y={70} fill="#c9d4df" fontSize={13} fontFamily="JetBrains Mono">indirizzi 192.168.<tspan fill={NET_COLOR[1]} fontWeight={700}>1</tspan>.___</text>
        {stage > 1 && (
          <g className="fade-up">
            <rect x={590} y={20} width={355} height={H - 40} rx={10} fill={NET_COLOR[2]} opacity={0.08} stroke={NET_COLOR[2]} strokeOpacity={0.6} strokeDasharray="8 6" />
            <text x={606} y={50} fill={NET_COLOR[2]} fontSize={18} fontFamily="Big Shoulders Display" fontWeight={900} letterSpacing={1}>QUARTIERE SALA SERVER</text>
            <text x={606} y={70} fill="#c9d4df" fontSize={13} fontFamily="JetBrains Mono">indirizzi 192.168.<tspan fill={NET_COLOR[2]} fontWeight={700}>2</tspan>.___</text>
            {/* cavo fisico router → sala server */}
            <line x1={dev('router').x} y1={dev('router').y} x2={dev('sw2').x} y2={dev('sw2').y} stroke={plugged ? '#6FBF8E' : '#D9644A'} strokeWidth={4} strokeDasharray={plugged ? undefined : '10 8'} />
            {!plugged && stage >= 3 && (
              <g transform={`translate(${(dev('router').x + dev('sw2').x) / 2},${dev('router').y})`}>
                <circle r={16} fill="#D9644A" />
                <text y={6} textAnchor="middle" fill="#0F141C" fontSize={20} fontWeight={900}>!</text>
                <text y={36} textAnchor="middle" fill="#ff9a85" fontSize={13} fontFamily="JetBrains Mono">Rack B · porta 4</text>
              </g>
            )}
          </g>
        )}

        {/* cavi del giocatore (clic per togliere) */}
        {p.cables.filter((k) => k.split('|').every((id) => visible.includes(id))).map((k) => {
          const [a, b] = k.split('|').map(dev)
          return (
            <g key={k} className="cursor-pointer" onMouseEnter={() => setHoverCable(k)} onMouseLeave={() => setHoverCable(null)} onClick={() => !anim && (g.toggleCable(a.id, b.id), setResult(null))}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={20} />
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hoverCable === k ? '#D9644A' : '#E8DFC9'} strokeWidth={hoverCable === k ? 5 : 3.5} />
            </g>
          )
        })}
        {drag && <line x1={dev(drag.from).x} y1={dev(drag.from).y} x2={drag.x} y2={drag.y} stroke="#E8823A" strokeWidth={3.5} strokeDasharray="6 5" pointerEvents="none" />}

        {/* dispositivi */}
        {LAB_DEVICES.filter((d) => visible.includes(d.id)).map((d) => {
          const isTarget = !!drag && drag.from !== d.id && hoverDev === d.id
          return (
            <g key={d.id} transform={`translate(${d.x},${d.y})`} onMouseEnter={() => setHoverDev(d.id)} onMouseLeave={() => setHoverDev(null)} role="img" aria-label={d.label}>
              <circle r={50} fill="transparent" />
              <DeviceIcon d={d} hot={hot.includes(d.id) || isTarget} />
              {/* presa: da qui si trascina il cavo */}
              <g
                className="cursor-grab"
                transform="translate(0,40)"
                onPointerDown={(e) => {
                  if (anim) return
                  ;(e.target as Element).releasePointerCapture?.(e.pointerId)
                  setDrag({ from: d.id, ...toSvg(e) })
                }}
              >
                <circle r={10} fill="#0f1822" stroke={hot.includes(d.id) ? '#E8823A' : '#c9d4df'} strokeWidth={2.5} />
                <rect x={-4} y={-3} width={8} height={6} fill={hot.includes(d.id) ? '#E8823A' : '#c9d4df'} />
              </g>
              <text y={70} textAnchor="middle" fill="#E8DFC9" fontSize={15} fontFamily="Inter Tight" fontWeight={600}>{d.label}</text>
              <text y={88} textAnchor="middle" fill="#a9b6c2" fontSize={13} fontFamily="JetBrains Mono">
                {d.ip ? (
                  <>192.168.<tspan fill={NET_COLOR[d.net!]} fontWeight={700}>{d.net}</tspan>.{d.ip.split('.')[3]}</>
                ) : d.kind === 'switch' ? 'smistatore' : 'il ponte'}
              </text>
            </g>
          )
        })}

        {/* il messaggio in viaggio, con il fumetto */}
        {packet && (
          <g transform={`translate(${packet.x},${packet.y})`} pointerEvents="none">
            <circle r={18} fill="#E8823A" opacity={0.25} />
            <rect x={-12} y={-8} width={24} height={16} fill="#E8823A" />
            <path d="M-12 -8 L0 2 L12 -8" stroke="#0F141C" strokeWidth={1.8} fill="none" />
          </g>
        )}
        {bubble && (
          <foreignObject x={Math.max(10, Math.min(W - 270, bubble.x - 130))} y={Math.max(4, bubble.y - 40)} width={260} height={70} pointerEvents="none">
            <div className={`fade-up text-[14px] leading-snug px-3 py-2 ${bubble.bad ? 'bg-[#f2c9bf] text-[#5a1a0e]' : 'bg-cream text-ink'} shadow-lg`}>{bubble.text}</div>
          </foreignObject>
        )}
      </svg>

      {/* pannello guida */}
      <aside className="border-l border-[#2b4a6b] bg-cream text-ink flex flex-col">
        <div className="p-4 border-b border-ink/15">
          <div className="flex gap-1.5 mb-2">
            {[1, 2, 3].map((n) => (
              <span key={n} className={`flex-1 h-1.5 ${stage > n || done ? 'bg-ok' : stage === n ? 'bg-signal' : 'bg-ink/15'}`} />
            ))}
          </div>
          <div className="kicker text-[13px]">Tappa {Math.min(stage, 3)} di 3 · {['Il quartiere', 'Il ponte', 'Il guasto'][Math.min(stage, 3) - 1]}</div>
          <p className="text-[15px] font-semibold leading-snug mt-1">Obiettivo: far arrivare un messaggio dal tuo PC a {stage === 1 ? 'la stampante' : 'SECURITY-01, il server che comanda le porte'}.</p>
        </div>
        <div className="p-4 flex-1">
          <div className="kicker text-[13px] mb-1">Adesso</div>
          <p className="text-[16px] leading-snug">{instruction}</p>
          {(stage === 1 || stage === 2) && (
            <div className="mt-3 flex items-center gap-2 text-[13px] text-ink/70">
              <svg width="56" height="22" viewBox="0 0 56 22" aria-hidden="true"><circle cx="8" cy="11" r="6" fill="none" stroke="#1a1b1d" strokeWidth="2" /><path d="M14 11 H44" stroke="#E8823A" strokeWidth="2.5" strokeDasharray="4 3" /><circle cx="48" cy="11" r="6" fill="none" stroke="#1a1b1d" strokeWidth="2" /></svg>
              tieni premuto sulla presa e trascina
            </div>
          )}
          {result && (
            <div className={`mt-4 p-3 fade-up border-l-4 ${result.ok ? 'border-ok bg-[#e3f1e7]' : 'border-bad bg-[#f6e0d8]'}`}>
              <p className="text-[14px] font-semibold">{result.verdict}</p>
              {result.next && <p className="text-[14px] mt-1">→ {result.next}</p>}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-ink/15 space-y-2">
          {stage === 3 ? (
            <button
              className="btn btn-signal w-full justify-center"
              onClick={() => {
                useGame.getState().setView('world')
                lockPointer()
              }}
            >
              Vado in sala server
            </button>
          ) : (
            <button className="btn btn-signal w-full justify-center" disabled={!!anim || done} onClick={send}>
              <Icon name="mail" size={18} /> Invia messaggio di prova
            </button>
          )}
          <p className="text-[12px] text-ink/60">Il "messaggio di prova" i tecnici lo chiamano ping. Per togliere un cavo, cliccalo.</p>
        </div>
      </aside>
    </div>
  )
}
