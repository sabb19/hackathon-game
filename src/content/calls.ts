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
  handover: (name) => [
    {
      text: `Eccoti, ${name}! Ti vedo dalla telecamera dell'open space. Benvenuto/a al primo turno di notte.`,
      replies: [
        { label: 'Ciao Teo!', answer: 'Ti spiego tutto in un minuto, poi vado a dormire.' },
        { label: 'Mi vedi?', answer: 'Ci sono telecamere su tutto il piano. Io guardo da casa, tu guardi i sistemi.' },
      ],
    },
    {
      text: 'Il lavoro: tieni d\'occhio le reti dei nostri clienti, ambulatori e scuole. Se qualcosa diventa arancione, mi chiami.',
      replies: [
        { label: 'E se non succede niente?', answer: 'Di solito non succede niente. È il bello del turno di notte.' },
        { label: 'Arancione vuol dire guaio?', answer: 'Arancione vuol dire "chiamami". Il guaio lo decidiamo insieme.' },
      ],
    },
    {
      text: 'Le credenziali del PC sono sul post-it attaccato al monitor. Sì, lo so. Ne parliamo domani.',
      replies: [
        { label: 'Non è molto sicuro…', answer: 'Lo so, lo so. Domani la cambi, promesso.' },
        { label: 'Chi ha impostato i PC?', answer: 'Ada Ferri. Ha costruito tutta la nostra rete. È in pensione da sei mesi: il suo ufficio è ancora com\'era.' },
      ],
    },
    {
      text: 'Ultima cosa: nel locale tecnico c\'è un vecchio armadio. Non toccarlo.',
      replies: [
        { label: 'Ricevuto.', answer: 'Perfetto. Buon turno, ci sentiamo domattina!' },
        { label: 'Perché?', answer: 'Era roba di Ada, nessuno sa cosa fa. E se funziona, non si tocca. Buon turno!' },
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
