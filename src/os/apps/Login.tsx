import { useState } from 'react'
import { useGame } from '../../store/game'
import { Icon } from '../icons'

export default function Login() {
  const p = useGame((s) => s.progress)!
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (user.trim().toLowerCase() === p.username && pass === 'Halden2019') {
      const g = useGame.getState()
      g.setFlag('loggedIn')
      g.learn('autenticazione')
      g.goto('m0_password')
    } else if (user.trim().toLowerCase() !== p.username) {
      setErr(`Utente sconosciuto. Il tuo utente è scritto sul post-it.`)
    } else {
      setErr('Password errata. Attenzione: maiuscole e minuscole contano.')
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <form onSubmit={submit} className="r-plastic p-[3px] w-[400px] fade-up">
        <div className="h-9 bg-[#1a1b1d] text-cream px-3 flex items-center gap-2 font-display font-black text-[18px] uppercase tracking-wide">
          <Icon name="relay" size={18} /> Accesso a RELAY
          <span className="flex-1 h-3 ml-2 r-ridges opacity-50" />
        </div>
        <div className="bg-[#e8e2d2] text-ink p-6">
          <div className="font-display font-black uppercase text-5xl leading-none">Relay</div>
          <p className="text-[13px] text-ink/60 mb-5">Halden Netcare — postazione di sorveglianza notturna</p>
          <label htmlFor="u" className="block text-[13px] font-semibold mb-1">Nome utente</label>
          <input id="u" autoFocus autoComplete="off" value={user} onChange={(e) => setUser(e.target.value)} className="w-full mb-4 r-sunken bg-[#f4efe3] px-3 py-2 font-mono text-[15px] outline-none focus:ring-2 focus:ring-signal" />
          <label htmlFor="pw" className="block text-[13px] font-semibold mb-1">Password</label>
          <input id="pw" type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full mb-3 r-sunken bg-[#f4efe3] px-3 py-2 font-mono text-[15px] outline-none focus:ring-2 focus:ring-signal" />
          {err && <p role="alert" className="text-[13px] text-[#9c3320] mb-3">{err}</p>}
          <button className="r-bevel w-full py-2 font-mono text-[15px] mt-1">Accedi</button>
          <p className="text-[12px] text-ink/55 mt-4">Non le ricordi? Alzati dalla scrivania [Esc] e guarda il monitor da vicino.</p>
        </div>
      </form>
    </div>
  )
}
