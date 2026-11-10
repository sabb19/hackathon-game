import { useGame } from '../store/game'
import { STEPS, stepIndex } from '../content/steps'
import { promptFor, type InteractId } from '../world/interact'

// Suggerimenti del tutorial: compaiono uno alla volta, solo finché il comando non è stato usato.
function tutorialHint(flags: Record<string, boolean>): string | null {
  if (!flags.tutLook) return 'Muovi il mouse per guardarti intorno'
  if (!flags.tutMove) return 'W A S D per camminare'
  if (!flags.tutPhone) return 'Tab apre il telefono: lì trovi Teo e cosa fare'
  return null
}

function Key({ k }: { k: string }) {
  return <span className="bg-signal text-ink font-display font-black text-[17px] px-2 flex items-center">{k}</span>
}

// HUD in stile segnaletica: numero del passo + UNA frase corta. Il dettaglio è nel telefono.
export default function Hud() {
  const p = useGame((s) => s.progress)
  const hovered = useGame((s) => s.hovered) as InteractId | null
  const hidden = useGame((s) => s.paused || s.phoneOpen || s.notebookOpen || !!s.cinematic)
  const ins = useGame((s) => s.inspect)
  if (!p || hidden) return null

  if (ins)
    return (
      <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-3 fade-up">
        {ins.action && (
          <span className="flex items-stretch">
            <Key k="CLIC" />
            <span className="bg-cream text-ink font-display font-bold uppercase tracking-wide text-[20px] px-3 py-1.5">{ins.action}</span>
          </span>
        )}
        <span className="flex items-stretch">
          <span className="bg-ink/80 text-cream font-display font-black text-[17px] px-2 flex items-center border border-cream/30">TASTO DESTRO</span>
          <span className="bg-ink/80 text-cream font-display font-bold uppercase tracking-wide text-[20px] px-3 py-1.5">Torna indietro</span>
        </span>
      </div>
    )

  const st = STEPS[p.step]
  const prompt = hovered ? promptFor(hovered) : null
  const tut = tutorialHint(p.flags)

  return (
    <>
      <div className="pointer-events-none absolute top-6 left-6 z-10 fade-up" key={p.step}>
        <div className="kicker text-[13px] mb-1.5">{st.chapter}</div>
        <div className="flex items-stretch">
          <div className="sign-num text-[30px] flex items-center">{String(stepIndex(p.step)).padStart(2, '0')}</div>
          <div className="sign-strip font-display font-bold uppercase tracking-wide text-[22px] leading-none px-3.5 py-2.5 flex items-center">{st.goal}</div>
        </div>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className={`transition-all ${prompt ? 'w-4 h-4 border-2 border-signal rotate-45' : 'w-1.5 h-1.5 bg-cream/80 rounded-full'}`} />
      </div>
      {prompt && (
        <div className="pointer-events-none absolute left-1/2 top-[56%] -translate-x-1/2 z-10 flex items-stretch">
          <Key k="CLIC" />
          <span className="bg-ink/85 text-cream font-display font-bold uppercase tracking-wide text-[18px] px-3 py-1">{prompt}</span>
        </div>
      )}
      {tut && !prompt && (
        <div className="pointer-events-none absolute left-1/2 bottom-24 -translate-x-1/2 z-10 fade-up" key={tut}>
          <div className="bg-cream text-ink font-display font-bold uppercase tracking-wide text-[22px] px-5 py-2.5 shadow-xl">{tut}</div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-5 left-6 z-10 flex gap-4 font-display font-bold uppercase tracking-wider text-[14px] text-cream/50">
        <span>Clic interagisci</span>
        <span>Tab telefono</span>
        <span>Esc pausa</span>
      </div>
    </>
  )
}
