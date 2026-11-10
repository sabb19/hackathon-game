import { useState } from 'react'
import { useGame } from '../../store/game'
import { INVENTORY, SEEN, type InvRow, type SeenDevice } from '../../content/network'
import { CONCEPTS } from '../../content/concepts'
import { stepIndex } from '../../content/steps'
import { lockPointer } from '../../world/pointer'

// Missione 3 — "Chi c'è?": carte d'identità dei dispositivi.
// Capisci (scheda) → scegli una carta → l'inventario risponde → il numero di serie smaschera il travestimento.

type Field = 'name' | 'ip' | 'mac'
const ROWS: { k: Field; label: string; tech: string }[] = [
  { k: 'name', label: 'Nome', tech: 'lo sceglie chiunque' },
  { k: 'ip', label: 'Indirizzo', tech: 'IP · può cambiare' },
  { k: 'mac', label: 'Numero di serie', tech: 'MAC · scritto in fabbrica' },
]

function Card({ d, state, onClick, onField, highlight, title }: { d: SeenDevice | InvRow; state?: 'sel' | 'match' | 'fake' | 'dim' | null; onClick?: () => void; onField?: (f: Field) => void; highlight?: Partial<Record<Field, 'ok' | 'bad'>>; title?: string }) {
  const ring = state === 'sel' ? 'ring-4 ring-signal' : state === 'fake' ? 'ring-4 ring-bad' : state === 'match' ? 'ring-4 ring-ok' : ''
  return (
    <button onClick={onClick} className={`text-left bg-cream text-ink w-full p-3 transition-all ${ring} ${state === 'dim' ? 'opacity-35' : ''} hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between">
        <div className="font-display font-black uppercase text-[19px] leading-none">{d.name}</div>
        {title && <span className="text-[11px] font-mono text-ink/50">{title}</span>}
      </div>
      <div className="mt-2 space-y-1">
        {ROWS.map((r) => {
          const h = highlight?.[r.k]
          return (
            <div
              key={r.k}
              onClick={(e) => {
                if (!onField) return
                e.stopPropagation()
                onField(r.k)
              }}
              className={`flex justify-between gap-2 text-[13px] px-1.5 py-0.5 ${h === 'ok' ? 'bg-[#cfe9d6]' : h === 'bad' ? 'bg-[#f5cdc2]' : ''} ${onField && r.k === 'mac' ? 'underline decoration-dotted cursor-pointer' : ''}`}
            >
              <span className="text-ink/60">{r.label}</span>
              <span className="font-mono">{d[r.k]}</span>
            </div>
          )
        })}
      </div>
      {'note' in d && <div className="text-[11px] text-ink/55 mt-1.5 leading-snug">{d.note}</div>}
    </button>
  )
}

export default function NetMonitor() {
  const p = useGame((s) => s.progress)!
  const [sel, setSel] = useState<number | null>(null)
  const [searchMac, setSearchMac] = useState<string | null>(null)
  const [cardOk, setCardOk] = useState(!!p.flags.monCard)
  const solved = stepIndex(p.step) >= stepIndex('m2_locate')
  const g = useGame.getState()

  const s = sel !== null ? SEEN[sel] : null
  const twin = s ? INVENTORY.findIndex((r) => r.name === s.name) : -1
  const t = twin >= 0 ? INVENTORY[twin] : null
  const cmp = s && t ? { name: s.name === t.name, ip: s.ip === t.ip, mac: s.mac === t.mac } : null
  const owner = searchMac ? INVENTORY.findIndex((r) => r.mac === searchMac) : -1
  const unmasked = !!s && owner >= 0 && INVENTORY[owner].name !== s.name

  const pick = (i: number) => {
    setSel(i)
    setSearchMac(null)
    g.learn('inventario')
  }
  const onMac = (f: Field) => {
    if (f !== 'mac' || !s) return
    setSearchMac(s.mac)
    g.learn('mac')
  }
  const report = () => {
    g.setFlag('identifiedSandbox')
    g.goto('m2_locate')
  }

  // messaggio della situazione, in parole semplici
  let msg = 'Scegli un dispositivo collegato: l\'inventario ti mostra la sua carta per confrontarle.'
  if (s && !t) msg = `${s.name} non è nell'inventario.`
  if (cmp && cmp.name && cmp.ip && cmp.mac) msg = `${s!.name}: tutto coincide. È autorizzato.`
  if (cmp && cmp.name && !cmp.mac) msg = `Stesso nome, ma indirizzo e numero di serie diversi: qualcuno si spaccia per ${s!.name}. Clicca il suo numero di serie per scoprire chi è davvero.`
  if (unmasked) msg = `Smascherato: il numero di serie appartiene a ${INVENTORY[owner].name}, un dispositivo dismesso. È collegato in sala server, porta 7.`

  return (
    <div className="h-full grid grid-cols-[1fr_1fr_280px] bg-[#0f1822] text-cream relative">
      {!cardOk && (
        <div className="absolute inset-0 z-20 bg-ink/70 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-cream text-ink fade-up">
            <div className="flex items-stretch">
              <span className="sign-num text-3xl flex items-center">?</span>
              <span className="font-display font-black uppercase text-2xl px-4 py-2">Chi c'è nella rete?</span>
            </div>
            <div className="p-5 space-y-4">
              {(['inventario', 'mac'] as const).map((id) => (
                <div key={id}>
                  <div className="font-display font-black uppercase text-xl">{CONCEPTS[id].title}: <span className="normal-case font-sans font-semibold text-[16px]">{CONCEPTS[id].short}</span></div>
                  <p className="text-[15px] italic text-ink/70 border-l-4 border-signal pl-3 mt-1">{CONCEPTS[id].analogy}</p>
                </div>
              ))}
              <button
                className="btn btn-signal"
                onClick={() => {
                  g.setFlag('monCard')
                  setCardOk(true)
                }}
              >
                Ho capito, controlliamo
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="p-4 overflow-y-auto">
        <div className="kicker text-[13px] mb-2">Collegati adesso</div>
        <div className="grid gap-3">
          {SEEN.map((d, i) => (
            <Card
              key={d.name}
              d={d}
              title={d.where.split('·')[1]?.trim()}
              state={sel === i ? (unmasked ? 'fake' : 'sel') : sel !== null ? 'dim' : null}
              onClick={() => pick(i)}
              onField={sel === i ? onMac : undefined}
              highlight={sel === i && cmp ? { name: cmp.name ? 'ok' : 'bad', ip: cmp.ip ? 'ok' : 'bad', mac: cmp.mac ? 'ok' : 'bad' } : undefined}
            />
          ))}
        </div>
      </section>

      <section className="p-4 overflow-y-auto border-l border-[#2b4a6b]">
        <div className="kicker text-[13px] mb-2">Inventario (chi dovrebbe esserci)</div>
        <div className="grid gap-3">
          {INVENTORY.map((r, i) => {
            const isTwin = i === twin && !searchMac
            const isOwner = i === owner
            return (
              <Card
                key={r.name}
                d={r}
                state={isOwner ? 'fake' : isTwin ? (cmp && cmp.mac ? 'match' : 'sel') : sel !== null ? 'dim' : null}
                highlight={isTwin && cmp ? { name: cmp.name ? 'ok' : 'bad', ip: cmp.ip ? 'ok' : 'bad', mac: cmp.mac ? 'ok' : 'bad' } : isOwner ? { mac: 'ok' } : undefined}
              />
            )
          })}
        </div>
      </section>

      <aside className="bg-cream text-ink flex flex-col">
        <div className="p-4 border-b border-ink/15">
          <div className="kicker text-[13px]">Obiettivo</div>
          <p className="text-[15px] font-semibold leading-snug mt-1">Uno dei dispositivi collegati non dovrebbe esserci. Trovalo.</p>
        </div>
        <div className="p-4 flex-1">
          <div className="kicker text-[13px] mb-1">Adesso</div>
          <p className="text-[16px] leading-snug">{msg}</p>
          <ul className="mt-4 space-y-1 text-[13px] text-ink/70">
            {ROWS.map((r) => (
              <li key={r.k}>
                <b>{r.label}</b> — {r.tech}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 border-t border-ink/15">
          {unmasked && !solved && (
            <button className="btn btn-signal w-full justify-center" onClick={report}>
              Segnala {INVENTORY[owner].name} a Teo
            </button>
          )}
          {solved && (
            <button
              className="btn btn-signal w-full justify-center"
              onClick={() => {
                useGame.getState().setView('world')
                lockPointer()
              }}
            >
              Vado in sala server
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}
