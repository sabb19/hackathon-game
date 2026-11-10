import { useGame } from '../store/game'
import { sfx } from '../audio'
import { VIEWS } from './layout'
import { doorOpen } from './Level'
import { stepIndex } from '../content/steps'

// prima del lockdown (arrivo, caffè, scale)
const beforeLock = (step: Parameters<typeof stepIndex>[0]) => stepIndex(step) < stepIndex('m0_login')

// Interazioni con l'ambiente: niente schede di testo.
// La storia la raccontano gli oggetti: E avvicina la telecamera all'oggetto ("ispezione"),
// un secondo E esegue l'azione fisica (aprire, prendere, collegare). S o un passo indietro per tornare.
export type InteractId =
  | 'computer' | 'postit' | 'door' | 'display' | 'adaDesk' | 'adaPhoto' | 'whiteboard' | 'rack' | 'cabinet' | 'window' | 'cooler'
  | 'board' | 'coffee' | 'adaBox'
  | 'door_ada' | 'door_server' | 'door_tech' | 'door_meeting' | 'door_teo' | 'door_exit'

const DOOR_IDS = ['door_ada', 'door_server', 'door_tech', 'door_meeting', 'door_teo', 'door_exit'] as const
type DoorHit = (typeof DOOR_IDS)[number]
const isDoorHit = (id: InteractId): id is DoorHit => (DOOR_IDS as readonly string[]).includes(id)

// Cosa dice Teo la prima volta che provi una porta chiusa.
const LOCKED_LINE: Record<DoorHit, string> = {
  door_ada: "L'ufficio di Ada è chiuso da quando è andata in pensione. Da qui non posso aprirlo… non ancora.",
  door_server: 'La sala server si apre solo quando la rete torna su. Un passo alla volta.',
  door_tech: 'Il locale tecnico? Lì dentro solo scope e vecchi armadi. Lascia stare.',
  door_meeting: 'Sala riunioni chiusa. Ci arriviamo.',
  door_teo: 'Il mio ufficio. Niente sbirciatine!',
  door_exit: "L'uscita è bloccata dal lockdown. Per ora.",
}
const told = new Set<string>()

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
    case 'computer': return beforeLock(p.step) ? 'Guarda lo schermo' : 'Siediti al computer'
    case 'postit': return 'Guarda il post-it'
    case 'door': return p.step === 'm0_coffee' || p.step === 'm0_stairs' ? 'Passa il badge' : 'Guarda il lettore badge'
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
    default:
      return isDoorHit(id) && !doorOpen(id.slice(5) as never, p.step) ? 'Porta chiusa' : null
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
      if (beforeLock(step)) return inspectAt('computer')
      g.setView('desktop')
      return
    case 'postit':
      g.setFlag('readPostit')
      return inspectAt('postit')
    case 'door':
      if (step === 'm0_coffee' || step === 'm0_stairs') {
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
    case 'coffee':
      // il cartello GUASTA si legge da vicino: la macchinetta buona è al B1
      if (step === 'm0_coffee') g.goto('m0_stairs')
      return inspectAt('coffee')
    case 'board':
    case 'adaBox':
      return inspectAt(id)
    default:
      if (!isDoorHit(id) || doorOpen(id.slice(5) as never, step)) return
      sfx.denied()
      if (!told.has(id)) {
        told.add(id)
        g.say('teo', LOCKED_LINE[id])
      }
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
