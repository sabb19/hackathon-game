import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../../store/game'
import { Icon } from '../icons'

// Minigioco "La macchina che indovina": tre round guidati.
// 1) la vecchia password cade subito  2) un simbolo in più non basta  3) quattro parole resistono.

const GUESSES_PER_SEC = 1e10
const KNOWN = ['halden', 'password', 'relay', 'admin', 'qwerty', 'ciao', 'teo', 'ada', 'netcare', 'amore', 'calcio']
const unleet = (s: string) => s.toLowerCase().replace(/@/g, 'a').replace(/3/g, 'e').replace(/0/g, 'o').replace(/[1!]/g, 'i').replace(/\$/g, 's')

export function analyze(pw: string) {
  let charset = 0
  if (/[a-z]/.test(pw)) charset += 26
  if (/[A-Z]/.test(pw)) charset += 26
  if (/\d/.test(pw)) charset += 10
  if (/[^a-zA-Z0-9]/.test(pw)) charset += 33
  const lg = Math.log2(Math.max(charset, 1))
  let bits = pw.length * lg
  const u = unleet(pw)
  const found = KNOWN.filter((w) => (w.length >= 5 ? u.includes(w) : new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(u)))
  for (const w of found) bits -= w.length * lg - 8
  const years = pw.match(/(19|20)\d\d/g) ?? []
  bits -= years.length * (4 * lg - 7)
  if (/(.)\1\1/.test(pw) || /1234|abcd|qwer/i.test(pw)) bits -= 12
  bits = Math.max(0, bits)
  return { bits, seconds: Math.pow(2, bits) / GUESSES_PER_SEC / 2, found, years }
}

export function human(sec: number) {
  if (sec < 1) return 'meno di un secondo'
  const u: [number, string, string][] = [[60, 'secondo', 'secondi'], [60, 'minuto', 'minuti'], [24, 'ora', 'ore'], [365, 'giorno', 'giorni'], [100, 'anno', 'anni']]
  let v = sec
  for (const [div, s, pl] of u) {
    if (v < div) return `${Math.round(v)} ${Math.round(v) === 1 ? s : pl}`
    v /= div
  }
  if (v < 1e4) return `${Math.round(v)} secoli`
  return "più dell'età dell'universo"
}

const WORDS = ['lampada', 'pioggia', 'serranda', 'ficus', 'tazza', 'cemento', 'luna', 'scrivania', 'ombrello', 'vetrata', 'badge', 'caffè']
const STRONG_BITS = 64
const RCHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*'

function Machine({ run, result }: { run: boolean; result: { cracked: boolean; time: string } | null }) {
  const [guess, setGuess] = useState('')
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!run) return
    let n = 0
    const t = setInterval(() => {
      n += 1
      setCount(n * 213_000_000)
      setGuess(Array.from({ length: 10 }, () => RCHARS[Math.floor(Math.random() * RCHARS.length)]).join(''))
    }, 50)
    return () => clearInterval(t)
  }, [run])
  return (
    <div className="bg-[#0d1218] border-2 border-[#3a3326] p-4 font-mono">
      <div className="flex items-center justify-between text-[12px] text-cream/60">
        <span>MACCHINA CHE INDOVINA · 10 miliardi di tentativi al secondo</span>
        <span className={run ? 'text-signal cursor-blink' : ''}>{run ? '● IN CORSO' : '○ ferma'}</span>
      </div>
      <div className="mt-3 h-12 flex items-center text-2xl r-phosphor tracking-widest">
        {run ? guess : result ? (result.cracked ? 'PASSWORD TROVATA' : 'MI ARRENDO') : '— — — — —'}
      </div>
      <div className="text-[13px] text-cream/70">
        {run && <>Tentativi: {count.toLocaleString('it-IT')}</>}
        {!run && result && (
          <span className={result.cracked ? 'text-[#ff8f73]' : 'text-ok'}>
            {result.cracked ? `Indovinata in ${result.time}.` : `Per indovinarla servirebbero ${result.time}.`}
          </span>
        )}
        {!run && !result && 'In attesa di una password da mettere alla prova.'}
      </div>
    </div>
  )
}

const ROUNDS = [
  { title: 'La vecchia password', task: 'Scrivi la password del post-it (Halden2019) e premi "Metti alla prova".' },
  { title: 'Un trucco "furbo"', task: 'Rendila più strana, come fanno in molti: aggiungi un simbolo o cambia qualche lettera (per esempio H@lden2019!).' },
  { title: 'La frase segreta', task: 'Ora costruisci una password con 4 parole: clicca quelle qui sotto (sono cose che hai visto nella stanza).' },
]

export default function PasswordForge() {
  const [round, setRound] = useState(0)
  const [pw, setPw] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ cracked: boolean; time: string } | null>(null)
  const [err, setErr] = useState('')
  const words = useMemo(() => pw.split('-').filter(Boolean), [pw])
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [round])

  const test = () => {
    setErr('')
    if (round === 0 && pw !== 'Halden2019') return setErr('Per questo round serve proprio la vecchia password: Halden2019')
    if (round === 1 && (pw === 'Halden2019' || !pw)) return setErr("Modificala un po' rispetto a quella vecchia.")
    if (round === 2 && words.length < 4) return setErr(`Servono almeno 4 parole: per ora ne hai ${words.length}.`)
    const res = analyze(pw)
    const cracked = res.bits < STRONG_BITS || res.found.length > 0
    setResult(null)
    setRunning(true)
    setTimeout(() => {
      setRunning(false)
      setResult({ cracked, time: human(res.seconds) })
    }, cracked ? 1300 : 2600)
  }

  const next = () => {
    setRound((r) => r + 1)
    setPw('')
    setResult(null)
  }
  const finish = () => {
    const g = useGame.getState()
    g.learn('password')
    g.setFlag('newPassword')
    g.showToast('Password impostata. E stavolta niente post-it.')
    g.goto('m1_lab')
  }

  const explain = () => {
    if (!result) return null
    if (round === 0) return "Il nome dell'azienda + un anno: sono proprio le prime cose che un programma prova. Chiunque l'avrebbe trovata in un attimo."
    if (round === 1)
      return result.cracked
        ? 'Cambiare "a" in "@" o aggiungere "!" alla fine sono trucchi così comuni che i programmi li provano da soli. La password è diventata più difficile da ricordare, ma non più sicura.'
        : "Questa regge, ma è difficile da ricordare. C'è un modo più semplice: lo vedi nel prossimo round."
    return result.cracked
      ? "Qualcosa non va: controlla di non usare nomi legati a te o all'azienda."
      : 'Quattro parole messe in fila: lunga, facile da ricordare, impossibile da indovinare in tempi utili. È la LUNGHEZZA che conta, non i simboli strani.'
  }
  const canAdvance = !!result && !running && (round < 2 || !result.cracked)

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 pb-16 z-10">
      <div className="r-plastic p-[3px] w-full max-w-4xl fade-up">
        <div className="h-9 bg-signal text-ink px-3 flex items-center gap-2 font-display font-black text-[18px] uppercase tracking-wide">
          <Icon name="alert" size={18} /> Credenziale compromessa — scegli una nuova password
        </div>
        <div className="bg-[#e8e2d2] text-ink grid md:grid-cols-[240px_1fr]">
          <ol className="border-r border-ink/15 p-4 space-y-3">
            <li className="text-[14px] text-ink/75 mb-3 leading-snug">La tua password era scritta su un post-it: chiunque passasse di qui poteva usarla. Prima di sceglierne una nuova, scopri cosa rende forte una password.</li>
            {ROUNDS.map((r, i) => (
              <li key={i} className={`flex gap-2 items-center text-[14px] ${i === round ? 'font-semibold' : 'text-ink/50'}`}>
                <span className={`w-6 h-6 shrink-0 flex items-center justify-center text-[12px] font-mono ${i < round ? 'bg-ok' : i === round ? 'bg-signal' : 'r-sunken'}`}>
                  {i < round ? <Icon name="check" size={14} /> : i + 1}
                </span>
                {r.title}
              </li>
            ))}
          </ol>

          <div className="p-5">
            <div className="kicker text-[14px] text-[#9c3320]">Round {round + 1} di 3</div>
            <p className="text-[17px] font-medium mt-1 mb-4 leading-snug">{ROUNDS[round].task}</p>

            {round === 2 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {WORDS.map((w) => (
                  <button key={w} disabled={words.includes(w) || running} onClick={() => setPw(words.length ? `${pw}-${w}` : w)} className="r-bevel px-3 py-1.5 text-[14px] disabled:opacity-40">
                    {w}
                  </button>
                ))}
                <button onClick={() => setPw(words.slice(0, -1).join('-'))} disabled={!words.length || running} className="px-3 py-1.5 text-[13px] underline disabled:opacity-30">
                  togli l'ultima
                </button>
              </div>
            )}

            <label htmlFor="np" className="block text-[13px] font-semibold mb-1">Password da mettere alla prova</label>
            <div className="flex gap-2">
              <input id="np" ref={inputRef} autoComplete="off" value={pw} disabled={running} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && test()} className="flex-1 r-sunken bg-[#f4efe3] px-3 py-2 font-mono text-[16px] outline-none focus:ring-2 focus:ring-signal" />
              <button onClick={test} disabled={running || !pw} className="r-bevel px-4 font-mono text-[14px] disabled:opacity-40">Metti alla prova</button>
            </div>
            {err && <p role="alert" className="text-[13px] text-[#9c3320] mt-2">{err}</p>}
            {round === 2 && <p className="text-[13px] text-ink/60 mt-1">Lunghezza: {pw.length} caratteri · {words.length} parole</p>}

            <div className="mt-4">
              <Machine run={running} result={result} />
            </div>

            {result && !running && (
              <div className="mt-4 flex gap-4 items-start fade-up">
                <p className="flex-1 text-[15px] leading-relaxed bg-[#f4efe3] border-l-4 border-signal p-3">{explain()}</p>
                {canAdvance &&
                  (round < 2 ? (
                    <button onClick={next} className="r-bevel px-4 py-2 font-mono text-[14px]">Round successivo →</button>
                  ) : (
                    <button onClick={finish} className="bg-ok text-ink px-4 py-2 font-mono text-[14px] font-semibold">Imposta questa password</button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
