// Videochiamate di Teo: battute brevi, 2 risposte a scelta, ognuna con una replica diversa.
export type CallId = 'handover' | 'lockdown'

export interface CallNode {
  text: string
  replies: { label: string; answer: string }[]
}

export const CALL_TITLE: Record<CallId, string> = {
  handover: 'Passaggio di consegne',
  lockdown: 'Allarme sul B2',
}

export const CALLS: Record<CallId, (name: string) => CallNode[]> = {
  // Le informazioni importanti sono sempre nelle battute di Teo: le risposte cambiano solo il tono.
  handover: (name) => [
    {
      text: `Eccoti, ${name}! Ti vedo dalla telecamera. Stanotte sei tu il tecnico di turno: il primo turno di notte da solo/a.`,
      replies: [
        { label: 'Sono pronto/a.', answer: 'Bene. Ti spiego tutto in un minuto, poi vado a dormire.' },
        { label: 'Un po\' di ansia…', answer: 'Normale. Di notte non succede quasi mai niente. Ti spiego tutto in un minuto.' },
      ],
    },
    {
      text: 'Halden Netcare gestisce le reti informatiche di ambulatori e scuole. Il tuo lavoro: sorvegliarle dal PC. Se qualcosa diventa arancione, mi chiami.',
      replies: [
        { label: 'Solo guardare?', answer: 'Solo guardare. E chiamarmi se serve. Le riparazioni le facciamo di giorno.' },
        { label: 'Arancione = guaio?', answer: 'Arancione vuol dire "chiamami". Il guaio lo decidiamo insieme.' },
      ],
    },
    {
      text: 'Vedi l\'ufficio a vetri sul lato ovest? Era di Ada Ferri. È lei che ha costruito tutta la nostra rete. È andata in pensione sei mesi fa, e nessuno ha ancora svuotato il suo ufficio.',
      replies: [
        { label: 'Com\'era Ada?', answer: 'Geniale e testarda. Annotava tutto su un taccuino. Senza di lei, qui, nessuno sa davvero come sta in piedi la rete.' },
        { label: 'Perché è ancora tutto lì?', answer: 'Nessuno ha avuto il coraggio di toccare le sue cose. Né i suoi sistemi.' },
      ],
    },
    {
      text: 'Le credenziali del tuo PC sono sul post-it attaccato al monitor. Sì, lo so. E una regola: nel locale tecnico c\'è un vecchio armadio di Ada. Non toccarlo.',
      replies: [
        { label: 'Ricevuto.', answer: 'Perfetto. Buon turno, ci sentiamo domattina!' },
        { label: 'Cosa c\'è dentro?', answer: 'Non lo sa nessuno. Funziona, e quello che funziona non si tocca. Buon turno!' },
      ],
    },
  ],
  lockdown: (name) => [
    {
      text: `${name}! Mi è arrivato un allarme: LOCKDOWN sul tuo piano. Sei chiuso/a dentro?`,
      replies: [
        { label: 'Sono scese le serrande!', answer: 'Lo vedo dalla telecamera. Niente panico.' },
        { label: 'Che succede?!', answer: 'Non lo so ancora. Niente panico.' },
      ],
    },
    {
      text: 'Porte e serrande le comanda un server, SECURITY-01. Se capiamo perché è scattato il blocco, si sblocca tutto.',
      replies: [
        { label: 'Come ti aiuto?', answer: 'Con le mani e con il PC. Da qui posso aprire qualche porta, ma solo quando il sistema mi risponde.' },
        { label: 'Non puoi aprire tu?', answer: 'Qualche porta sì, quando il sistema mi risponde. Per il resto servi tu, lì dentro.' },
      ],
    },
    {
      text: 'Ho appena aperto l\'ufficio di Ada, quello a vetri sul lato ovest. Nel cassetto della scrivania c\'è il suo taccuino: spiega come funziona la nostra rete.',
      replies: [
        { label: 'Vado a prenderlo.', answer: 'Poi accedi al tuo PC con le credenziali del post-it. Ti seguo dalle telecamere.' },
      ],
    },
  ],
}
