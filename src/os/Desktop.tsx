import { useEffect, useRef, useState, type ReactNode } from 'react'
import { unreadOf, useGame } from '../store/game'
import { STEPS, stepIndex, type StepId } from '../content/steps'
import type { FsNode } from '../content/files'
import { lockPointer } from '../world/pointer'
import { AppTile, FolderGlyph, Icon, type IconName } from './icons'
import { FS } from '../content/files'
import Login from './apps/Login'
import PasswordForge from './apps/PasswordForge'
import Mail from './apps/Mail'
import Explorer, { FileView } from './apps/Explorer'
import NetLab from './apps/NetLab'
import NetMonitor from './apps/NetMonitor'
import BrunoMail from './apps/BrunoMail'
import NightLogs from './apps/NightLogs'

type File = Extract<FsNode, { type: 'file' }>
type AppId = 'mail' | 'explorer' | 'netlab' | 'monitor' | 'brunomail' | 'nightlogs'

const APPS: Record<AppId, { title: string; icon: IconName; unlock: StepId; lockedWhy: string; w: number; h: number }> = {
  mail: { title: 'Posta', icon: 'mail', unlock: 'm0_login', lockedWhy: '', w: 760, h: 480 },
  explorer: { title: 'Esplora file', icon: 'folder', unlock: 'm0_login', lockedWhy: '', w: 720, h: 460 },
  netlab: { title: 'Laboratorio di rete', icon: 'network', unlock: 'm1_lab', lockedWhy: 'Il Laboratorio di rete si attiva dopo il cambio password di emergenza.', w: 1060, h: 640 },
  nightlogs: { title: 'Log della notte', icon: 'table', unlock: 'm4_logs', lockedWhy: 'Teo non ha ancora condiviso i log della notte.', w: 1120, h: 560 },
  brunomail: { title: 'Posta di Bruno', icon: 'mail', unlock: 'm3_mailbox', lockedWhy: 'La posta di un collega si apre solo se Teo te ne dà accesso.', w: 1080, h: 560 },
  monitor: { title: 'Monitor di rete', icon: 'monitor', unlock: 'm2_monitor', lockedWhy: 'Il Monitor di rete ha bisogno di una connessione con SECURITY-01. Al momento il tuo PC non lo raggiunge.', w: 1000, h: 600 },
}
const ORDER: AppId[] = ['mail', 'explorer', 'netlab', 'monitor', 'brunomail', 'nightlogs']
const APP_COLOR: Record<AppId, string> = { mail: '#2f6db5', explorer: '#b07a2a', netlab: '#c8641e', monitor: '#2f8a5b', brunomail: '#7a3a8a', nightlogs: '#3d5a7a' }
const DESK_FOLDERS = (FS as Extract<typeof FS, { type: 'dir' }>).children.filter((c) => c.type === 'dir').map((c) => c.name)

interface Win {
  key: string
  title: string
  icon: IconName
  w: number
  h: number
  x: number
  y: number
  min: boolean
  max?: boolean
  body: ReactNode
}

function Window({ win, active, z, onFocus, onClose, onMin, onMax, onMove }: { win: Win; active: boolean; z: number; onFocus: () => void; onClose: () => void; onMin: () => void; onMax: () => void; onMove: (x: number, y: number) => void }) {
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  if (win.min) return null
  const box = win.max ? { left: 0, top: 0, width: '100%', height: 'calc(100% - 48px)' } : { left: win.x, top: win.y, width: win.w, height: win.h }
  const btn = 'w-11 h-full flex items-center justify-center text-[15px] leading-none'
  return (
    <section
      role="dialog"
      aria-label={win.title}
      className={`absolute flex flex-col bg-[#f3efe6] boot ${active ? 'ring-1 ring-black/40' : 'ring-1 ring-black/20'}`}
      style={{ ...box, zIndex: 10 + z, boxShadow: active ? '0 22px 60px rgba(0,0,0,0.55)' : '0 8px 24px rgba(0,0,0,0.35)' }}
      onPointerDown={onFocus}
    >
      <header
        className={`h-9 flex items-center gap-2 pl-3 select-none shrink-0 ${active ? 'bg-[#e9e3d6] text-ink' : 'bg-[#d9d3c5] text-ink/55'} ${win.max ? '' : 'cursor-move'}`}
        onDoubleClick={onMax}
        onPointerDown={(e) => {
          if (win.max) return
          drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y }
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => drag.current && onMove(Math.max(-win.w + 120, e.clientX - drag.current.dx), Math.max(0, e.clientY - drag.current.dy))}
        onPointerUp={() => (drag.current = null)}
      >
        <Icon name={win.icon} size={16} />
        <span className="text-[14px] font-semibold flex-1 truncate">{win.title}</span>
        <div className="flex h-full" onPointerDown={(e) => e.stopPropagation()}>
          <button aria-label="Riduci a icona" className={`${btn} hover:bg-black/10`} onClick={onMin}>—</button>
          <button aria-label={win.max ? 'Ripristina' : 'Ingrandisci'} className={`${btn} hover:bg-black/10`} onClick={onMax}>{win.max ? '❐' : '☐'}</button>
          <button aria-label="Chiudi" className={`${btn} hover:bg-[#c42b1c] hover:text-white`} onClick={onClose}>✕</button>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden">{win.body}</div>
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
  return (
    <span className="flex flex-col items-end leading-tight text-[12px]">
      <span>23:{String(Math.min(59, base + m)).padStart(2, '0')}</span>
      <span className="text-cream/60">mar 14/11</span>
    </span>
  )
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
      const W = Math.min(w.w, window.innerWidth - 140)
      const H = Math.min(w.h, window.innerHeight - 48 - 32)
      const x = Math.max(110, Math.round((window.innerWidth - W) / 2) + n * 26 - 40)
      const y = Math.max(12, Math.round((window.innerHeight - 48 - H) / 2) + n * 22 - 30)
      return [...ws, { ...w, w: W, h: H, x: Math.min(x, window.innerWidth - W - 8), y, min: false }]
    })
    focus(w.key)
  }
  const openFile = (f: File) => add({ key: `file:${f.name}`, title: f.name, icon: f.kind === 'table' ? 'table' : 'file', w: f.kind === 'table' ? 820 : 620, h: 460, body: <FileView file={f} /> })
  const launch = (id: AppId) => {
    setStartOpen(false)
    const a = APPS[id]
    if (si < stepIndex(a.unlock)) return setDialog(a.lockedWhy)
    const body = id === 'mail' ? <Mail /> : id === 'explorer' ? <Explorer openFile={openFile} /> : id === 'netlab' ? <NetLab /> : id === 'brunomail' ? <BrunoMail /> : id === 'nightlogs' ? <NightLogs /> : <NetMonitor />
    add({ key: id, title: a.title, icon: a.icon, w: a.w, h: a.h, body })
  }
  // solo sviluppo: aprire le app da console per i controlli visivi
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__os = { launch }
  })
  const openFolder = (name: string) => {
    setStartOpen(false)
    add({ key: `dir:${name}`, title: name, icon: name === 'Cestino' ? 'trash' : 'folder', w: 760, h: 480, body: <Explorer openFile={openFile} startAt={name} /> })
  }
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

  const online = si >= stepIndex('m1_verify')
  const phoneUnread = unreadOf(p, 'phone')

  return (
    <div className="absolute inset-0 z-30 boot overflow-clip text-cream" style={{ background: 'radial-gradient(1100px 620px at 72% 28%, #2b4a6b 0%, #172839 48%, #0c131c 100%)' }}>
      {/* sfondo: marchio aziendale discreto */}
      <div className="absolute right-12 bottom-20 text-right pointer-events-none select-none opacity-30">
        <Icon name="relay" size={54} className="ml-auto" />
        <div className="font-display font-black uppercase text-[46px] leading-none mt-1">Halden Netcare</div>
        <div className="kicker text-[12px] text-cream/70 mt-1">RELAY OS · postazione di sorveglianza B2</div>
      </div>

      {!loggedIn && <Login />}
      {loggedIn && p.step === 'm0_password' && <PasswordForge />}

      {loggedIn && p.step !== 'm0_password' && (
        <>
          {/* icone del desktop: programmi e cartelle */}
          <div className="absolute left-3 top-3 bottom-14 flex flex-col flex-wrap content-start gap-1 z-[5]" onClick={() => setSelIcon(null)}>
            {ORDER.map((id) => {
              const a = APPS[id]
              const locked = si < stepIndex(a.unlock)
              return (
                <button
                  key={id}
                  onClick={(e) => (e.stopPropagation(), setSelIcon(id))}
                  onDoubleClick={() => launch(id)}
                  onKeyDown={(e) => e.key === 'Enter' && launch(id)}
                  className={`w-[92px] flex flex-col items-center gap-1 p-1.5 rounded-sm border ${selIcon === id ? 'bg-[#5b9bd5]/35 border-[#9fc0d8]/60' : 'border-transparent hover:bg-white/10'}`}
                >
                  <span className="relative">
                    <AppTile name={a.icon} color={APP_COLOR[id]} locked={locked} />
                    {id === 'mail' && mailUnread > 0 && <span className="absolute -top-1.5 -right-2 bg-[#c42b1c] text-white text-[11px] min-w-[19px] h-[19px] rounded-full flex items-center justify-center">{mailUnread}</span>}
                  </span>
                  <span className="text-[13px] leading-tight text-center [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">{a.title}</span>
                </button>
              )
            })}
            {DESK_FOLDERS.map((name) => (
              <button
                key={name}
                onClick={(e) => (e.stopPropagation(), setSelIcon(`dir:${name}`))}
                onDoubleClick={() => openFolder(name)}
                onKeyDown={(e) => e.key === 'Enter' && openFolder(name)}
                className={`w-[92px] flex flex-col items-center gap-1 p-1.5 rounded-sm border ${selIcon === `dir:${name}` ? 'bg-[#5b9bd5]/35 border-[#9fc0d8]/60' : 'border-transparent hover:bg-white/10'}`}
              >
                {name === 'Cestino' ? <span className="w-11 h-11 flex items-center justify-center text-[#c9d4df]"><Icon name="trash" size={38} /></span> : <FolderGlyph size={46} />}
                <span className="text-[13px] leading-tight text-center [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">{name}</span>
              </button>
            ))}
          </div>

          {wins.map((w) => (
            <Window
              key={w.key}
              win={w}
              active={active === w.key}
              z={order.indexOf(w.key)}
              onFocus={() => active !== w.key && focus(w.key)}
              onClose={() => close(w.key)}
              onMin={() => setWins((ws) => ws.map((x) => (x.key === w.key ? { ...x, min: true } : x)))}
              onMax={() => setWins((ws) => ws.map((x) => (x.key === w.key ? { ...x, max: !x.max } : x)))}
              onMove={(x, y) => setWins((ws) => ws.map((v) => (v.key === w.key ? { ...v, x, y } : v)))}
            />
          ))}

          {dialog && (
            <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/30" onClick={() => setDialog(null)}>
              <div className="bg-[#f3efe6] text-ink w-[440px] shadow-2xl ring-1 ring-black/30" onClick={(e) => e.stopPropagation()}>
                <div className="h-9 bg-[#e9e3d6] px-3 flex items-center text-[14px] font-semibold">RELAY</div>
                <div className="p-5 flex gap-4">
                  <Icon name="lock" size={32} className="shrink-0 text-[#b4442e]" />
                  <p className="text-[15px] leading-relaxed">{dialog}</p>
                </div>
                <div className="px-5 pb-4 flex justify-end">
                  <button autoFocus className="px-6 py-1.5 bg-[#2f6db5] text-white text-[14px] hover:bg-[#245a97]" onClick={() => setDialog(null)}>OK</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {popup && (
        <div className="absolute right-3 bottom-[56px] z-[95] w-[340px] bg-[#1d232c] text-cream shadow-2xl ring-1 ring-white/10 fade-up">
          <div className="p-3 flex gap-3 items-center">
            <Icon name="mail" className="text-[#9fc0d8]" />
            <span className="text-[14px] flex-1">{popup}</span>
            <button className="px-3 py-1 text-[13px] bg-white/10 hover:bg-white/20" onClick={() => (setPopup(null), launch('mail'))}>Apri</button>
          </div>
        </div>
      )}

      {/* menu Start */}
      {startOpen && loggedIn && (
        <div className="absolute left-2 bottom-[52px] z-[100] w-[340px] bg-[#1d232c] text-cream shadow-2xl ring-1 ring-white/10 fade-up">
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[#2f6db5] flex items-center justify-center font-semibold">{p.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <div className="text-[14px] font-semibold">{p.name}</div>
              <div className="text-[12px] text-cream/60 font-mono">{p.username}</div>
            </div>
          </div>
          <div className="kicker text-[11px] text-cream/50 px-4 pt-3 pb-1">Programmi</div>
          {ORDER.map((id) => {
            const locked = si < stepIndex(APPS[id].unlock)
            return (
              <button key={id} onClick={() => launch(id)} className="w-full flex items-center gap-3 px-4 py-1.5 text-[14px] hover:bg-white/10">
                <AppTile name={APPS[id].icon} color={APP_COLOR[id]} size={28} locked={locked} />
                {APPS[id].title}
              </button>
            )
          })}
          <div className="kicker text-[11px] text-cream/50 px-4 pt-3 pb-1">Cartelle</div>
          {DESK_FOLDERS.map((name) => (
            <button key={name} onClick={() => openFolder(name)} className="w-full flex items-center gap-3 px-4 py-1.5 text-[14px] hover:bg-white/10">
              <FolderGlyph size={28} /> {name}
            </button>
          ))}
          <div className="border-t border-white/10 mt-2" />
          <button onClick={standUp} className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] hover:bg-white/10">
            <Icon name="power" /> Alzati dalla scrivania
          </button>
        </div>
      )}

      {/* barra delle applicazioni */}
      <footer className="absolute bottom-0 inset-x-0 h-12 bg-[#0d1117]/95 border-t border-white/10 flex items-stretch z-[99]">
        <button disabled={!loggedIn} aria-label="Start" onClick={() => setStartOpen((o) => !o)} className={`w-12 flex items-center justify-center ${startOpen ? 'bg-white/15' : 'hover:bg-white/10'} disabled:opacity-40`}>
          <Icon name="relay" size={22} className="text-signal" />
        </button>
        {/* obiettivo: sempre visibile, mai sopra le finestre */}
        <div className="flex items-center gap-2 px-3 border-r border-white/10 max-w-[360px]">
          <span className="w-1 self-stretch my-2 bg-signal" />
          <span className="leading-tight min-w-0">
            <span className="block kicker text-[10px] text-signal">Obiettivo</span>
            <span className="block text-[13px] truncate">{st.goal}</span>
          </span>
        </div>
        <div className="flex-1 flex items-stretch overflow-hidden">
          {wins.map((w) => (
            <button key={w.key} onClick={() => toggleMin(w.key)} className={`relative px-3 flex items-center gap-2 text-[13px] max-w-[200px] ${active === w.key && !w.min ? 'bg-white/15' : 'hover:bg-white/10'}`}>
              <Icon name={w.icon} size={16} />
              <span className="truncate">{w.title}</span>
              <span className={`absolute bottom-0 left-2 right-2 h-[3px] ${active === w.key && !w.min ? 'bg-signal' : 'bg-cream/30'}`} />
            </button>
          ))}
        </div>
        {/* area di notifica */}
        <div className="flex items-center gap-1 px-2">
          {p.flags.lockdown && (
            <span className="h-7 px-2 flex items-center gap-1.5 bg-signal text-ink font-mono text-[11px] font-semibold mr-1">
              <Icon name="alert" size={14} /> LOCKDOWN
            </span>
          )}
          <span title={online ? 'Connesso a SECURITY-01' : 'SECURITY-01 non raggiungibile'} className="h-9 w-9 flex items-center justify-center relative">
            <Icon name="network" size={18} />
            {!online && <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#c42b1c] ring-2 ring-[#0d1117]" />}
          </span>
          {loggedIn && (
            <button aria-label="Posta" className="relative h-9 w-9 flex items-center justify-center hover:bg-white/10" onClick={() => launch('mail')}>
              <Icon name="mail" size={18} />
              {mailUnread > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#c42b1c]" />}
            </button>
          )}
          <button aria-label="Telefono" className="relative h-9 px-2 flex items-center gap-1.5 hover:bg-white/10 text-[12px]" onClick={() => useGame.getState().setPhone(true)}>
            <span>Telefono</span>
            <span className="border border-cream/30 px-1 text-[10px]">TAB</span>
            {phoneUnread > 0 && <span className="absolute top-1 right-0 bg-signal text-ink text-[10px] min-w-[16px] h-[16px] rounded-full flex items-center justify-center">{phoneUnread}</span>}
          </button>
          <span className="px-2"><Clock /></span>
          <button onClick={standUp} className="h-9 px-3 text-[13px] bg-white/10 hover:bg-signal hover:text-ink">Alzati · Esc</button>
        </div>
      </footer>
    </div>
  )
}
