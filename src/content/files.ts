// File system di RELAY OS. Didattico prima, simpatico poi.
export type FsNode =
  | { type: 'dir'; name: string; children: FsNode[]; locked?: string }
  | { type: 'file'; name: string; kind: 'txt' | 'table'; body?: string; table?: 'inventory' }

export const FS: FsNode = {
  type: 'dir',
  name: 'RELAY',
  children: [
    {
      type: 'dir',
      name: 'Documenti',
      children: [
        {
          type: 'file',
          name: 'leggimi_turno_notturno.txt',
          kind: 'txt',
          body: `TURNO NOTTURNO — COSA FARE

1. Guarda i monitor.
2. Se qualcosa diventa ARANCIONE, scrivi a Teo.
3. Non toccare niente che non sai cos'è.
   (Se non sai cos'è, apri il taccuino di Ada: probabilmente c'è scritto.)

La macchinetta del caffè è al piano B1, oltre la porta.
Funziona. Più o meno.`,
        },
        {
          type: 'file',
          name: 'procedura_lockdown.txt',
          kind: 'txt',
          body: `PROCEDURA DI LOCKDOWN (scritta da A. Ferri)

COS'È
Se il server SECURITY-01 rileva un'intrusione nella rete,
blocca le porte del piano. Nessuno entra, nessuno esce.

PERCHÉ
Per evitare che qualcuno porti via dati o dispositivi
mentre l'attacco è in corso.

COME SI SBLOCCA
1. Ricollegare la rete e verificare che funzioni.
2. Capire QUALE dispositivo ha fatto scattare l'allarme.
3. Isolarlo.

— nota a margine:
"Le porte chiuse non servono solo a tenere fuori i ladri.
 Servono a tenere dentro chi deve capire cosa è successo." A.F.

— nota sotto la nota:
"Ada, è una procedura, non una poesia." T.`,
        },
      ],
    },
    {
      type: 'dir',
      name: 'Rete',
      children: [
        { type: 'file', name: 'inventario_rete.csv', kind: 'table', table: 'inventory' },
        {
          type: 'file',
          name: 'schema_quartieri.txt',
          kind: 'txt',
          body: `LA NOSTRA RETE, SPIEGATA SEMPLICE

Abbiamo due "quartieri" (reti):

  UFFICI        192.168.1.x   → i vostri PC, le stampanti
  SALA SERVER   192.168.2.x   → SECURITY-01, i backup

Dentro ogni quartiere c'è uno SWITCH che smista i messaggi.
Tra i due quartieri c'è il ROUTER: il ponte.

Se il ponte è rotto, ogni quartiere funziona da solo
ma non può parlare con l'altro.`,
        },
      ],
    },
    {
      type: 'dir',
      name: 'Condivisi',
      children: [
        {
          type: 'dir',
          name: 'Ada_Ferri',
          locked: 'Accesso negato. Il tuo utente non ha i permessi per questa cartella.\n(Sei entrato nel sistema, ma questo non significa che puoi aprire tutto.)',
          children: [],
        },
        {
          type: 'file',
          name: 'votazione_nome_router.txt',
          kind: 'txt',
          body: `CENA AZIENDALE 2022 — Votazione nome del router

 ROUTER-PT ............ 11 voti
 GANDALF .............. 1 voto (Ada)

Ada chiede che resti agli atti che "è un nome perfetto
per un dispositivo che decide chi passa e chi no".`,
        },
        {
          type: 'file',
          name: 'turni_dicembre.txt',
          kind: 'txt',
          body: `TURNI NOTTURNI

lun  Bruno (poi si è dato malato)
mar  Bruno (idem)
mer  il nuovo tecnico
gio  il nuovo tecnico
ven  il nuovo tecnico

Benvenuto/a in squadra! :) — T.`,
        },
      ],
    },
    {
      type: 'dir',
      name: 'Cestino',
      children: [
        {
          type: 'file',
          name: 'password_vecchie.txt',
          kind: 'txt',
          body: `Halden2017
Halden2018
Halden2019   <- quella attuale (non dirlo a nessuno)

Teo, se trovi questo file: NO. — A.F.`,
        },
      ],
    },
  ],
}
