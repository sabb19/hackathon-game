import { useEffect, useState } from 'react'
import { useGame } from '../store/game'
import { sfx } from '../audio'
import { lockPointer } from '../world/pointer'
import { inspectAt } from '../world/interact'

// Minigioco — il lucchetto a codice del cassetto di Ada (capitolo 1).
// Il codice non si indovina a caso: si ricava osservando l'ufficio (la foto del gatto, il suo compleanno).
// Lezione: un codice preso dalla vita personale è prevedibile; basta guardarsi intorno.

const CODE = '0412'
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK']

// Che cosa ti dice il tentativo sbagliato (mai tentativi a caso: ogni errore insegna qualcosa)
function feedback(code: string): string {
  if (code === '1204') return 'Quasi! Le cifre sono quelle giuste, ma in un altro ordine. In Italia la data si scrive giorno, poi mese.'
  if (code === '2015') return "Un anno? Ada era affezionata a un giorno preciso, non a un anno."
  if (code === '1234' || code === '0000' || code === '1111') return 'Il codice più comune al mondo… ma non quello di Ada. Lei era prevedibile in un altro modo.'
  if (/^(19|20)\d\d$/.test(code)) return 'Sembra un anno. Guarda meglio: serve un giorno e un mese.'
  return 'Codice sbagliato. Ada usava qualcosa a cui teneva: guardati intorno nel suo ufficio.'
}

export default function Keypad() {
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'bad' | 'ok'>('idle')
  const [msg, setMsg] = useState('Lucchetto a codice: 4 cifre. Il codice lo sceglieva Ada.')
  const [tries, setTries] = useState(0)

  const close = (ok: boolean) => {
    const g = useGame.getState()
    g.setMinigame(null)
    if (ok) {
      g.setFlag('adaDrawerOpen')
      g.learn('autenticazione')
      inspectAt('adaDesk', 'Prendi il taccuino')
    }
    lockPointer()
  }

  const press = (k: string) => {
    if (state === 'ok') return
    if (k === 'C') {
      sfx.click()
      setCode('')
      setState('idle')
      return
    }
    if (k === 'OK') {
      if (code.length < 4) {
        sfx.denied()
        setMsg('Servono 4 cifre.')
        return
      }
      if (code === CODE) {
        sfx.click()
        sfx.slam(0.1)
        setState('ok')
        setMsg('Clic. Il cassetto si sblocca.')
        return
      }
      sfx.denied()
      setState('bad')
      const n = tries + 1
      setTries(n)
      setMsg(feedback(code))
      if (n === 3) useGame.getState().say('teo', 'Ada aveva un gatto, Pixel. Ne parlava sempre: il suo compleanno era sacro. Giorno e mese, secondo me.')
      setTimeout(() => {
        setCode('')
        setState('idle')
      }, 900)
      return
    }
    if (code.length >= 4) return
    sfx.click()
    setCode((c) => c + k)
  }

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close(false)
      if (/^[0-9]$/.test(e.key)) press(e.key)
      if (e.key === 'Backspace') setCode((c) => c.slice(0, -1))
      if (e.key === 'Enter') press('OK')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const led = state === 'ok' ? '#6FBF8E' : state === 'bad' ? '#D9644A' : '#3a2414'
  return (
    <div className="absolute inset-0 z-[70] bg-ink/85 flex items-center justify-center p-6" onContextMenu={(e) => (e.preventDefault(), close(false))}>
      <div className="flex gap-8 items-center fade-up">
        {/* il lucchetto, in primo piano */}
        <div className="w-[300px] bg-[#2a2e33] p-5 rounded-md shadow-2xl border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] text-cream/50 tracking-widest">SECURLOCK 4</span>
            <span className="w-3 h-3 rounded-full" style={{ background: led, boxShadow: state !== 'idle' ? `0 0 12px ${led}` : 'none' }} />
          </div>
          <div className={`h-16 bg-[#0e1a12] flex items-center justify-center gap-3 font-mono text-[34px] tracking-[0.3em] ${state === 'bad' ? 'text-[#D9644A]' : 'text-[#7fe0a0]'}`}>
            {Array.from({ length: 4 }, (_, i) => <span key={i}>{code[i] ?? '_'}</span>)}
          </div>
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            {KEYS.map((k) => (
              <button
                key={k}
                onClick={() => press(k)}
                className={`h-14 rounded-sm font-display font-black text-[24px] shadow-[0_3px_0_#121417] active:translate-y-[2px] active:shadow-none ${k === 'OK' ? 'bg-[#3d6b4c] text-cream' : k === 'C' ? 'bg-[#6b3a2e] text-cream' : 'bg-[#d8d3c6] text-ink hover:bg-white'}`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        {/* cosa sai, cosa succede */}
        <div className="w-[380px]">
          <div className="flex items-stretch">
            <span className="sign-num text-2xl flex items-center">1</span>
            <span className="bg-cream text-ink font-display font-black uppercase text-xl px-4 py-2 flex-1">Il cassetto di Ada</span>
          </div>
          <div className="bg-cream text-ink p-5 space-y-3">
            <p className="text-[16px] leading-snug">{msg}</p>
            {state === 'ok' ? (
              <>
                <p className="text-[14px] text-ink/75 border-l-4 border-signal pl-3">
                  Ti è bastato guardarti intorno. Un codice preso dalla vita personale (compleanni, nomi, date) è il primo che un estraneo prova: <b>chi ti conosce, o ti osserva, lo indovina</b>.
                </p>
                <button className="btn btn-signal" onClick={() => close(true)} autoFocus>Apri il cassetto</button>
              </>
            ) : (
              <p className="text-[13px] text-ink/60">Puoi usare anche la tastiera. Esc o tasto destro per tornare a guardarti intorno.</p>
            )}
            {tries > 0 && state !== 'ok' && <p className="text-[12px] font-mono text-ink/50">tentativi: {tries}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
