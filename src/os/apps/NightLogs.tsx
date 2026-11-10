import { useState } from 'react'
import { useGame } from '../../store/game'
import { sfx } from '../../audio'
import { CONCEPTS } from '../../content/concepts'
import { stepIndex } from '../../content/steps'

// Capitolo 5 al computer — la linea del tempo dei log (ispirato a Her Story).
// Righe di più sistemi, filtri per sorgente, tre domande: si risponde cliccando la riga che lo dimostra.

type Src = 'PROXY' | 'VPN' | 'SECURITY-01' | 'RETE' | 'SANDBOX-7'
type Line = { id: string; t: string; src: Src; text: string }
const LINES: Line[] = [
  { id: 'l1', t: 'lun 18:09', src: 'PROXY', text: 'bruno.rossi apre http://haldennetcare.login-verifica.xyz/conferma e invia un modulo (password)' },
  { id: 'l2', t: '23:02', src: 'SECURITY-01', text: 'controllo notturno: porte, badge, telecamere: tutto regolare' },
  { id: 'l3', t: '23:31', src: 'VPN', text: 'accesso riuscito: utente bruno.rossi da 185.220.101.47 (rete estera)' },
  { id: 'l4', t: '23:31', src: 'SECURITY-01', text: 'badge bruno.rossi: nessun ingresso registrato oggi' },
  { id: 'l5', t: '23:36', src: 'RETE', text: 'bruno.rossi interroga tutti gli indirizzi 192.168.2.1 → 192.168.2.254 (scansione)' },
  { id: 'l6', t: '23:39', src: 'SANDBOX-7', text: 'richiesta della cartella "backup_clienti" (dati di ambulatori e scuole) da bruno.rossi' },
  { id: 'l7', t: '23:39', src: 'SANDBOX-7', text: 'ESCA TOCCATA · regola A.F.: avviso a SECURITY-01 → quarantena del piano alla prossima porta aperta' },
  { id: 'l8', t: '23:46', src: 'SECURITY-01', text: 'badge del tecnico di turno alla porta SCALE: rifiutato (quarantena attiva)' },
  { id: 'l9', t: '23:46', src: 'SECURITY-01', text: 'LOCKDOWN avviato · origine: SANDBOX-7 · VPN di bruno.rossi chiusa' },
]
const SRC_COLOR: Record<Src, string> = { PROXY: '#7a3a8a', VPN: '#2f6db5', 'SECURITY-01': '#3d8a5a', RETE: '#8a6a2a', 'SANDBOX-7': '#c8641e' }

const QUESTIONS = [
  { q: "Da dove è entrato chi ha usato le credenziali di Bruno?", ok: ['l3'], why: "Dalla VPN, da un indirizzo estero (185.220…). E alla stessa ora il badge di Bruno non risulta: non era qui. Qualcuno ha usato la password rubata con l'email di lunedì." },
  { q: 'Che cosa cercava?', ok: ['l6'], why: 'La cartella "backup_clienti": i dati di ambulatori e scuole. Prima ha scansionato la rete per trovare dove fossero.' },
  { q: 'Chi ha fatto scattare il lockdown?', ok: ['l7', 'l9'], why: "SANDBOX-7, con una regola scritta da Ada: chi tocca quella cartella è un intruso. Il lockdown ha chiuso il piano e la VPN dell'attaccante." },
]

export default function NightLogs() {
  const p = useGame((s) => s.progress)!
  const [filter, setFilter] = useState<Src | 'tutte'>('tutte')
  const [qi, setQi] = useState(0)
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null)
  const [answered, setAnswered] = useState<string[]>([])
  const solved = stepIndex(p.step) > stepIndex('m4_logs') || qi >= QUESTIONS.length
  const rows = LINES.filter((l) => filter === 'tutte' || l.src === filter)

  const choose = (l: Line) => {
    if (solved) return
    const Q = QUESTIONS[qi]
    if (Q.ok.includes(l.id)) {
      sfx.click()
      setAnswered((a) => [...a, l.id])
      setFb({ ok: true, text: Q.why })
      const n = qi + 1
      setQi(n)
      if (n >= QUESTIONS.length) {
        const g = useGame.getState()
        g.learn('honeypot')
        g.say('teo', "SANDBOX-7 non era un guasto e Ada non c'entra con l'attacco: era la sua esca. Un honeypot. Chi l'ha toccata si è tradito.")
        g.say('teo', 'Il lockdown non ci ha chiusi dentro per sbaglio: ha chiuso fuori loro. E ha tenuto dentro chi doveva capire cosa era successo. Cioè tu.')
        setTimeout(() => {
          const s = useGame.getState()
          s.goto('end')
          s.setView('world')
          if (document.pointerLockElement) document.exitPointerLock()
          setTimeout(() => useGame.getState().setScreen('demoEnd'), 6000)
        }, 9000)
      }
    } else {
      sfx.denied()
      setFb({ ok: false, text: `Questa riga dice: "${l.text}". Non risponde alla domanda: prova a filtrare per sorgente.` })
    }
  }

  return (
    <div className="h-full grid grid-cols-[1fr_320px] bg-[#0f1822] text-[#cfe0f0]">
      <section className="flex flex-col min-h-0">
        <div className="flex flex-wrap gap-1.5 p-3 border-b border-[#2b4a6b]">
          {(['tutte', 'PROXY', 'VPN', 'SECURITY-01', 'RETE', 'SANDBOX-7'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 font-mono text-[12px] border ${filter === f ? 'bg-cream text-ink border-cream' : 'border-[#2b4a6b] hover:border-cream/60'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-[13px]">
          {rows.map((l) => (
            <button key={l.id} onClick={() => choose(l)} className={`w-full text-left grid grid-cols-[86px_110px_1fr] gap-2 px-3 py-2 border-b border-[#1d3046] hover:bg-[#1a2a3c] ${answered.includes(l.id) ? 'bg-[#1d3a2a]' : ''}`}>
              <span className="text-[#7f98b2]">{l.t}</span>
              <span className="font-semibold" style={{ color: SRC_COLOR[l.src] === '#2f6db5' ? '#7fb0e6' : SRC_COLOR[l.src] }}>{l.src}</span>
              <span>{l.text}</span>
            </button>
          ))}
        </div>
      </section>
      <aside className="bg-cream text-ink p-4 flex flex-col gap-3 overflow-y-auto">
        <div className="kicker text-[13px]">Domanda {Math.min(qi + 1, QUESTIONS.length)} di {QUESTIONS.length}</div>
        {!solved ? <p className="text-[16px] font-semibold leading-snug">{QUESTIONS[qi].q}</p> : <p className="text-[16px] font-semibold">Ricostruzione completa.</p>}
        <p className="text-[13px] text-ink/60">Clicca la riga che lo dimostra.</p>
        {fb && <p className={`text-[14px] border-l-4 pl-3 ${fb.ok ? 'border-[#3d8a5a]' : 'border-[#c0392b]'}`}>{fb.text}</p>}
        {solved && (
          <div className="mt-2 border-t border-ink/15 pt-3">
            <div className="font-display font-black uppercase text-xl">{CONCEPTS.honeypot.title}</div>
            <p className="text-[14px] mt-1">{CONCEPTS.honeypot.short}</p>
            <p className="text-[14px] italic text-ink/70 border-l-4 border-signal pl-3 mt-2">{CONCEPTS.honeypot.analogy}</p>
          </div>
        )}
      </aside>
    </div>
  )
}
