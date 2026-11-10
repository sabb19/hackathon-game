import { useGame } from '../store/game'
import { sfx } from '../audio'
import { VIEWS } from './layout'
import { doorOpen } from './Level'
import { stepIndex } from '../content/steps'
import { lockPointer } from './pointer'

// prima del lockdown (arrivo, caffè, scale)
const beforeLock = (step: Parameters<typeof stepIndex>[0]) => stepIndex(step) < stepIndex('m0_login')

// Interazioni con l'ambiente: niente schede di testo.
// La storia la raccontano gli oggetti: E avvicina la telecamera all'oggetto ("ispezione"),
// un secondo E esegue l'azione fisica (aprire, prendere, collegare). S o un passo indietro per tornare.
export type InteractId =
  | 'computer' | 'postit' | 'door' | 'display' | 'adaDesk' | 'adaPhoto' | 'whiteboard' | 'rack' | 'cabinet' | 'window' | 'cooler'
  | 'board' | 'coffee' | 'adaBox'
  | 'lightSwitch' | 'adaCalendar' | 'copier' | 'brunoMail' | 'meetingTv' | 'cctv'
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

export function inspectAt(id: InteractId, action?: string) {
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
    case 'computer': return p.step === 'm0_watch' ? 'Siediti alla postazione' : beforeLock(p.step) ? 'Guarda lo schermo' : 'Siediti al computer'
    case 'postit': return 'Guarda il post-it'
    case 'door': return p.step === 'm0_coffee' || p.step === 'm0_stairs' ? 'Passa il badge' : 'Guarda il lettore badge'
    case 'display': return 'Guarda il display'
    case 'adaDesk': return p.flags.notebook ? 'Guarda la scrivania' : p.flags.adaDrawerOpen ? 'Prendi il taccuino' : 'Cassetto chiuso a codice'
    case 'adaCalendar': return 'Guarda il calendario'
    case 'brunoMail': return p.step === 'm3_bruno' ? 'Leggi il foglio stampato' : 'Il foglio di Bruno'
    case 'meetingTv': return p.step === 'm3_meeting' ? 'Guarda la presentazione' : null
    case 'cctv': return p.step === 'm4_cams' ? 'Guarda le registrazioni' : 'Monitor delle telecamere'
    case 'copier': return p.step === 'm2_locate' && !p.flags.checkedCopier ? "Controlla l'etichetta" : null
    case 'adaPhoto': return 'Guarda la foto'
    case 'whiteboard': return 'Guarda la lavagna'
    case 'rack': return 'Guarda il rack'
    case 'cabinet': return "Guarda l'armadio"
    case 'window': return p.flags.lockdown ? 'Batti sulla serranda' : null
    case 'cooler': return "Bevi un po' d'acqua"
    case 'board': return 'Guarda la bacheca'
    case 'coffee': return 'Guarda la macchina del caffè'
    case 'adaBox': return 'Guarda lo scatolone'
    case 'lightSwitch': return p.step === 'm0_ada' && !p.flags.archiveDark ? 'Spegni le luci' : null
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
      if (beforeLock(step) && step !== 'm0_watch') return inspectAt('computer')
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
      // il cassetto è chiuso con un lucchetto a codice: minigioco (ui/Keypad)
      if (!p.flags.adaDrawerOpen && step === 'm0_login') {
        sfx.click()
        g.setMinigame('keypad')
        return
      }
      return inspectAt('adaDesk', p.flags.notebook || !p.flags.adaDrawerOpen ? undefined : 'Prendi il taccuino')
    case 'adaCalendar':
      return inspectAt('adaCalendar')
    case 'adaPhoto':
      return inspectAt('adaPhoto')
    case 'whiteboard':
      return inspectAt('whiteboard')
    case 'rack':
      if (step === 'm1_plug') return inspectAt('rack', 'Ricollega il cavo')
      if (step === 'm2_locate' && p.flags.checkedCopier && !p.flags.followedCable) {
        // il cavo grigio della porta 7 scende a terra e passa sotto il muro
        g.setFlag('followedCable')
        g.say('teo', "Il cavo grigio della porta 7 scende a terra e passa sotto il muro: finisce nel locale tecnico. Nell'armadio di Ada.")
      }
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
    case 'brunoMail':
      if (step !== 'm3_bruno') return
      sfx.click()
      g.setMinigame('phishPrint')
      return
    case 'meetingTv':
      if (step !== 'm3_meeting') return
      inspectAt('meetingTv')
      g.say('teo', "\"Sicurezza Q3: zero incidenti\". E guarda la slide dopo: 'formazione phishing — rimandata'. Ada l'aveva chiesta tre volte.")
      g.say('teo', 'Abbiamo capito come sono entrati. Ora capiamo cosa hanno fatto, e perché Ada aveva preparato una trappola.')
      setTimeout(() => {
        const s = useGame.getState()
        s.setInspect(null)
        s.goto('m4_cams')
      }, 6000)
      return
    case 'cctv':
      if (step !== 'm4_cams') return
      sfx.click()
      g.setMinigame('cctv')
      return
    case 'copier':
      if (step !== 'm2_locate' || p.flags.checkedCopier) return
      sfx.click()
      g.setMinigame('labelCopier')
      return
    case 'lightSwitch':
      if (step !== 'm0_ada' || p.flags.archiveDark) return
      sfx.click()
      g.setFlag('archiveDark')
      g.say('teo', "Grazie. Lo scatolone accanto alla stampante è di Ada: le sue cose, mai ritirate. E dietro il vetro c'è il suo ufficio, rimasto com'era.")
      g.say('teo', 'Ok, adesso è tutto tuo. Io vado a dormire. Buon turno!')
      // il turno scorre: salto di tempo fino alle 23:44
      setTimeout(() => {
        const s = useGame.getState()
        if (s.progress?.step === 'm0_ada') s.setTimeSkip(performance.now())
      }, 7000)
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
      // minigioco: trovare la porta giusta e innestare il cavo (vedi ui/RackCable)
      sfx.click()
      g.setMinigame('rackCable')
      return
    case 'cabinet':
      // l'armadio si apre: dentro un mini PC con l'etichetta da confrontare
      g.setFlag('cabinetOpen')
      sfx.rattle(0, 0.4)
      g.setInspect({ ...ins, action: undefined })
      setTimeout(() => useGame.getState().setMinigame('labelSandbox'), 1200)
      return
  }
}

// Capitolo 3: la stampante dell'archivio non è PRINTER-2
export function copierChecked() {
  const g = useGame.getState()
  g.setFlag('checkedCopier')
  g.say('teo', "Quindi PRINTER-2 non è una stampante vera: è un travestimento. Vai in sala server e guarda la porta 7 del Rack B: dove va quel cavo?")
  lockPointer()
}

// Capitolo 3: il MAC conferma che il mini PC nell'armadio è PRINTER-2 travestito, cioè SANDBOX-7
export function sandboxFound() {
  const g = useGame.getState()
  g.setFlag('foundSandbox')
  {
      g.say('ada', 'Se state leggendo questo, la trappola ha funzionato. Non spegnetemi ancora: prima capite chi è entrato. — A.F.', 'Se state leggendo questo…')
      g.say('teo', '…A.F. È Ada. Ada Ferri. Ma è in pensione da sei mesi. Che cosa hai trovato là dentro?')
      // il capitolo 4 parte quando Teo ha letto il registro di SANDBOX-7
      setTimeout(() => useGame.getState().goto('m3_bruno'), 7000)
      lockPointer()
      return
  }
}
