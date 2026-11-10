import { useGame } from '../store/game'
import { sfx } from '../audio'

// Interazioni con l'ambiente: niente schede di testo.
// La storia la raccontano gli oggetti: E avvicina la telecamera all'oggetto ("ispezione"),
// un secondo E esegue l'azione fisica (aprire, prendere, collegare). S o un passo indietro per tornare.
export type InteractId =
  | 'computer' | 'postit' | 'door' | 'display' | 'adaDesk' | 'adaPhoto' | 'whiteboard' | 'rack' | 'cabinet' | 'window' | 'cooler'
  | 'board' | 'coffee' | 'adaBox'

type V3 = [number, number, number]

// Inquadrature di ispezione (coordinate del mondo): da dove guardare, verso dove.
export const VIEWS: Partial<Record<InteractId, { pos: V3; look: V3 }>> = {
  postit: { pos: [0.22, 1.24, 2.22], look: [0.205, 1.195, 1.878] },
  computer: { pos: [0, 1.25, 2.55], look: [0, 1.08, 1.85] },
  door: { pos: [7.25, 1.35, 4.25], look: [7.97, 1.25, 4.25] },
  display: { pos: [6.7, 2.0, 4.6], look: [7.96, 2.1, 4.6] },
  adaDesk: { pos: [-7.75, 1.4, -5.2], look: [-6.98, 0.6, -5.21] },
  adaPhoto: { pos: [-6.75, 1.05, -4.25], look: [-6.12, 0.9, -4.25] },
  whiteboard: { pos: [-2, 1.6, -7.9], look: [-2, 1.55, -9.95] },
  rack: { pos: [4.0, 1.4, -8.25], look: [4.0, 1.2, -9.0] },
  cabinet: { pos: [6.45, 1.3, -8.0], look: [6.6, 0.75, -9.2] },
  board: { pos: [0.6, 1.5, 4.85], look: [0.6, 1.5, 5.97] },
  coffee: { pos: [4.05, 1.5, 4.7], look: [4.05, 1.25, 5.6] },
  adaBox: { pos: [-4.0, 1.25, -8.55], look: [-4.0, 0.25, -9.4] },
}

function inspectAt(id: InteractId, action?: string) {
  const v = VIEWS[id]
  if (!v) return
  sfx.click()
  useGame.getState().setInspect({ id, pos: v.pos, look: v.look, action })
}

// Etichetta del mirino quando guardi un oggetto (prima dell'ispezione).
export function promptFor(id: InteractId): string | null {
  const p = useGame.getState().progress
  if (!p) return null
  switch (id) {
    case 'computer': return p.step === 'm0_coffee' ? 'Guarda lo schermo' : 'Siediti al computer'
    case 'postit': return 'Guarda il post-it'
    case 'door': return p.step === 'm0_coffee' ? 'Passa il badge' : 'Guarda il lettore badge'
    case 'display': return 'Guarda il display'
    case 'adaDesk': return p.flags.notebook ? 'Guarda la scrivania' : 'Apri il cassetto'
    case 'adaPhoto': return 'Guarda la foto'
    case 'whiteboard': return 'Guarda la lavagna'
    case 'rack': return 'Guarda il rack'
    case 'cabinet': return "Guarda l'armadio"
    case 'window': return p.flags.lockdown ? 'Batti sulla serranda' : null
    case 'cooler': return "Bevi un po' d'acqua"
    case 'board': return 'Guarda la bacheca'
    case 'coffee': return 'Guarda la macchina del caffè'
    case 'adaBox': return 'Guarda lo scatolone'
  }
}

// Primo E: avvicinarsi all'oggetto (o azione immediata).
export function interact(id: InteractId) {
  const g = useGame.getState()
  const p = g.progress
  if (!p) return
  const step = p.step

  switch (id) {
    case 'computer':
      if (step === 'm0_coffee') return inspectAt('computer')
      g.setView('desktop')
      return
    case 'postit':
      g.setFlag('readPostit')
      return inspectAt('postit')
    case 'door':
      if (step === 'm0_coffee') {
        // la scena la raccontano luci, serrande e suoni (vedi World → Player)
        if (g.cinematic) return
        sfx.denied()
        setTimeout(() => sfx.alarmOn(), 900)
        setTimeout(() => sfx.alarmOff(), 7500)
        g.setFlag('lockdown')
        g.setCinematic(performance.now())
        return
      }
      sfx.denied()
      return inspectAt('door')
    case 'display':
      return inspectAt('display')
    case 'adaDesk':
      g.setFlag('adaDrawerOpen')
      return inspectAt('adaDesk', p.flags.notebook ? undefined : 'Prendi il taccuino')
    case 'adaPhoto':
      return inspectAt('adaPhoto')
    case 'whiteboard':
      return inspectAt('whiteboard')
    case 'rack':
      if (step === 'm1_plug') return inspectAt('rack', 'Ricollega il cavo')
      if (step === 'm2_locate') g.setFlag('followedCable') // il cavo grigio della porta 7 entra nell'armadio
      return inspectAt('rack')
    case 'cabinet':
      if (step === 'm2_locate' && p.flags.followedCable) return inspectAt('cabinet', "Apri l'armadio")
      sfx.rattle(0, 0.25) // maniglia chiusa a chiave
      return inspectAt('cabinet')
    case 'window':
      if (p.flags.lockdown) sfx.slam()
      return
    case 'cooler':
      sfx.rattle(0, 0.6)
      return
    case 'board':
    case 'coffee':
    case 'adaBox':
      return inspectAt(id)
  }
}

// Secondo E durante l'ispezione: l'azione fisica.
export function inspectAction() {
  const g = useGame.getState()
  const ins = g.inspect
  const p = g.progress
  if (!ins || !ins.action || !p) return
  switch (ins.id) {
    case 'adaDesk':
      g.setFlag('notebook')
      sfx.click()
      g.setInspect({ ...ins, action: undefined })
      g.showToast('Taccuino preso · lo trovi nel telefono (Tab)')
      g.say('teo', 'Hai il taccuino? Ada ci scriveva tutto, spiegato meglio di qualsiasi corso.')
      return
    case 'rack':
      g.setFlag('cablePlugged')
      sfx.click()
      g.setInspect({ ...ins, action: undefined })
      g.say('teo', 'Ho visto la lucina diventare verde! Torna al PC e rimanda il messaggio di prova.')
      g.goto('m1_verify')
      return
    case 'cabinet':
      g.setFlag('foundSandbox')
      sfx.rattle(0, 0.4)
      g.setInspect({ ...ins, action: undefined })
      g.say('ada', 'Se state leggendo questo, la trappola ha funzionato. Non spegnetemi ancora: prima capite chi è entrato. — A.F.', 'Se state leggendo questo…')
      g.say('teo', '…A.F. È Ada. Ada Ferri. Ma è in pensione da sei mesi. Che cosa hai trovato là dentro?')
      g.goto('end')
      setTimeout(() => {
        const s = useGame.getState()
        s.setInspect(null)
        if (document.pointerLockElement) document.exitPointerLock()
        s.setScreen('demoEnd')
      }, 6000)
      return
  }
}
