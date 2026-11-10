import { useGame } from '../store/game'
import { CONCEPTS } from '../content/concepts'

export default function DemoEnd() {
  const p = useGame((s) => s.progress)
  if (!p) return null
  return (
    <div className="absolute inset-0 z-40 bg-ink/95 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-16 fade-up">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">Rapporto di fine turno — parziale</p>
        <h1 className="font-display uppercase text-5xl mt-2">Fine della demo</h1>
        <p className="text-cream/70 mt-4 leading-relaxed">
          Hai trovato SANDBOX-7, l'ultima esercitazione di Ada. Ma chi ha fatto scattare la trappola? E perché le credenziali di Bruno sono
          state usate alle 23:31? Il turno continua nella versione completa.
        </p>

        <h2 className="font-display uppercase text-xl mt-10 mb-4">Cosa hai imparato usandolo</h2>
        <ul className="grid md:grid-cols-2 gap-3">
          {p.concepts.map((c) => (
            <li key={c} className="border border-cream/10 p-4">
              <div className="font-display uppercase tracking-wide">{CONCEPTS[c].title}</div>
              <div className="text-sm text-cream/60">{CONCEPTS[c].short}</div>
            </li>
          ))}
        </ul>

        <div className="mt-8 font-mono text-sm text-cream/60">Aiuti chiesti a Teo: {p.hintsUsed}</div>

        <div className="mt-10 border-t border-cream/10 pt-6">
          <p className="text-sm text-cream/60 mb-4">
            Vuoi andare oltre? I corsi gratuiti di Cisco Networking Academy e lo strumento Packet Tracer permettono di costruire reti vere, come quella che hai riparato stanotte.
          </p>
          <button className="btn btn-signal" onClick={() => useGame.getState().setScreen('title')}>Torna al titolo</button>
        </div>
      </div>
    </div>
  )
}
