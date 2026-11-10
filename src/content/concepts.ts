// Pagine del taccuino di Ada. Prima il concetto (chiaro), poi la metafora, poi la nota a margine (simpatica).
export type ConceptId = 'autenticazione' | 'password' | 'rete' | 'switch' | 'pacchetto' | 'ip' | 'router' | 'mac' | 'inventario'

export interface Concept {
  title: string
  tab: string // linguetta del taccuino
  short: string
  body: string[]
  analogy: string
  margin: string
}

export const CONCEPT_ORDER: ConceptId[] = ['autenticazione', 'password', 'rete', 'switch', 'pacchetto', 'ip', 'router', 'mac', 'inventario']

export const CONCEPTS: Record<ConceptId, Concept> = {
  autenticazione: {
    title: 'Autenticazione',
    tab: 'Accesso',
    short: 'Dimostrare al computer chi sei.',
    body: [
      'Il computer non ti vede in faccia. Sa chi sei solo da quello che gli dai: nome utente + password.',
      'Chi conosce la tua password, per il sistema, È te.',
    ],
    analogy: 'Come il badge all\'ingresso: il tornello non sa chi lo usa, sa solo che il badge è valido.',
    margin: 'Una password sul post-it è un badge lasciato attaccato alla porta. Teo, sto parlando con te.',
  },
  password: {
    title: 'Password robuste',
    tab: 'Password',
    short: 'Conta la lunghezza, non i simboli strani.',
    body: [
      'Nessuno indovina le password a mano: lo fa un programma che prova miliardi di combinazioni al secondo, iniziando da parole comuni, nomi e date.',
      'Ogni carattere in più moltiplica il lavoro. Quattro parole a caso messe insieme battono "H@ld3n!" e si ricordano meglio.',
    ],
    analogy: 'Un lucchetto con più rotelle, non un lucchetto con rotelle più strane.',
    margin: 'La mia è lunga 6 parole e c\'è dentro un gatto. Non vi dico quale gatto.',
  },
  rete: {
    title: 'Rete',
    tab: 'Rete',
    short: 'Dispositivi collegati che si scambiano messaggi.',
    body: [
      'Una rete è un gruppo di dispositivi (computer, stampanti, server) collegati tra loro con cavi o col Wi-Fi.',
      'Se un dispositivo non è collegato, non può parlare con nessuno. Quando qualcosa non va, la prima domanda è sempre: "è attaccato?".',
    ],
    analogy: 'Le case di un quartiere: si mandano lettere solo se c\'è una strada che le unisce.',
    margin: 'Il 40% dei guasti si risolve controllando il cavo. L\'altro 60% anche, ma dopo tre ore.',
  },
  switch: {
    title: 'Switch',
    tab: 'Switch',
    short: 'Lo smistatore del quartiere.',
    body: [
      'Lo switch è una scatola con tante prese. Ci colleghi i dispositivi dello stesso quartiere (la stessa rete) e lui consegna ogni messaggio al destinatario giusto.',
      'Attenzione: lo switch conosce solo il suo quartiere. Tutto ciò che sta fuori, per lui non esiste.',
    ],
    analogy: 'Il portinaio del condominio: consegna la posta ai vicini, ma non spedisce lettere in un\'altra città.',
    margin: 'Le lucine che lampeggiano = traffico. Se non lampeggia niente, preoccupatevi. Se lampeggia TUTTO, preoccupatevi di più.',
  },
  pacchetto: {
    title: 'Pacchetto',
    tab: 'Pacchetti',
    short: 'Un pezzetto di messaggio con mittente e destinatario.',
    body: [
      'In rete i dati viaggiano a pezzetti chiamati pacchetti. Ognuno porta scritto da dove parte e dove deve arrivare.',
      'Il "messaggio di prova" (i tecnici lo chiamano ping) è un pacchetto che chiede solo "ci sei?". Se torna indietro, la strada funziona.',
    ],
    analogy: 'Una cartolina: poche righe, con indirizzo del mittente e del destinatario ben visibili.',
    margin: 'PING! …PONG. Il gioco più vecchio di internet.',
  },
  ip: {
    title: 'Indirizzo IP',
    tab: 'IP',
    short: 'L\'indirizzo di casa di un dispositivo.',
    body: [
      'Ogni dispositivo in rete ha un indirizzo IP, per esempio 192.168.1.15.',
      'La prima parte (192.168.1) dice in quale quartiere si trova. L\'ultimo numero (15) dice quale casa. Due dispositivi con la stessa prima parte sono vicini di casa.',
      'L\'IP può cambiare, come cambia l\'indirizzo quando trasloci.',
    ],
    analogy: 'Via e numero civico: dicono DOVE sei, non CHI sei.',
    margin: '192.168 lo vedrete ovunque. È tipo "Via Roma": ce n\'è una in ogni città.',
  },
  router: {
    title: 'Router',
    tab: 'Router',
    short: 'Il ponte tra quartieri diversi.',
    body: [
      'Il router collega reti diverse. Quando un messaggio deve uscire dal suo quartiere, lo switch lo passa al router, che sa da che parte mandarlo.',
      'Senza router, due quartieri restano isole separate, anche se ognuno funziona benissimo al suo interno.',
    ],
    analogy: 'Il ponte (o l\'ufficio postale) che collega due città.',
    margin: 'Volevo chiamarlo GANDALF. "Tu non passerai", ma solo per i pacchetti cattivi. Ho perso la votazione.',
  },
  mac: {
    title: 'Indirizzo MAC',
    tab: 'MAC',
    short: 'Il numero di serie della scheda di rete.',
    body: [
      'Il MAC (tipo 00:0A:F7:5E:11:07) è scritto dentro la scheda di rete dalla fabbrica.',
      'Il nome di un dispositivo lo sceglie chiunque. L\'IP può cambiare. Il MAC, di solito, resta: è la cosa più vicina a una carta d\'identità.',
    ],
    analogy: 'Il numero di telaio di un\'auto: puoi cambiare targa e colore, ma il telaio è sempre quello.',
    margin: 'Chi si traveste raramente si ricorda di cambiare anche le scarpe.',
  },
  inventario: {
    title: 'Inventario',
    tab: 'Inventario',
    short: 'La lista di chi DOVREBBE esserci.',
    body: [
      'Non puoi accorgerti di un intruso se non sai chi dovrebbe esserci. L\'inventario elenca ogni dispositivo autorizzato con i suoi dati.',
      'Molta sicurezza è proprio questo: confrontare "cosa c\'è" con "cosa dovrebbe esserci".',
    ],
    analogy: 'La lista degli invitati alla festa, con le foto.',
    margin: 'Aggiornatelo. AGGIORNATELO. (Lo dico anche a me stessa.)',
  },
}
