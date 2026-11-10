import { useEffect, useState, type ReactNode } from 'react'
import { useGame } from '../store/game'

export function NoteModal() {
  const note = useGame((s) => s.note)
  const close = () => {
    const g = useGame.getState()
    g.showNote(null)
    if (g.screen === 'game' && g.progress?.step === 'end') {
      if (document.pointerLockElement) document.exitPointerLock()
      g.setScreen('demoEnd')
    }
  }
  useEffect(() => {
    if (!note) return
    const k = (e: KeyboardEvent) => {
      if (['Escape', 'e', 'E', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
        close()
      }
    }
    // piccolo ritardo: il tasto E che ha aperto la nota non deve chiuderla subito
    const t = setTimeout(() => window.addEventListener('keydown', k, true), 150)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', k, true)
    }
  }, [note])
  if (!note) return null
  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-ink/60" onClick={close}>
      <div className="fade-up max-w-md w-full mx-4 bg-[#efe6c8] text-ink p-6 shadow-2xl rotate-[-0.6deg]" onClick={(e) => e.stopPropagation()}>
        <div className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-3">{note.title}</div>
        <p className="font-mono whitespace-pre-line leading-relaxed">{note.body}</p>
        <button className="mt-5 font-mono text-xs underline text-ink/70 hover:text-ink" onClick={close}>
          Chiudi [E]
        </button>
      </div>
    </div>
  )
}

export function Toast() {
  const toast = useGame((s) => s.toast)
  if (!toast) return null
  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[90] fade-up flex items-stretch">
      <span className="bg-signal w-2" />
      <span className="bg-ink text-cream font-display font-bold uppercase tracking-wide text-[17px] px-4 py-2">{toast}</span>
    </div>
  )
}

export function Panel({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), onClose())
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [onClose])
  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-ink/80 backdrop-blur-sm">
      <div className={`fade-up w-full mx-4 ${wide ? 'max-w-4xl' : 'max-w-xl'} max-h-[85vh] flex flex-col bg-cream text-ink`}>
        <div className="flex items-center justify-between px-6 py-3 border-b-[3px] border-ink">
          <h2 className="font-display font-black uppercase text-3xl">{title}</h2>
          <button className="font-display font-bold uppercase text-lg hover:text-signal" onClick={onClose}>
            Chiudi ✕
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-6 py-3 border-b border-ink/10">
      <span className="text-ink/85 font-medium">{label}</span>
      {children}
    </label>
  )
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const s = useGame((st) => st.settings)
  const upd = useGame((st) => st.updateSettings)
  const [confirmReset, setConfirmReset] = useState(false)
  return (
    <Panel title="Impostazioni" onClose={onClose}>
      <div className="kicker text-[14px] mb-1">Controlli</div>
      <Row label={`Sensibilità mouse (${s.sensitivity.toFixed(1)})`}>
        <input type="range" min={0.3} max={2.5} step={0.1} value={s.sensitivity} onChange={(e) => upd({ sensitivity: +e.target.value })} className="accent-[#E8823A]" />
      </Row>
      <Row label={`Volume (${Math.round(s.volume * 100)}%)`}>
        <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => upd({ volume: +e.target.value })} className="accent-[#E8823A]" />
      </Row>
      <div className="kicker text-[14px] mt-6 mb-1">Grafica</div>
      <div className="kicker text-[14px] mt-6 mb-1">Accessibilità</div>
      <Row label="Indicatore dell'obiettivo nel mondo">
        <input type="checkbox" checked={s.markers !== false} onChange={(e) => upd({ markers: e.target.checked })} className="accent-[#E8823A] w-4 h-4" />
      </Row>
      <Row label="Testo più grande">
        <input type="checkbox" checked={s.bigText} onChange={(e) => upd({ bigText: e.target.checked })} className="accent-[#E8823A] w-4 h-4" />
      </Row>
      <Row label="Riduci movimento (niente oscillazione della camera)">
        <input type="checkbox" checked={s.reduceMotion} onChange={(e) => upd({ reduceMotion: e.target.checked })} className="accent-[#E8823A] w-4 h-4" />
      </Row>
      <div className="kicker text-[14px] mt-6 mb-2">Dati</div>
      {confirmReset ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink/70">Cancellare salvataggio e archivio?</span>
          <button className="btn btn-signal" onClick={() => { useGame.getState().resetAll(); useGame.getState().setScreen('title'); setConfirmReset(false) }}>Sì, cancella</button>
          <button className="btn" onClick={() => setConfirmReset(false)}>No</button>
        </div>
      ) : (
        <button className="btn" onClick={() => setConfirmReset(true)}>Reset progressi</button>
      )}
    </Panel>
  )
}

