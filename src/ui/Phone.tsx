import { useEffect, useRef, useState } from 'react'
import { unreadOf, useGame } from '../store/game'
import { STEPS } from '../content/steps'
import { CONCEPTS, CONCEPT_ORDER } from '../content/concepts'

// Il telefono aziendale: Teo (presente), il taccuino di Ada (passato, fotografato), l'obiettivo. Si apre con Tab.
export default function Phone() {
  const p = useGame((s) => s.progress)
  const open = useGame((s) => s.phoneOpen)
  const atDesk = useGame((s) => s.view === 'desktop')
  const [tab, setTab] = useState<'teo' | 'nb'>('teo')
  const list = useRef<HTMLDivElement>(null)
  const msgs = p?.messages.filter((m) => m.from === 'teo' || m.from === 'tu') ?? []
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight
  }, [msgs.length, open, tab])
  if (!p) return null
  const unread = unreadOf(p, 'phone')
  const st = STEPS[p.step]
  const hints = st.hints
  const lvl = p.hintLevel[p.step] ?? 0
  const pages = CONCEPT_ORDER.filter((c) => p.concepts.includes(c))

  return (
    <div
      className="absolute right-8 z-[75] w-[340px] transition-transform duration-300 ease-out"
      style={{ bottom: atDesk ? 48 : 0, transform: open ? 'translateY(-24px)' : atDesk ? 'translateY(calc(100% + 60px))' : 'translateY(calc(100% - 46px))' }}
    >
      <div className={`rounded-[34px] bg-[#1c1d20] p-3 pb-5 shadow-[0_30px_80px_rgba(0,0,0,0.7)] border border-black ${!open && unread ? 'phone-buzz' : ''}`}>
        <button className="w-full flex items-center justify-between px-4 h-8 font-display font-bold uppercase tracking-wide text-[14px] text-cream/70" onClick={() => useGame.getState().setPhone(!open)}>
          <span>{open ? 'Metti via' : 'Telefono'}</span>
          <span className="flex items-center gap-2">
            {unread > 0 && <span className="bg-signal text-ink rounded-full px-2 font-sans text-[12px]">{unread}</span>}
            <span className="border border-cream/30 px-1.5">TAB</span>
          </span>
        </button>
        <div className="rounded-[22px] bg-[#ece7dc] text-ink overflow-hidden h-[500px] flex flex-col">
          {/* obiettivo in dettaglio, sempre in cima */}
          <div className="px-4 pt-3 pb-3 bg-ink text-cream">
            <div className="kicker text-[12px]">{st.chapter}</div>
            <div className="font-display font-black uppercase text-[20px] leading-tight mt-0.5">{st.goal}</div>
            <p className="text-[13px] text-cream/75 leading-snug mt-1">{st.objective}</p>
          </div>
          {/* schede */}
          <div className="grid grid-cols-2 text-[13px] font-display font-bold uppercase tracking-wide border-b border-ink/10">
            <button onClick={() => setTab('teo')} className={`py-2 ${tab === 'teo' ? 'bg-[#ece7dc] text-ink border-b-2 border-signal' : 'bg-[#dcd5c6] text-ink/60'}`}>Teo {unread > 0 && tab !== 'teo' ? `(${unread})` : ''}</button>
            <button onClick={() => p.flags.notebook && setTab('nb')} disabled={!p.flags.notebook} className={`py-2 ${tab === 'nb' ? 'bg-[#ece7dc] text-ink border-b-2 border-signal' : 'bg-[#dcd5c6] text-ink/60'} disabled:opacity-40`}>
              Taccuino {p.flags.notebook ? '' : '·  da trovare'}
            </button>
          </div>

          {tab === 'teo' ? (
            <>
              <div ref={list} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
                {msgs.map((m) => (
                  <div key={m.id} className={`max-w-[85%] px-3 py-2 text-[13px] leading-snug rounded-2xl ${m.from === 'tu' ? 'self-end bg-steel text-cream rounded-br-sm' : 'self-start bg-white rounded-bl-sm'}`}>
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-black/10 bg-[#dcd5c6]">
                <button disabled={lvl >= hints.length} onClick={() => useGame.getState().nextHint()} className="w-full rounded-full bg-ink text-cream text-[14px] py-2 disabled:opacity-40">
                  {lvl >= hints.length ? 'Teo non ha altri suggerimenti' : 'Chiedi un aiuto a Teo'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-3" style={{ backgroundImage: 'repeating-linear-gradient(transparent 0 25px, rgba(29,58,99,0.1) 25px 26px)' }}>
              <p className="font-hand text-[19px] text-ink/60 mb-2">Foto delle pagine del taccuino di Ada</p>
              {pages.length === 0 && <p className="text-[13px] text-ink/60">Le pagine si aggiungono quando incontri un concetto nuovo.</p>}
              <ul className="space-y-2">
                {pages.map((c) => (
                  <li key={c}>
                    <button onClick={() => useGame.getState().setNotebook(true)} className="w-full text-left bg-white/80 px-3 py-2 shadow-sm">
                      <div className="font-hand text-[22px] leading-none text-[#1d3a63]">{CONCEPTS[c].title}</div>
                      <div className="text-[12px] text-ink/70">{CONCEPTS[c].short}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
