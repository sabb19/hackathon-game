import { useEffect, useRef, useState, type ReactNode } from 'react'
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

// Tono della voce di Teo in ogni chiamata
const VOICE_MOOD: Record<CallId, 'calm' | 'tense'> = { handover: 'calm', lockdown: 'tense' }

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
      // voce a sillabe: un suono ogni ~4 lettere, pause sulla punteggiatura
      const chunk = l.text.slice(chars, chars + 2)
      const ahead = l.text.slice(chars, chars + 5).toLowerCase()
      const vowel = ahead.match(/[aeiouàèéìòù]/)?.[0]?.normalize('NFD')[0]
      if (vowel && chars % (VOICE_MOOD[id] === 'calm' ? 6 : 4) === 0) {
        const q = l.text.trimEnd().endsWith('?') && chars > l.text.length - 8
        sfx.syllable(vowel, chars + shown * 3, VOICE_MOOD[id], q)
      }
      const pause = /[.!?…]/.test(chunk) ? 300 : /[,:;]/.test(chunk) ? 150 : VOICE_MOOD[id] === 'calm' ? 42 : 30
      const t = setTimeout(() => setChars((c) => Math.min(l.text.length, c + 2)), pause)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setShown((n) => n + 1)
      setChars(0)
    }, 450)
    return () => clearTimeout(t)
  }, [typing, shown, chars, lines, id])
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
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (typing) return
      if (ended && (e.code === 'Enter' || e.code === 'KeyE')) return close()
      const n = e.code === 'Digit1' ? 0 : e.code === 'Digit2' ? 1 : -1
      const r = !ended && nodes[node].replies[n]
      if (r) reply(r)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')

  return (
    <div data-call className="absolute inset-0 z-40 bg-ink/35" onClick={skip}>
      <style>{`@keyframes voiceBar{from{height:3px}to{height:22px}}`}</style>
      <PhoneShell>
        {/* intestazione della chiamata */}
        <div className="px-4 pt-4 pb-3 bg-ink text-cream">
          <div className="flex items-center justify-between">
            <span className="kicker text-[11px] text-cream/60 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />In chiamata</span>
            <span className="font-mono text-[12px] text-cream/70">{mm}:{ss}</span>
          </div>
          <div className="flex items-end justify-between mt-1">
            <div>
              <div className="font-display font-black uppercase text-[24px] leading-none">Teo Marchi</div>
              <div className="text-[12px] text-cream/60 mt-0.5">Supervisore · {CALL_TITLE[id].toLowerCase()}</div>
            </div>
            <VoiceBars talking={typing && lines[shown]?.who === 'teo'} />
          </div>
        </div>
        {/* trascrizione */}
        <div ref={box} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
          {lines.slice(0, shown + 1).map((l, i) => {
            if (i === shown && !typing) return null
            const text = i < shown ? l.text : l.who === 'teo' ? l.text.slice(0, chars) : l.text
            return (
              <div key={i} className={`max-w-[88%] px-3 py-2 text-[14px] leading-snug rounded-2xl ${l.who === 'tu' ? 'self-end bg-steel text-cream rounded-br-sm' : 'self-start bg-white rounded-bl-sm'}`}>
                {text}
              </div>
            )
          })}
        </div>
        {/* risposte */}
        <div className="p-3 border-t border-black/10 bg-[#dcd5c6] min-h-[64px] flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
          {typing && <button className="text-[12px] font-mono text-ink/50 py-2" onClick={skip}>clic per saltare</button>}
          {!typing && !ended && nodes[node].replies.map((r, i) => (
            <button key={r.label} className="w-full rounded-full bg-ink text-cream text-[14px] py-2 px-3 text-left hover:bg-signal hover:text-ink" onClick={() => reply(r)}>
              <span className="text-cream/50 mr-2 font-mono">{i + 1}</span>{r.label}
            </button>
          ))}
          {!typing && ended && (
            <button className="w-full rounded-full bg-bad text-cream text-[14px] py-2 font-semibold" onClick={close} autoFocus>Riaggancia</button>
          )}
        </div>
      </PhoneShell>
    </div>
  )
}

// Stesso telefono del gioco (Tab), alzato in primo piano durante le chiamate.
function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="absolute right-8 bottom-6 w-[340px] fade-up" onClick={(e) => e.stopPropagation()}>
      <div className="rounded-[34px] bg-[#1c1d20] p-3 pb-5 shadow-[0_30px_80px_rgba(0,0,0,0.7)] border border-black">
        <div className="h-8 flex items-center justify-center"><span className="w-16 h-1.5 rounded-full bg-black/60" /></div>
        <div className="rounded-[22px] bg-[#ece7dc] text-ink overflow-hidden h-[500px] flex flex-col">{children}</div>
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
    <div className="absolute inset-0 z-40 bg-ink/20">
      <PhoneShell>
        <div className="flex-1 bg-ink text-cream flex flex-col items-center justify-center gap-2 phone-buzz">
          <div className="kicker text-[12px] text-cream/60">Chiamata in arrivo</div>
          <div className="font-display font-black uppercase text-[34px] leading-none">Teo Marchi</div>
          <div className="text-[13px] text-cream/60">Supervisore</div>
        </div>
        <div className="bg-ink pb-8 flex justify-center">
          <button className="w-16 h-16 rounded-full bg-ok text-ink font-display font-black uppercase text-[13px] animate-pulse" onClick={answer} autoFocus>Rispondi</button>
        </div>
      </PhoneShell>
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
