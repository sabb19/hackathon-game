import { useState } from 'react'
import { useGame } from '../../store/game'
import { sfx } from '../../audio'
import { stepIndex } from '../../content/steps'

// Capitolo 4 al computer — la posta di Bruno.
// 1) Per ogni email: affidabile o sospetta (con il perché).  2) Cosa fai adesso? (risposta all'incidente)

type Mail = { id: string; from: string; addr: string; subject: string; body: string; link?: string; phish: boolean; why: string }
const MAILS: Mail[] = [
  {
    id: 'teo', from: 'Teo Marchi', addr: 'teo.marchi@haldennetcare.it', subject: 'Turni di dicembre',
    body: 'Ciao Bruno, ti metto in copia i turni di dicembre. Se vuoi scambiare il 24 dimmelo entro venerdì. T.',
    phish: false, why: 'Mittente con il dominio vero (@haldennetcare.it), ti chiama per nome, nessuna fretta, nessun link strano.',
  },
  {
    id: 'it', from: 'IT Halden Netcare', addr: 'supporto@halden-netcare-it.com', subject: 'URGENTE: account bloccato tra 30 minuti',
    body: 'Gentile utente, abbiamo rilevato un accesso anomalo. Conferma la password entro 30 minuti.', link: 'http://haldennetcare.login-verifica.xyz/conferma',
    phish: true, why: "È l'esca che Bruno ha stampato: dominio falso con il trattino, fretta, saluto generico, link verso un altro sito.",
  },
  {
    id: 'pacco', from: 'Consegne Express', addr: 'notifiche@poste-consegne.info', subject: 'Il tuo pacco è in giacenza',
    body: 'Il tuo pacco non è stato consegnato. Paga 1,99 € di spese di giacenza entro oggi o verrà restituito.', link: 'http://consegne-pagamento.top/paga',
    phish: true, why: 'Bruno non aspettava pacchi in ufficio; piccola cifra + scadenza per farti inserire la carta su un sito sconosciuto.',
  },
  {
    id: 'farmacia', from: 'Farmacia Centrale', addr: 'amministrazione@farmaciacentrale.it', subject: 'Fattura ottobre',
    body: 'Buongiorno Bruno, come d\'accordo al telefono le inviamo la fattura di ottobre. Cordiali saluti, Marta.',
    phish: false, why: "È un cliente vero (lo trovi tra le reti sorvegliate), dominio corretto, fa riferimento a una telefonata reale. Attesa e coerente.",
  },
]

const ACTIONS = [
  { id: 'reply', label: 'Rispondo al mittente e chiedo se è vero', ok: false, why: 'Mai rispondere a un\'esca: confermi solo che l\'indirizzo è attivo, e ti risponderà di sì.' },
  { id: 'delete', label: 'Le cancello e basta', ok: false, why: 'Meglio di niente, ma i colleghi riceveranno le stesse email. E Bruno ha già consegnato la password.' },
  { id: 'secure', label: 'Blocco i mittenti, segnalo all\'IT e cambio la password di Bruno', ok: true, why: 'Giusto: chiudi la porta (blocco), avvisi gli altri (segnalazione) e rendi inutile la password rubata (cambio).' },
]

export default function BrunoMail() {
  const p = useGame((s) => s.progress)!
  const [sel, setSel] = useState(MAILS[1].id)
  const [verdict, setVerdict] = useState<Record<string, boolean>>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const [action, setAction] = useState<string | null>(null)
  const solved = stepIndex(p.step) > stepIndex('m3_mailbox')
  const m = MAILS.find((x) => x.id === sel)!
  const allJudged = MAILS.every((x) => verdict[x.id] === x.phish)

  const judge = (phish: boolean) => {
    if (phish === m.phish) {
      sfx.click()
      setVerdict((v) => ({ ...v, [m.id]: phish }))
      setFeedback(`Giusto. ${m.why}`)
    } else {
      sfx.denied()
      setFeedback(phish ? `No: questa è affidabile. ${m.why}` : `Attenzione: questa è un'esca. Guarda il mittente dopo la @ e dove porta il link.`)
    }
  }
  const act = (id: string) => {
    const a = ACTIONS.find((x) => x.id === id)!
    setAction(id)
    if (!a.ok) return sfx.denied()
    sfx.click()
    const g = useGame.getState()
    g.setFlag('brunoSecured')
    g.goto('m3_meeting')
  }

  return (
    <div className="h-full grid grid-cols-[300px_1fr_300px] bg-[#f3efe6] text-ink">
      {/* elenco */}
      <aside className="border-r border-ink/15 overflow-y-auto">
        <div className="px-3 py-2 text-[12px] uppercase tracking-wide text-ink/50 border-b border-ink/10">Posta in arrivo · bruno.rossi</div>
        {MAILS.map((x) => (
          <button key={x.id} onClick={() => (setSel(x.id), setFeedback(null))} className={`w-full text-left px-3 py-2.5 border-b border-ink/10 ${sel === x.id ? 'bg-[#dfe7f0]' : 'hover:bg-ink/5'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold truncate">{x.from}</span>
              {x.id in verdict && <span className={`text-[11px] px-1.5 ${verdict[x.id] ? 'bg-[#c0392b] text-white' : 'bg-[#3d8a5a] text-white'}`}>{verdict[x.id] ? 'SOSPETTA' : 'OK'}</span>}
            </div>
            <div className="text-[13px] truncate text-ink/75">{x.subject}</div>
          </button>
        ))}
      </aside>
      {/* email */}
      <section className="p-5 overflow-y-auto">
        <div className="text-[20px] font-semibold">{m.subject}</div>
        <div className="text-[14px] mt-1">
          <b>{m.from}</b> <span className="font-mono text-[13px] text-ink/70">&lt;{m.addr}&gt;</span>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed">{m.body}</p>
        {m.link && (
          <p className="mt-3 text-[14px]">
            Link: <span className="font-mono text-[#1f5fbf] underline">{m.link}</span>
          </p>
        )}
        {!solved && (
          <div className="mt-6 flex gap-2">
            <button className="px-4 py-2 bg-[#3d8a5a] text-white text-[14px] hover:brightness-110" onClick={() => judge(false)}>Affidabile</button>
            <button className="px-4 py-2 bg-[#c0392b] text-white text-[14px] hover:brightness-110" onClick={() => judge(true)}>Sospetta</button>
          </div>
        )}
        {feedback && <p className="mt-4 text-[14px] border-l-4 border-signal pl-3">{feedback}</p>}
      </section>
      {/* risposta all'incidente */}
      <aside className="bg-cream border-l border-ink/15 p-4 flex flex-col gap-3">
        <div className="kicker text-[13px]">Obiettivo</div>
        <p className="text-[14px] font-semibold">Decidi per ogni email: affidabile o sospetta. Poi chiudi la porta da cui sono entrati.</p>
        <p className="text-[13px] text-ink/60">Valutate: {MAILS.filter((x) => verdict[x.id] === x.phish).length} su {MAILS.length}</p>
        {allJudged && !solved && (
          <div className="space-y-2 fade-up">
            <div className="kicker text-[13px] mt-2">E adesso?</div>
            {ACTIONS.map((a) => (
              <button key={a.id} onClick={() => act(a.id)} className={`w-full text-left text-[14px] px-3 py-2 border ${action === a.id ? (a.ok ? 'border-[#3d8a5a] bg-[#cfe9d6]' : 'border-[#c0392b] bg-[#f5cdc2]') : 'border-ink/20 hover:bg-white'}`}>
                {a.label}
              </button>
            ))}
            {action && <p className="text-[13px]">{ACTIONS.find((a) => a.id === action)!.why}</p>}
          </div>
        )}
        {solved && <p className="text-[14px] bg-ink text-cream p-3">Mittenti bloccati, segnalazione inviata, password di Bruno cambiata. La porta da cui sono entrati è chiusa.</p>}
      </aside>
    </div>
  )
}
