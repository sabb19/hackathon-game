import { useEffect, useState } from 'react'
import { useGame } from '../store/game'
import { CONCEPTS } from '../content/concepts'
import { lockPointer } from '../world/pointer'
import { sfx } from '../audio'

// Prologo — "Il turno": la console di sorveglianza di RELAY prima del lockdown.
// Il lavoro del tecnico si fa, non si racconta: una rete diventa arancione, la diagnostichi col ping, la riavvii, la chiudi.

type Status = 'ok' | 'warn' | 'fixed'
const CLIENTS = [
  { id: 'valle', name: 'Ambulatorio Valle Verde', kind: 'Ambulatorio', dev: 14 },
  { id: 'ferraris', name: 'Studio medico Ferraris', kind: 'Studio medico', dev: 6 },
  { id: 'rodari', name: 'Scuola primaria Rodari', kind: 'Scuola', dev: 38 },
  { id: 'galvani', name: 'Liceo Galvani', kind: 'Scuola', dev: 112 },
  { id: 'farmacia', name: 'Farmacia Centrale', kind: 'Farmacia', dev: 5 },
  { id: 'est', name: 'Poliambulatorio Est', kind: 'Ambulatorio', dev: 41 },
  { id: 'pascoli', name: 'Scuola media Pascoli', kind: 'Scuola', dev: 54 },
  { id: 'faro', name: 'Casa di riposo Il Faro', kind: 'Residenza', dev: 22 },
]
const IP = '10.40.3.30'

type Phase = 'idle' | 'open' | 'ping1' | 'pinged1' | 'reboot' | 'rebooted' | 'ping2' | 'pinged2' | 'done'

export default function Watch() {
  const [warn, setWarn] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [out, setOut] = useState<string[]>([])
  const [clock, setClock] = useState(47)

  useEffect(() => {
    const t = setTimeout(() => {
      setWarn(true)
      sfx.notify()
    }, 2200)
    const c = setInterval(() => setClock((m) => Math.min(59, m + 1)), 20000)
    return () => {
      clearTimeout(t)
      clearInterval(c)
    }
  }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && standUp()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  const standUp = () => {
    useGame.getState().setView('world')
    lockPointer()
  }
  // il ping scrive le risposte una alla volta, come nel terminale vero
  const ping = (ok: boolean, next: Phase) => {
    sfx.click()
    setPhase(next === 'pinged1' ? 'ping1' : 'ping2')
    useGame.getState().learn('ping')
    setOut((o) => [...o, `> ping ${IP}`])
    for (let i = 0; i < 4; i++)
      setTimeout(() => {
        setOut((o) => [...o, ok ? `risposta da ${IP}: ${14 + ((i * 7) % 9)} ms` : 'nessuna risposta (tempo scaduto)'])
        if (i === 3) {
          setOut((o) => [...o, ok ? '4 inviati, 4 ricevuti ✔' : '4 inviati, 0 ricevuti ✘'])
          setPhase(next)
          ok ? sfx.click() : sfx.denied()
        }
      }, 650 * (i + 1))
  }
  const reboot = () => {
    sfx.click()
    setPhase('reboot')
    setOut((o) => [...o, `> riavvio remoto stampante-aula3`, 'spegnimento…'])
    setTimeout(() => setOut((o) => [...o, 'accensione…']), 1400)
    setTimeout(() => {
      setOut((o) => [...o, 'comando completato'])
      setPhase('rebooted')
    }, 2800)
  }
  const resolve = () => {
    sfx.click()
    setPhase('done')
    const g = useGame.getState()
    g.say('teo', 'Visto? Questo è il lavoro: guardi, controlli, sistemi. Ah, prima che mi dimentichi…')
    g.say('teo', "Dalle telecamere vedo le luci dell'archivio ancora accese. Le spegni tu? È accanto all'ufficio di Ada.")
    g.goto('m0_ada')
  }

  const status = (id: string): Status => (id !== 'rodari' || !warn ? 'ok' : phase === 'done' ? 'fixed' : 'warn')
  const C = CONCEPTS.ping

  return (
    <div className="absolute inset-0 z-30 boot overflow-clip r-screen text-cream flex flex-col">
      <header className="h-12 shrink-0 flex items-center gap-4 px-5 bg-[#101318] border-b border-[#2b4a6b]">
        <span className="font-display font-black uppercase text-[20px] tracking-wide">RELAY · Sorveglianza reti</span>
        <span className="text-[13px] text-cream/60">Halden Netcare · turno notturno · tecnico di turno: {useGame.getState().progress?.name}</span>
        <span className="flex-1" />
        <span className="font-mono text-[14px]">20:{clock}</span>
        <button className="btn !py-1 text-[13px]" onClick={standUp}>Alzati · Esc</button>
      </header>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_400px]">
        {/* le reti dei clienti */}
        <section className="p-6 overflow-y-auto">
          <div className="kicker text-[13px] text-cream/60 mb-3">Reti dei clienti · {CLIENTS.length} sorvegliate</div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {CLIENTS.map((c) => {
              const s = status(c.id)
              const clickable = s === 'warn'
              return (
                <button
                  key={c.id}
                  disabled={!clickable}
                  onClick={() => {
                    sfx.click()
                    if (phase === 'idle') setPhase('open')
                  }}
                  className={`text-left p-4 border-2 transition-colors ${s === 'warn' ? 'border-signal bg-signal/15 animate-pulse cursor-pointer' : 'border-[#2b4a6b] bg-[#13202e]'} ${phase !== 'idle' && s === 'warn' ? '!animate-none' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${s === 'warn' ? 'bg-signal' : 'bg-ok'}`} />
                    <span className="text-[12px] uppercase tracking-wide text-cream/60">{c.kind}</span>
                  </div>
                  <div className="font-display font-bold uppercase text-[19px] leading-tight mt-2">{c.name}</div>
                  <div className="text-[13px] text-cream/70 mt-1">{s === 'warn' ? '1 dispositivo non risponde' : `${c.dev} dispositivi · tutto ok`}</div>
                </button>
              )
            })}
          </div>
          <p className="text-[14px] text-cream/60 mt-6 max-w-xl">Verde: tutto funziona. Arancione: qualcosa non va, intervieni. Le reti dei clienti sono collegate a Halden Netcare: da qui le vedi tutte.</p>
        </section>

        {/* pannello d'intervento */}
        <aside className="bg-cream text-ink flex flex-col min-h-0">
          {phase === 'idle' ? (
            <div className="p-5">
              <div className="kicker text-[13px]">Intervento</div>
              <p className="text-[16px] mt-2">{warn ? 'Una rete è diventata arancione. Cliccala.' : 'Nessun allarme. Tieni d\'occhio le reti.'}</p>
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-ink/15">
                <div className="kicker text-[13px]">Scuola primaria Rodari</div>
                <div className="font-display font-black uppercase text-[22px] leading-tight mt-1">Stampante aula 3 non risponde</div>
                <div className="font-mono text-[13px] text-ink/60 mt-1">indirizzo {IP}</div>
              </div>
              {/* spiegazione breve, come nelle altre schede */}
              {(phase === 'open' || phase === 'ping1') && (
                <div className="px-5 pt-4">
                  <div className="font-display font-black uppercase text-[17px]">{C.title}: <span className="normal-case font-sans font-semibold text-[15px]">{C.short}</span></div>
                  <p className="text-[14px] text-ink/80 mt-1">{C.body[0]}</p>
                  <p className="text-[14px] italic text-ink/70 border-l-4 border-signal pl-3 mt-2">{C.analogy}</p>
                </div>
              )}
              <div className="mx-5 mt-4 bg-[#0f1822] text-[#cfe0f0] font-mono text-[13px] p-3 flex-1 min-h-[120px] overflow-y-auto">
                {out.length === 0 ? <span className="text-cream/40">terminale pronto</span> : out.map((l, i) => <div key={i} className={l.includes('✘') ? 'text-bad' : l.includes('✔') ? 'text-ok' : ''}>{l}</div>)}
              </div>
              <div className="p-5 space-y-2">
                <p className="text-[15px] font-semibold">
                  {phase === 'open' && 'Primo controllo: la stampante risponde?'}
                  {phase === 'pinged1' && 'Nessuna risposta: è accesa ma bloccata, oppure spenta. Prova a riavviarla da remoto.'}
                  {phase === 'rebooted' && 'Riavviata. Controlla di nuovo: adesso risponde?'}
                  {phase === 'pinged2' && 'Risponde! Era solo bloccata. Chiudi l\'intervento.'}
                  {phase === 'done' && 'Intervento chiuso. Teo ti ha scritto (Tab per il telefono).'}
                </p>
                {phase === 'open' && <button className="btn btn-signal w-full justify-center" onClick={() => ping(false, 'pinged1')}>Manda un ping</button>}
                {phase === 'pinged1' && <button className="btn btn-signal w-full justify-center" onClick={reboot}>Riavvia da remoto</button>}
                {phase === 'rebooted' && <button className="btn btn-signal w-full justify-center" onClick={() => ping(true, 'pinged2')}>Manda un altro ping</button>}
                {phase === 'pinged2' && <button className="btn btn-signal w-full justify-center" onClick={resolve}>Segna come risolto</button>}
                {phase === 'done' && <button className="btn btn-signal w-full justify-center" onClick={standUp}>Alzati dalla scrivania</button>}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
