import { useEffect, useState } from 'react'
import { useGame } from '../store/game'
import { sfx } from '../audio'
import { lockPointer } from '../world/pointer'

// Minigioco — l'email stampata sulla scrivania di Bruno (capitolo 4).
// Con la penna cerchi le parti sospette. Ogni clic spiega perché è (o non è) un segnale di phishing.
// Ne servono 4 su 4 per capire come sono entrati; i "falsi indizi" (logo, data) insegnano cosa NON prova niente.

type Spot = { id: string; clue: boolean; text: string }
const SPOTS: Record<string, Spot> = {
  from: { id: 'from', clue: true, text: 'Il dominio dopo la @ è "halden-netcare-it.com". Quello vero è "haldennetcare.it". Basta un trattino in più per un indirizzo di qualcun altro.' },
  subject: { id: 'subject', clue: true, text: 'Fretta e paura ("entro 30 minuti", "account bloccato"): servono a non farti pensare. Un IT vero ti dà tempo.' },
  greet: { id: 'greet', clue: true, text: '"Gentile utente": un collega ti chiamerebbe per nome. Le esche partono uguali per migliaia di persone.' },
  link: { id: 'link', clue: true, text: 'Il testo dice "haldennetcare", ma il link porta a "login-verifica.xyz". Conta l\'ultima parte prima della prima /, non l\'inizio.' },
  logo: { id: 'logo', clue: false, text: 'Il logo sembra vero… ma un logo si copia in un secondo da qualsiasi sito. Non prova niente, né in un senso né nell\'altro.' },
  date: { id: 'date', clue: false, text: 'Data e ora sono normali. Qui niente di strano.' },
  sign: { id: 'sign', clue: false, text: 'La firma "Il team IT" è generica, ma anche quella si scrive in un secondo: da sola non decide. Guarda chi la manda davvero.' },
}
const NEED = 4

// parte cliccabile del foglio: cerchiata in rosso se è un indizio trovato, barrata se non lo è
function Hot({ id, marked, onMark, children }: { id: string; marked: string[]; onMark: (id: string) => void; children: React.ReactNode }) {
  const m = marked.includes(id)
  const clue = SPOTS[id].clue
  return (
    <span
      data-spot={id}
      onClick={() => onMark(id)}
      className={`relative cursor-pointer rounded-[40%] px-1 -mx-1 hover:bg-signal/15 ${m && clue ? 'outline outline-[3px] outline-[#c0392b] outline-offset-2' : ''} ${m && !clue ? 'line-through decoration-[#7f98b2] decoration-2' : ''}`}
    >
      {children}
    </span>
  )
}

export default function PhishPrint() {
  const [marked, setMarked] = useState<string[]>([])
  const [last, setLast] = useState<Spot | null>(null)
  const found = marked.filter((m) => SPOTS[m].clue).length
  const done = found >= NEED

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
    const k = (e: KeyboardEvent) => e.key === 'Escape' && !done && close(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  const close = (ok: boolean) => {
    const g = useGame.getState()
    g.setMinigame(null)
    if (ok) {
      g.learn('phishing')
      g.setFlag('readPhish')
      g.goto('m3_mailbox')
    }
    lockPointer()
  }
  const mark = (id: string) => {
    if (done) return
    const s = SPOTS[id]
    setLast(s)
    if (marked.includes(id)) return
    s.clue ? sfx.click() : sfx.denied()
    setMarked((m) => [...m, id])
  }
  return (
    <div className="absolute inset-0 z-[70] bg-ink/85 flex items-center justify-center p-6" onContextMenu={(e) => (e.preventDefault(), !done && close(false))}>
      <div className="flex gap-8 items-start fade-up">
        {/* il foglio stampato */}
        <div className="w-[600px] bg-[#f7f5ef] text-[#1c1f24] p-8 shadow-2xl rotate-[0.8deg] font-sans text-[15px] leading-relaxed relative">
          <div className="flex justify-between items-start border-b border-ink/20 pb-3 mb-4">
            <Hot id="logo" marked={marked} onMark={mark}><span className="font-display font-black text-[26px] tracking-wide">HALDEN NETCARE</span></Hot>
            <Hot id="date" marked={marked} onMark={mark}><span className="font-mono text-[12px] text-ink/60">lun 10/11 · 18:02</span></Hot>
          </div>
          <div className="font-mono text-[13px] space-y-1 mb-4">
            <div>Da: <Hot id="from" marked={marked} onMark={mark}>IT Halden Netcare &lt;supporto@halden-netcare-it.com&gt;</Hot></div>
            <div>A: bruno.rossi@haldennetcare.it</div>
            <div>Oggetto: <Hot id="subject" marked={marked} onMark={mark}><b>URGENTE: account bloccato tra 30 minuti</b></Hot></div>
          </div>
          <p><Hot id="greet" marked={marked} onMark={mark}>Gentile utente,</Hot></p>
          <p className="mt-2">abbiamo rilevato un accesso anomalo al tuo account. Per evitare il blocco definitivo devi confermare la tua password <b>entro 30 minuti</b>.</p>
          <p className="mt-3">
            Conferma qui: <Hot id="link" marked={marked} onMark={mark}><span className="text-[#1f5fbf] underline">http://haldennetcare.login-verifica.xyz/conferma</span></Hot>
          </p>
          <p className="mt-4"><Hot id="sign" marked={marked} onMark={mark}>Il team IT</Hot></p>
          {/* la nota di Bruno compare alla fine: è così che sono entrati */}
          {done && <div className="absolute right-6 bottom-5 font-hand text-[26px] text-[#1d3a63] -rotate-6 fade-up">fatto, password rimessa! — B.</div>}
        </div>
        {/* taccuino delle scoperte */}
        <div className="w-[360px]">
          <div className="flex items-stretch">
            <span className="sign-num text-2xl flex items-center">4</span>
            <span className="bg-cream text-ink font-display font-black uppercase text-xl px-4 py-2 flex-1">L'email di Bruno</span>
          </div>
          <div className="bg-cream text-ink p-5 space-y-3">
            <p className="text-[15px] font-semibold">Cerchia le parti sospette: clicca sul foglio.</p>
            <div className="flex gap-1.5">
              {Array.from({ length: NEED }, (_, i) => <span key={i} className={`h-2 flex-1 ${i < found ? 'bg-[#c0392b]' : 'bg-ink/15'}`} />)}
            </div>
            <p className="text-[13px] text-ink/60">Indizi trovati: {found} su {NEED}</p>
            {last && (
              <p className={`text-[14px] border-l-4 pl-3 ${last.clue ? 'border-[#c0392b]' : 'border-[#7f98b2]'}`}>
                <b>{last.clue ? 'Indizio! ' : 'Non è un indizio. '}</b>
                {last.text}
              </p>
            )}
            {done && (
              <>
                <p className="text-[14px] bg-ink text-cream p-3">
                  Bruno ha cliccato e ha scritto la sua password sulla pagina falsa. Così l'attaccante è entrato con le sue credenziali, come se fosse lui.
                </p>
                <button className="btn btn-signal" autoFocus onClick={() => close(true)}>Avvisa Teo</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
