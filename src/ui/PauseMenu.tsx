import { useState } from 'react'
import { useGame } from '../store/game'
import { STEPS } from '../content/steps'
import { SettingsPanel } from './Overlays'
import { lockPointer } from '../world/pointer'

export default function PauseMenu() {
  const p = useGame((s) => s.progress)
  const [sub, setSub] = useState<null | 'settings'>(null)
  if (!p) return null
  const resume = () => {
    useGame.getState().setPaused(false)
    lockPointer()
  }
  return (
    <div className="absolute inset-0 z-[60] bg-ink/75 backdrop-blur-sm flex items-center">
      <div className="ml-16 w-96 fade-up">
        <div className="font-display uppercase text-5xl mb-1">Pausa</div>
        <div className="font-mono text-xs text-cream/40 mb-8">Progressi salvati automaticamente</div>
        <div className="border-l-2 border-signal pl-4 mb-8">
          <div className="kicker text-[13px] text-signal">{STEPS[p.step].chapter}</div>
          <div className="text-sm text-cream/80 mt-1">{STEPS[p.step].objective}</div>
        </div>
        <nav className="flex flex-col gap-1">
          <button className="menu-item text-cream" onClick={resume}>Riprendi</button>
          <button className="menu-item" disabled={!p.flags.notebook} onClick={() => useGame.getState().setNotebook(true)}>Taccuino di Ada {p.flags.notebook ? '' : '(non ancora trovato)'}</button>
          <button className="menu-item" onClick={() => setSub('settings')}>Impostazioni</button>
          <button className="menu-item" onClick={() => useGame.getState().setScreen('title')}>Torna al titolo</button>
        </nav>
        <p className="font-mono text-[11px] text-cream/40 mt-8">Tab telefono · Clic interagisci · Tasto destro torna indietro</p>
      </div>
      {sub === 'settings' && <SettingsPanel onClose={() => setSub(null)} />}
    </div>
  )
}
