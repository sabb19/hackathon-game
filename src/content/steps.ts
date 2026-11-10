import type { ChatMsg } from '../store/game'

export type StepId =
  | 'm0_coffee'
  | 'm0_login'
  | 'm0_password'
  | 'm1_lab'
  | 'm1_plug'
  | 'm1_verify'
  | 'm2_monitor'
  | 'm2_locate'
  | 'end'

interface Step {
  chapter: string
  goal: string // massimo 8 parole: è l'unica cosa sempre visibile
  objective: string // dettaglio, nel telefono
  checklist?: { flag: string; label: string }[]
  onEnter?: { from: ChatMsg['from']; text: string; subject?: string }[]
  hints: string[]
}

export const STEPS: Record<StepId, Step> = {
  m0_coffee: {
    chapter: 'Prologo — 23:44',
    goal: 'Esci a prendere un caffè',
    objective: 'La macchinetta del piano è guasta. Quella buona è al B1: esci dalla porta col badge.',
    hints: ['La porta è sulla parete destra, sotto la luce verde USCITA. Passa il badge sul lettore.'],
  },
  m0_login: {
    chapter: 'Capitolo 1 — Chiuso dentro',
    goal: 'Prendi il taccuino, poi accedi al PC',
    objective: 'Sei chiuso nel piano. Prendi il taccuino di Ada e accedi al tuo computer.',
    checklist: [
      { flag: 'notebook', label: 'Prendi il taccuino di Ada' },
      { flag: 'loggedIn', label: 'Accedi al tuo computer' },
    ],
    onEnter: [
      { from: 'teo', text: 'LOCKDOWN sul tuo piano?! Sei chiuso dentro?' },
      { from: 'teo', text: 'Niente panico. Le porte le comanda un server, SECURITY-01. Capiamo cosa è successo e si sbloccano.' },
      { from: 'teo', text: 'Prima: nel cassetto di Ada (la scrivania vicino alle finestre) c\'è il suo taccuino. Prendilo.' },
      { from: 'teo', text: 'Poi entra nel PC. Le credenziali sono sul post-it. Lo so.' },
    ],
    hints: [
      'La scrivania di Ada è isolata vicino alle finestre, con la pianta secca. Apri il cassetto.',
      'Per il PC: guarda il post-it giallo sul monitor, poi siediti al computer.',
    ],
  },
  m0_password: {
    chapter: 'Capitolo 1 — Chiuso dentro',
    goal: 'Scegli una password nuova',
    objective: 'La tua password era su un post-it: RELAY la considera rubata. Scegline una nuova.',
    onEnter: [
      { from: 'relay', subject: 'Credenziale compromessa', text: 'La password era scritta in chiaro. Scegline una nuova prima di continuare.' },
    ],
    hints: [
      'Segui i tre round in ordine: la macchina ti mostra quanto ci mette a indovinare.',
      'Nel terzo round clicca 4 parole tra quelle proposte. Conta la lunghezza, non i simboli.',
    ],
  },
  m1_lab: {
    chapter: 'Capitolo 2 — Il ponte mancante',
    goal: 'Collega il tuo PC a SECURITY-01',
    objective: 'Il tuo PC non riesce a parlare con SECURITY-01. Apri il Laboratorio di rete.',
    onEnter: [
      { from: 'teo', text: 'Sei dentro! Ora il tuo PC deve parlare con SECURITY-01.' },
      { from: 'teo', text: 'Apri il Laboratorio di rete e segui le tappe.' },
    ],
    hints: [
      'Tieni premuto sulla presa del tuo PC (il cerchietto sotto) e trascina il cavo fino allo switch.',
      'La stampante è nel tuo stesso quartiere (192.168.1): il messaggio arriva da solo.',
      'SECURITY-01 è nel quartiere 192.168.2. Serve il ponte: trascina un cavo dallo switch al router.',
    ],
  },
  m1_plug: {
    chapter: 'Capitolo 2 — Il ponte mancante',
    goal: 'Ricollega il cavo nel rack',
    objective: 'Il cavo verso la sala server è staccato. Vai al Rack B e ricollegalo.',
    onEnter: [{ from: 'teo', text: 'Il cavo è staccato, proprio fisicamente. Sala server, Rack B: quello che lampeggia rosso.' }],
    hints: ['Esci dal PC, entra nella sala server e guarda il rack che lampeggia.'],
  },
  m1_verify: {
    chapter: 'Capitolo 2 — Il ponte mancante',
    goal: 'Riprova il messaggio dal PC',
    objective: 'Cavo ricollegato. Torna al PC e rimanda il messaggio a SECURITY-01.',
    hints: ['Laboratorio di rete → Invia messaggio di prova.'],
  },
  m2_monitor: {
    chapter: 'Capitolo 3 — Chi c\'è?',
    goal: 'Trova il dispositivo intruso',
    objective: 'Il lockdown l\'ha fatto scattare un dispositivo sconosciuto. Aprite il Monitor di rete.',
    onEnter: [
      { from: 'teo', text: 'CE L\'HAI FATTA. Le serrande si alzano un po\', lo vedo da qui.' },
      { from: 'teo', text: 'Ma il lockdown non era un guasto: c\'è un dispositivo che non riconosco. Apri il Monitor di rete.' },
    ],
    hints: [
      'Il nome lo può scrivere chiunque. Confronta anche indirizzo e numero di serie.',
      'Clicca PRINTER-2: la sua carta nell\'inventario ha dati diversi.',
      'Clicca il numero di serie di PRINTER-2: l\'inventario ti dice a chi appartiene davvero.',
    ],
  },
  m2_locate: {
    chapter: 'Capitolo 3 — Chi c\'è?',
    goal: 'Trova SANDBOX-7 nella sala server',
    objective: 'SANDBOX-7 è collegato alla porta 7 del rack. Segui il cavo.',
    onEnter: [{ from: 'teo', text: 'SANDBOX-7?! Era dismesso. Era roba di Ada… Segui il cavo della porta 7.' }],
    hints: ['Guarda il rack: il cavo grigio della porta 7 entra nell\'armadio beige accanto.', 'Apri l\'armadio.'],
  },
  end: { chapter: 'Fine della demo', goal: 'Fine della demo', objective: 'Fine della demo.', hints: [] },
}

export const STEP_ORDER: StepId[] = ['m0_coffee', 'm0_login', 'm0_password', 'm1_lab', 'm1_plug', 'm1_verify', 'm2_monitor', 'm2_locate', 'end']
export const stepIndex = (s: StepId) => STEP_ORDER.indexOf(s)

// Dove deve andare il giocatore adesso (per l'indicatore nel mondo). null = al computer / nessun bersaglio.
export function targetFor(step: StepId, flags: Record<string, boolean>): string | null {
  switch (step) {
    case 'm0_coffee': return 'door'
    case 'm0_login': return flags.notebook ? 'computer' : 'adaDesk'
    case 'm0_password':
    case 'm1_lab':
    case 'm1_verify':
    case 'm2_monitor': return 'computer'
    case 'm1_plug': return 'rack'
    case 'm2_locate': return flags.followedCable ? 'cabinet' : 'rack'
    default: return null
  }
}

// Quanto il sistema di sicurezza si è "fidato" di nuovo: la stanza lo mostra (display della porta, serrande).
// 0 = lockdown pieno · 1 = operatore autenticato · 2 = rete ripristinata · 3 = intruso identificato
export function unlockLevel(step: StepId): number {
  const i = stepIndex(step)
  if (i >= stepIndex('end')) return 3
  if (i >= stepIndex('m2_monitor')) return 2
  if (i >= stepIndex('m1_lab')) return 1
  return 0
}
