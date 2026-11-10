import { useEffect } from 'react'
import { useGame } from '../store/game'
import { lockPointer } from '../world/pointer'

// Tasti validi ovunque durante il gioco: [T] telefono, [N] taccuino, [Esc] chiude prima questi.
export function useGlobalKeys() {
  // aiuto automatico: se il passo non cambia per 90 secondi di gioco, Teo suggerisce
  useEffect(() => {
    let last = useGame.getState().progress?.step
    let idle = 0
    const t = setInterval(() => {
      const g = useGame.getState()
      if (g.screen !== 'game' || g.paused || g.cinematic) return
      if (g.progress?.step !== last) {
        last = g.progress?.step
        idle = 0
        return
      }
      idle += 5
      if (idle >= 90) {
        idle = 0
        g.autoHint()
      }
    }, 5000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const g = useGame.getState()
      if (g.screen !== 'game' || g.paused || g.note) return
      const typing = (e.target as HTMLElement)?.closest?.('input, textarea')
      if (typing && e.key !== 'Escape') return
      const relock = () => g.view === 'world' && setTimeout(lockPointer, 0)
      if (e.code === 'Tab' || e.code === 'KeyT') {
        e.preventDefault()
        g.setPhone(!g.phoneOpen)
        if (g.phoneOpen) relock()
        else if (document.pointerLockElement) document.exitPointerLock()
      } else if (e.key === 'Escape' && (g.phoneOpen || g.notebookOpen)) {
        e.stopImmediatePropagation()
        g.setPhone(false)
        g.setNotebook(false)
        relock()
      }
    }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [])
}
