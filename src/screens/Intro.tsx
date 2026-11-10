import { useEffect, useState } from 'react'
import { makeUsername, useGame } from '../store/game'
import { lockPointer } from '../world/pointer'
import { introLines } from '../content/intro'

// 1) badge: il giocatore sceglie il nome  2) i messaggi di Teo sul telefono  3) si entra nel piano.
export default function Intro() {
  const [name, setName] = useState('')
  const [phase, setPhase] = useState<'badge' | 'phone'>('badge')
  const [n, setN] = useState(0)
  const lines = introLines(name.trim() || 'collega')
  const done = n >= lines.length

  useEffect(() => {
    if (phase !== 'phone' || done) return
    const t = setTimeout(() => setN((x) => x + 1), n === 0 ? 900 : 2000)
    return () => clearTimeout(t)
  }, [n, done, phase])

  const start = () => {
    const g = useGame.getState()
    g.newGame(name)
    for (const l of lines) g.say('teo', l)
    g.markSeen('phone')
    g.setScreen('game')
    lockPointer()
  }

  if (phase === 'badge')
    return (
      <div className="absolute inset-0 z-30 bg-ink/95 flex items-center justify-center p-6">
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-4xl w-full fade-up">
          <div>
            <p className="kicker text-[14px] text-signal">Halden Netcare · Livello B2</p>
            <h1 className="font-display uppercase text-5xl mt-2 leading-none">Il tuo primo turno di notte</h1>
            <p className="text-[16px] text-cream/80 mt-5 leading-relaxed">
              Halden Netcare gestisce le reti informatiche di ambulatori e scuole della zona. Sei nella squadra tecnica da due settimane.
            </p>
            <p className="text-[16px] text-cream/80 mt-3 leading-relaxed">
              Stanotte, per la prima volta, fai da solo/a il <b className="text-cream">turno di sorveglianza</b>: tenere d'occhio i sistemi e avvisare il supervisore se qualcosa non va. Di solito non succede niente.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) setPhase('phone')
            }}
            className="bg-[#efe9da] text-ink p-6 shadow-2xl rotate-[-1deg] max-w-sm w-full justify-self-center"
          >
            <div className="flex justify-between items-start">
              <div className="font-display tracking-widest text-lg">HALDEN NETCARE</div>
              <div className="w-14 h-14 bg-steel/80 rounded-sm" aria-hidden="true" />
            </div>
            <div className="kicker text-[13px] text-ink/50 mt-4">Badge temporaneo — tecnico</div>
            <label htmlFor="nm" className="block text-[14px] font-semibold mt-4 mb-1">Come ti chiami?</label>
            <input id="nm" autoFocus maxLength={28} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome e cognome" className="w-full border-b-2 border-ink/40 bg-transparent text-xl py-1 outline-none focus:border-signal" />
            <div className="font-mono text-[12px] text-ink/50 mt-2 h-4">{name.trim() && `il tuo utente sarà: ${makeUsername(name)}`}</div>
            <div className="h-6 mt-4 bg-[repeating-linear-gradient(90deg,#1c1f24_0_2px,transparent_2px_5px,#1c1f24_5px_6px,transparent_6px_9px)]" aria-hidden="true" />
            <button disabled={!name.trim()} className="mt-5 w-full bg-ink text-cream py-2.5 font-mono text-[14px] disabled:opacity-40">Stampa il badge →</button>
          </form>
        </div>
      </div>
    )

  return (
    <div className="absolute inset-0 z-30 bg-ink flex items-center justify-center">
      <div className="w-[360px]">
        <div className="font-mono text-[12px] text-cream/50 mb-2 flex justify-between">
          <span>Telefono aziendale · Teo (supervisore)</span>
          <span>23:41</span>
        </div>
        <div className="bg-[#e9e4d8] text-ink rounded-3xl p-4 min-h-[380px] flex flex-col gap-2">
          {lines.slice(0, n).map((l, i) => (
            <div key={i} className="fade-up self-start max-w-[85%] bg-white text-[14px] px-3 py-2 rounded-2xl rounded-bl-sm">{l}</div>
          ))}
          {!done && <div className="self-start text-ink/50 text-[13px] px-2">Teo sta scrivendo…</div>}
        </div>
        <div className="mt-6 flex justify-between items-center">
          <button className="font-mono text-[13px] text-cream/50 hover:text-cream" onClick={() => setN(lines.length)} disabled={done}>{done ? '' : 'Salta'}</button>
          {done && <button className="btn btn-signal fade-up" onClick={start}>Inizia il turno →</button>}
        </div>
      </div>
    </div>
  )
}
