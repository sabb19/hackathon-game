import { useEffect, useRef, useState, type ReactNode } from 'react'
import { unreadOf, useGame } from '../store/game'
import { STEPS, stepIndex, type StepId } from '../content/steps'
import type { FsNode } from '../content/files'
import { lockPointer } from '../world/pointer'
import { Icon, type IconName } from './icons'
import Login from './apps/Login'
import PasswordForge from './apps/PasswordForge'
import Mail from './apps/Mail'
import Explorer, { FileView } from './apps/Explorer'
import NetLab from './apps/NetLab'
import NetMonitor from './apps/NetMonitor'

type File = Extract<FsNode, { type: 'file' }>
type AppId = 'mail' | 'explorer' | 'netlab' | 'monitor'

const APPS: Record<AppId, { title: string; icon: IconName; unlock: StepId; lockedWhy: string; w: number; h: number }> = {
  mail: { title: 'Posta', icon: 'mail', unlock: 'm0_login', lockedWhy: '', w: 760, h: 480 },
  explorer: { title: 'Esplora file', icon: 'folder', unlock: 'm0_login', lockedWhy: '', w: 720, h: 460 },
  netlab: { title: 'Laboratorio di rete', icon: 'network', unlock: 'm1_lab', lockedWhy: 'Il Laboratorio di rete si attiva dopo il cambio password di emergenza.', w: 1060, h: 640 },
  monitor: { title: 'Monitor di rete', icon: 'monitor', unlock: 'm2_monitor', lockedWhy: 'Il Monitor di rete ha bisogno di una connessione con SECURITY-01. Al momento il tuo PC non lo raggiunge.', w: 1000, h: 600 },
}
const ORDER: AppId[] = ['mail', 'explorer', 'netlab', 'monitor']

interface Win {
  key: string
  title: string
  icon: IconName
  w: number
  h: number
  x: number
  y: number
  min: boolean
  body: ReactNode
}

function Window({ win, active, z, onFocus, onClose, onMin, onMove }: { win: Win; active: boolean; z: number; onFocus: () => void; onClose: () => void; onMin: () => void; onMove: (x: number, y: number) => void }) {
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  if (win.min) return null
  return (
    <section
      role="dialog"
      aria-label={win.title}
      className="absolute flex flex-col r-plastic p-[3px] boot"
      style={{ left: win.x, top: win.y, width: win.w, height: win.h, zIndex: 10 + z, maxWidth: 'calc(100vw - 16px)', maxHeight: 'calc(100vh - 64px)', boxShadow: active ? '0 24px 70px rgba(0,0,0,0.55), inset 1px 1px 0 #f3ecd8, inset -1px -1px 0 #9c9174' : '0 10px 30px rgba(0,0,0,0.4)' }}
      onPointerDown={onFocus}
    >
      <header
        className={`h-10 flex items-center gap-2 px-3 select-none cursor-move shrink-0 ${active ? 'bg-[#1a1b1d] text-cream' : 'bg-concrete text-cream'}`}
        onPointerDown={(e) => {
          drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y }
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => drag.current && onMove(Math.max(0, e.clientX - drag.current.dx), Math.max(0, e.clientY - drag.current.dy))}
        onPointerUp={() => (drag.current = null)}
      >
        <Icon name={win.icon} size={18} />
        <span className="font-display font-black text-[18px] tracking-wide uppercase">{win.title}</span>
        <span className={`flex-1 h-2.5 mx-2 ${active ? 'r-ridges' : ''}`} />
        <button aria-label="Riduci a icona" className="w-7 h-7 font-mono text-sm leading-none bg-cream text-ink hover:bg-signal" onPointerDown={(e) => e.stopPropagation()} onClick={onMin}>_</button>
        <button aria-label="Chiudi" className="w-7 h-7 font-mono text-sm leading-none bg-cream text-ink hover:bg-signal" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>✕</button>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden mt-[3px] r-sunken">{win.body}</div>
    </section>
  )
}

function Clock() {
  const lock = useGame((s) => !!s.progress?.flags.lockdown)
  const [m, setM] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setM((x) => x + 1), 60000)
    return () => clearInterval(t)
  }, [])
  const base = lock ? 49 : 44
  return <span className="font-mono text-[13px]">23:{String(Math.min(59, base + m)).padStart(2, '0')}</span>
}

export default function Desktop() {
  const p = useGame((s) => s.progress)!
  const [wins, setWins] = useState<Win[]>([])
  const [order, setOrder] = useState<string[]>([])
  const [startOpen, setStartOpen] = useState(false)
  const [selIcon, setSelIcon] = useState<string | null>(null)
  const [dialog, setDialog] = useState<string | null>(null)
  const [popup, setPopup] = useState<string | null>(null)
  const si = stepIndex(p.step)
  const mailUnread = unreadOf(p, 'mail')
  const active = order[order.length - 1]

  const focus = (key: string) => setOrder((o) => [...o.filter((k) => k !== key), key])
  const add = (w: Omit<Win, 'x' | 'y' | 'min'>) => {
    setWins((ws) => {
      const ex = ws.find((x) => x.key === w.key)
      if (ex) return ws.map((x) => (x.key === w.key ? { ...x, min: false } : x))
      const n = ws.length
      return [...ws, { ...w, x: 150 + n * 28, y: 30 + n * 24, min: false }]
    })
    focus(w.key)
  }
  const openFile = (f: File) => add({ key: `file:${f.name}`, title: f.name, icon: f.kind === 'table' ? 'table' : 'file', w: f.kind === 'table' ? 820 : 620, h: 460, body: <FileView file={f} /> })
  const launch = (id: AppId) => {
    setStartOpen(false)
    const a = APPS[id]
    if (si < stepIndex(a.unlock)) return setDialog(a.lockedWhy)
    const body = id === 'mail' ? <Mail /> : id === 'explorer' ? <Explorer openFile={openFile} /> : id === 'netlab' ? <NetLab /> : <NetMonitor />
    add({ key: id, title: a.title, icon: a.icon, w: a.w, h: a.h, body })
  }
  // solo sviluppo: aprire le app da console per i controlli visivi
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__os = { launch }
  })
  const close = (key: string) => {
    setWins((ws) => ws.filter((w) => w.key !== key))
    setOrder((o) => o.filter((k) => k !== key))
  }
  const toggleMin = (key: string) => {
    const w = wins.find((x) => x.key === key)
    if (!w) return
    if (w.min || active !== key) {
      setWins((ws) => ws.map((x) => (x.key === key ? { ...x, min: false } : x)))
      focus(key)
    } else setWins((ws) => ws.map((x) => (x.key === key ? { ...x, min: true } : x)))
  }

  // notifica di sistema quando arriva posta
  const prevMail = useRef(mailUnread)
  useEffect(() => {
    if (mailUnread > prevMail.current) {
      setPopup('Nuovo messaggio nella Posta')
      const t = setTimeout(() => setPopup(null), 5000)
      prevMail.current = mailUnread
      return () => clearTimeout(t)
    }
    prevMail.current = mailUnread
  }, [mailUnread])

  const standUp = () => {
    useGame.getState().setView('world')
    lockPointer()
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && !useGame.getState().note && standUp()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const st = STEPS[p.step]
  const loggedIn = !!p.flags.loggedIn

  return (
    <div className="absolute inset-0 z-30 boot overflow-clip r-screen">
      <div className="absolute inset-0 r-grid" />
      {/* marchio sullo sfondo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div className="text-center opacity-[0.07]">
          <Icon name="relay" size={180} className="mx-auto text-cream" />
          <div className="font-display font-black uppercase text-[160px] leading-none text-cream">Relay</div>
        </div>
      </div>

      {!loggedIn && <Login />}
      {loggedIn && p.step === 'm0_password' && <PasswordForge />}

      {loggedIn && p.step !== 'm0_password' && (
        <>
          {/* icone del desktop */}
          <div className="absolute left-4 top-4 flex flex-col gap-3 z-[5]" onClick={() => setSelIcon(null)}>
            {ORDER.map((id) => {
              const a = APPS[id]
              const locked = si < stepIndex(a.unlock)
              return (
                <button
                  key={id}
                  onClick={(e) => (e.stopPropagation(), setSelIcon(id))}
                  onDoubleClick={() => launch(id)}
                  onKeyDown={(e) => e.key === 'Enter' && launch(id)}
                  className={`group w-24 flex flex-col items-center gap-1.5 p-2 focus:outline focus:outline-2 focus:outline-signal ${selIcon === id ? 'bg-ink/60' : ''}`}
                >
                  <span className={`relative w-14 h-14 flex items-center justify-center bg-cream text-ink group-hover:bg-signal ${locked ? 'opacity-50' : ''}`}>
                    <Icon name={locked ? 'lock' : a.icon} size={30} />
                    {id === 'mail' && mailUnread > 0 && <span className="absolute -top-2 -right-2 bg-signal text-ink text-[12px] font-mono min-w-[22px] h-[22px] rounded-full flex items-center justify-center">{mailUnread}</span>}
                  </span>
                  <span className="font-display font-bold uppercase text-[15px] tracking-wide text-cream leading-tight text-center">{a.title}</span>
                </button>
              )
            })}
          </div>

          {/* promemoria: l'obiettivo, sempre visibile */}
          <aside className="absolute right-4 top-4 w-80 z-[6]">
            <div className="kicker text-[13px] mb-1">{st.chapter}</div>
            <div className="flex">
              <div className="sign-num text-3xl">{String(si).padStart(2, '0')}</div>
              <p className="sign-strip text-[15px] leading-snug px-3 py-2">{st.objective}</p>
            </div>
            <p className="text-[12px] text-cream/60 mt-2">Doppio clic sulle icone per aprire i programmi · T telefono · Esc alzati</p>
          </aside>

          {wins.map((w) => (
            <Window
              key={w.key}
              win={w}
              active={active === w.key}
              z={order.indexOf(w.key)}
              onFocus={() => active !== w.key && focus(w.key)}
              onClose={() => close(w.key)}
              onMin={() => setWins((ws) => ws.map((x) => (x.key === w.key ? { ...x, min: true } : x)))}
              onMove={(x, y) => setWins((ws) => ws.map((v) => (v.key === w.key ? { ...v, x, y } : v)))}
            />
          ))}

          {dialog && (
            <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/30" onClick={() => setDialog(null)}>
              <div className="r-plastic p-[3px] w-[420px]" onClick={(e) => e.stopPropagation()}>
                <div className="h-8 bg-[#1a1b1d] text-cream px-3 flex items-center font-display font-black text-[18px] uppercase tracking-wide">RELAY</div>
                <div className="bg-[#e8e2d2] text-ink p-5 flex gap-4">
                  <Icon name="lock" size={32} className="shrink-0 text-[#b4442e]" />
                  <p className="text-[15px] leading-relaxed">{dialog}</p>
                </div>
                <div className="bg-[#e8e2d2] px-5 pb-4 flex justify-end">
                  <button autoFocus className="r-bevel px-6 py-1.5 font-mono text-sm" onClick={() => setDialog(null)}>OK</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {popup && (
        <div className="absolute right-4 bottom-14 z-[95] r-plastic p-[3px] w-80 fade-up">
          <div className="bg-[#e8e2d2] text-ink p-3 flex gap-3 items-center">
            <Icon name="bell" className="text-[#b4442e]" />
            <span className="text-[14px] flex-1">{popup}</span>
            <button className="r-bevel px-3 py-1 text-xs font-mono" onClick={() => (setPopup(null), launch('mail'))}>Apri</button>
          </div>
        </div>
      )}

      {/* menu RELAY */}
      {startOpen && loggedIn && (
        <div className="absolute left-1 bottom-12 z-[100] r-plastic p-[3px] w-72 fade-up">
          <div className="flex">
            <div className="w-9 bg-[#1a1b1d] flex items-end justify-center pb-3">
              <span className="font-display text-cream tracking-[0.3em] text-sm [writing-mode:vertical-rl] rotate-180">RELAY OS</span>
            </div>
            <div className="flex-1 bg-[#e8e2d2] text-ink py-1">
              <div className="px-3 py-2 border-b border-ink/15 text-[13px]">Sessione: <b className="font-mono">{p.username}</b></div>
              {ORDER.map((id) => {
                const locked = si < stepIndex(APPS[id].unlock)
                return (
                  <button key={id} onClick={() => launch(id)} className="w-full flex items-center gap-3 px-3 py-2 text-[15px] hover:bg-steel hover:text-cream">
                    <Icon name={locked ? 'lock' : APPS[id].icon} />
                    {APPS[id].title}
                  </button>
                )
              })}
              <div className="border-t border-ink/15 mt-1" />
              <button onClick={standUp} className="w-full flex items-center gap-3 px-3 py-2 text-[15px] hover:bg-steel hover:text-cream">
                <Icon name="power" /> Alzati dalla scrivania
              </button>
            </div>
          </div>
        </div>
      )}

      {/* barra delle applicazioni */}
      <footer className="absolute bottom-0 inset-x-0 h-12 bg-ink border-t-2 border-signal flex items-center gap-1.5 px-2 z-[99]">
        <button disabled={!loggedIn} onClick={() => setStartOpen((o) => !o)} className={`h-9 px-4 flex items-center gap-2 font-display font-black uppercase text-[20px] ${startOpen ? 'bg-signal text-ink' : 'bg-cream text-ink hover:bg-signal'}`}>
          <Icon name="relay" size={18} /> RELAY
        </button>
        <span className="w-px h-7 bg-cream/20 mx-1" />
        <div className="flex-1 flex gap-1 overflow-hidden">
          {wins.map((w) => (
            <button key={w.key} onClick={() => toggleMin(w.key)} className={`h-9 px-3 flex items-center gap-2 font-display font-bold uppercase tracking-wide text-[15px] max-w-[220px] truncate ${active === w.key && !w.min ? 'bg-cream text-ink' : 'text-cream/80 hover:bg-cream/10'}`}>
              <Icon name={w.icon} size={16} />
              <span className="truncate">{w.title}</span>
            </button>
          ))}
        </div>
        {p.flags.lockdown && (
          <span className="h-8 px-3 flex items-center gap-2 bg-signal text-ink font-mono text-[12px] font-semibold">
            <Icon name="alert" size={16} /> LOCKDOWN
          </span>
        )}
        <span className="h-9 px-3 flex items-center gap-3 text-cream">
          {loggedIn && (
            <button aria-label="Posta" className="relative" onClick={() => launch('mail')}>
              <Icon name="mail" size={18} />
              {mailUnread > 0 && <span className="absolute -top-1.5 -right-2 w-2.5 h-2.5 rounded-full bg-[#b4442e]" />}
            </button>
          )}
          <Clock />
        </span>
        <button onClick={standUp} className="h-9 px-3 font-display font-bold uppercase tracking-wide text-[15px] bg-cream text-ink hover:bg-signal">Alzati · Esc</button>
      </footer>
    </div>
  )
}
