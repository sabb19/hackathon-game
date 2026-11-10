import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store/game'
import { CALLS, CALL_TITLE, type CallId } from '../content/calls'
import { sfx } from '../audio'
import { lockPointer } from '../world/pointer'

// Chiamata di Teo: niente video, solo la sua voce (barre) e la trascrizione, con risposte a scelta.

// Barre della voce: si muovono quando Teo parla.
function VoiceBars({ talking }: { talking: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-8" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className="w-[4px] bg-signal"
          style={{ height: talking ? undefined : 4, animation: talking ? `voiceBar ${0.38 + (i % 5) * 0.07}s ease-in-out ${i * 0.04}s infinite alternate` : 'none' }}
        />
      ))}
    </div>
  )
}

type Line = { who: 'teo' | 'tu'; text: string }

function Call({ id, name }: { id: CallId; name: string }) {
  const nodes = useRef(CALLS[id](name)).current
  const [lines, setLines] = useState<Line[]>([{ who: 'teo', text: nodes[0].text }])
  const [node, setNode] = useState(0) // a quale battuta stiamo rispondendo
  const [shown, setShown] = useState(0) // righe complete
  const [chars, setChars] = useState(0) // caratteri della riga in scrittura
  const [secs, setSecs] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const typing = shown < lines.length

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  // scrittura progressiva delle battute di Teo
  useEffect(() => {
    if (!typing) return
    const l = lines[shown]
    if (l.who === 'tu') {
      const t = setTimeout(() => setShown((n) => n + 1), 250)
      return () => clearTimeout(t)
    }
    if (chars < l.text.length) {
      const t = setTimeout(() => setChars((c) => Math.min(l.text.length, c + 2)), 28)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setShown((n) => n + 1)
      setChars(0)
    }, 450)
    return () => clearTimeout(t)
  }, [typing, shown, chars, lines])
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight })
  }, [shown, chars])

  const reply = (r: { label: string; answer: string }) => {
    sfx.click()
    const next = node + 1
    const add: Line[] = [{ who: 'tu', text: r.label }, { who: 'teo', text: r.answer }]
    if (next < nodes.length) add.push({ who: 'teo', text: nodes[next].text })
    setLines((ls) => [...ls, ...add])
    setNode(next)
  }
  const skip = () => {
    if (!typing) return
    setShown(lines.length)
    setChars(0)
  }
  const close = () => {
    const g = useGame.getState()
    for (const l of lines) g.log(l.who, l.text)
    sfx.click()
    g.setCall(null)
    if (id === 'handover') g.setTimeSkip(performance.now())
    lockPointer()
  }
  const ended = node >= nodes.length
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')

  return (
    <div data-call className="absolute inset-0 z-40 bg-ink/70 flex items-center justify-center p-6" onClick={skip}>
      <style>{`@keyframes voiceBar{from{height:4px}to{height:30px}}`}</style>
      <div className="w-full max-w-2xl bg-cream text-ink fade-up shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-ink text-cream flex items-center gap-4 px-5 py-4">
          <div className="flex-1">
            <div className="kicker text-[12px] text-cream/60 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-ok animate-pulse" />Chiamata in corso · {mm}:{ss}</div>
            <div className="font-display font-black uppercase text-[26px] leading-none mt-1">Teo Marchi</div>
            <div className="text-[13px] text-cream/60">Supervisore · da casa</div>
          </div>
          <VoiceBars talking={typing && lines[shown]?.who === 'teo'} />
        </div>
        <div className="flex flex-col min-h-[360px] max-h-[70vh]">
          <div className="flex items-stretch border-b-2 border-ink">
            <span className="sign-num text-2xl flex items-center">☎</span>
            <span className="font-display font-black uppercase text-xl px-4 py-2">{CALL_TITLE[id]}</span>
          </div>
          <div ref={box} className="flex-1 overflow-y-auto p-5 space-y-3" onClick={skip}>
            {lines.slice(0, shown + 1).map((l, i) => {
              const text = i < shown ? l.text : l.who === 'teo' ? l.text.slice(0, chars) : l.text
              if (i === shown && !typing) return null
              return l.who === 'teo' ? (
                <p key={i} className="text-[17px] leading-snug max-w-[92%]">{text}</p>
              ) : (
                <p key={i} className="text-[15px] font-semibold text-right ml-auto max-w-[80%] bg-ink text-cream px-3 py-1.5">{text}</p>
              )
            })}
          </div>
          <div className="p-4 border-t border-ink/15 min-h-[76px] flex flex-wrap gap-2 items-center">
            {typing && <span className="font-mono text-[13px] text-ink/50">clic per saltare</span>}
            {!typing && !ended && nodes[node].replies.map((r) => (
              <button key={r.label} className="btn btn-signal" onClick={() => reply(r)}>{r.label}</button>
            ))}
            {!typing && ended && <button className="btn btn-signal" onClick={close} autoFocus>Chiudi la chiamata</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function Ringing({ id }: { id: CallId }) {
  useEffect(() => {
    sfx.ringStart()
    return () => sfx.ringStop()
  }, [])
  const answer = () => {
    sfx.click()
    useGame.getState().setCall({ id, ringing: false })
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'KeyE' || e.code === 'Space') answer()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center pb-16 bg-ink/30">
      <div className="bg-cream text-ink fade-up flex items-stretch shadow-2xl">
        <div className="bg-ink text-cream px-5 flex items-center"><span className="w-3 h-3 rounded-full bg-ok animate-ping" /></div>
        <div className="px-5 py-3">
          <div className="kicker text-[13px] text-ink/60">Chiamata in arrivo</div>
          <div className="font-display font-black uppercase text-2xl leading-none mt-1">Teo Marchi</div>
        </div>
        <button className="btn btn-signal m-3" onClick={answer} autoFocus>Rispondi</button>
      </div>
    </div>
  )
}

export default function VideoCall() {
  const call = useGame((s) => s.call)
  const name = useGame((s) => s.progress?.name ?? 'collega')
  // per cliccare serve il puntatore libero
  useEffect(() => {
    if (call && document.pointerLockElement) document.exitPointerLock()
  }, [call])
  if (!call) return null
  return call.ringing ? <Ringing id={call.id} /> : <Call key={call.id} id={call.id} name={name} />
}

// Salto di tempo dopo il passaggio di consegne: nero, l'orologio avanza, si riparte alle 23:44.
export function TimeSkip() {
  const t0 = useGame((s) => s.timeSkip)
  const [clock, setClock] = useState('20:43')
  useEffect(() => {
    if (!t0) return
    const steps = ['20:43', '21:30', '22:15', '23:02', '23:44']
    let i = 0
    const iv = setInterval(() => setClock(steps[Math.min(steps.length - 1, ++i)]), 520)
    const end = setTimeout(() => {
      const g = useGame.getState()
      g.goto('m0_coffee')
      g.setTimeSkip(null)
    }, 4200)
    return () => {
      clearInterval(iv)
      clearTimeout(end)
    }
  }, [t0])
  if (!t0) return null
  return (
    <div className="absolute inset-0 z-40 bg-ink flex flex-col items-center justify-center pointer-events-none" style={{ animation: 'skipFade 4.2s ease forwards' }}>
      <style>{`@keyframes skipFade{0%{opacity:0}15%{opacity:1}82%{opacity:1}100%{opacity:0}}`}</style>
      <div className="kicker text-[14px] text-cream/60">Tre ore dopo</div>
      <div className="font-display font-black text-[120px] leading-none text-cream tabular-nums mt-2">{clock}</div>
      <div className="text-[15px] text-cream/60 mt-3">Monitor tranquilli. Nessun allarme.</div>
    </div>
  )
}
