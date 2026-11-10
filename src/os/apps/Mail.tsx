import { useEffect, useMemo, useState } from 'react'
import { channelOf, useGame } from '../../store/game'

interface Mail {
  id: string
  from: string
  subject: string
  body: string
  alert?: boolean
}

export default function Mail() {
  const p = useGame((s) => s.progress)!
  const mails = useMemo<Mail[]>(() => {
    const dyn = p.messages
      .filter((m) => channelOf(m) === 'mail')
      .map((m) => ({
        id: String(m.id),
        from: m.from === 'ada' ? 'A.Ferri (invio programmato)' : 'RELAY · Sistema',
        subject: m.subject ?? (m.from === 'ada' ? '(nessun oggetto)' : 'Avviso di sistema'),
        body: m.text,
        alert: m.from === 'relay',
      }))
    const welcome: Mail = {
      id: 'hr',
      from: 'Risorse Umane',
      subject: `Benvenuto/a in Halden Netcare, ${p.name}!`,
      body: `Ciao ${p.name},\n\nbenvenuto/a nella squadra tecnica di Halden Netcare. Da questa settimana sei al turno di sorveglianza notturno: il tuo compito è tenere d'occhio i sistemi e avvisare il supervisore (Teo Marchi) se qualcosa non va.\n\nIl tuo utente è: ${p.username}\n\nTi ricordiamo che le password NON vanno scritte su fogli o post-it.\n\nBuon lavoro!\nRisorse Umane`,
    }
    return [...dyn.reverse(), welcome]
  }, [p.messages, p.name, p.username])
  const [sel, setSel] = useState(mails[0]?.id)
  useEffect(() => {
    useGame.getState().markSeen('mail')
  }, [mails.length])
  useEffect(() => {
    setSel(mails[0]?.id)
  }, [mails.length])
  const m = mails.find((x) => x.id === sel) ?? mails[0]

  return (
    <div className="h-full grid grid-cols-[260px_1fr] bg-[#e8e2d2] text-ink">
      <ul className="border-r border-ink/15 overflow-y-auto">
        {mails.map((x) => (
          <li key={x.id}>
            <button onClick={() => setSel(x.id)} className={`w-full text-left px-3 py-2.5 border-b border-ink/10 ${m?.id === x.id ? 'bg-steel text-cream' : 'hover:bg-ink/10'}`}>
              <div className={`text-[12px] font-mono ${x.alert && m?.id !== x.id ? 'text-[#b4442e]' : 'opacity-70'}`}>{x.from}</div>
              <div className="text-[14px] font-semibold truncate">{x.subject}</div>
            </button>
          </li>
        ))}
      </ul>
      {m && (
        <article className="p-5 overflow-y-auto bg-[#f4efe3]">
          <div className="font-mono text-[12px] text-ink/60">Da: {m.from}</div>
          <h2 className="text-xl font-semibold mt-1 mb-4">{m.subject}</h2>
          <p className="text-[15px] leading-relaxed whitespace-pre-line">{m.body}</p>
        </article>
      )}
    </div>
  )
}
