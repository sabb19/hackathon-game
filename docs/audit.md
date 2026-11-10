# THE LAST SESSION — Revisione di produzione (10 novembre)

Analisi a schermo pieno (1440×900) di ambiente, interfaccia e sistema operativo.
Regola guida (dal direttore): **ogni interazione deve avere senso e divertire**: niente clic "a vuoto", ogni gesto è un piccolo gioco.

## Problemi trovati

### Bug
| # | Problema | Gravità |
|---|---|---|
| B1 | La chiamata di Teo squilla appena si entra in gioco (la telecamera del titolo è già vicina alla scrivania). | Alta |
| B2 | All'arrivo metà schermo è coperta dallo spigolo del muro del varco. | Media |
| B3 | Archivio: lo scatolone di Ada si incastra nella cassettiera. | Media |
| B4 | Il telefono copre la barra delle applicazioni di RELAY e il riquadro dell'obiettivo copre le finestre. | Alta |
| B5 | Laboratorio di rete: refuso "a la stampante". | Bassa |

### Narrazione
- Il ruolo del tecnico viene **detto**, mai **fatto**: manca un momento in cui sorvegli davvero le reti.
- Ada è solo un nome: lo spazio non la presenta prima che diventi importante.
- Non si sente il passaggio tra i capitoli.

### Ambiente
- Luce: soffitto nero e pesante (metà schermo), le plafoniere sembrano carta, poca lettura dei volumi.
- Open space: ampie zone vuote a est e a ovest dei banchi; nulla dice "centro di sorveglianza reti".
- Cucinetta: un mobile isolato in una stanza vuota, luce sottopensile appesa al nulla.
- Archivio: quasi vuoto, cassettiere che sembrano scaffali da soggiorno.

### Sistema operativo (RELAY)
- Non sembra un sistema operativo vero: icone grandi su griglia vuota, niente sfondo, finestre che escono dallo schermo.
- Esplora file: cartelle vuote e senza senso (nessun contenuto, nessuna storia).
- Laboratorio di rete: lo schema occupa un francobollo in alto a sinistra di una tela enorme e vuota; la finestra è più larga dello spazio utile.
- Monitor di rete: carte che escono dalla finestra, colonne strette.

### Interazioni
- Ricollegare il cavo nel rack è un clic: va trasformato in un minigioco fisico.
- Tutte le azioni "prendi/apri" sono clic singoli: da rivedere una per una con un gesto che abbia senso.

## Stato (fine giornata)
- Sprint 1 ✔ — B1–B3, prologo in quattro momenti (console di sorveglianza con il ping, archivio e Ada), titoli dei capitoli.
- Sprint 2 ✔ — RELAY in stile Windows, B4, B5, Laboratorio di rete leggibile.
- Sprint 3 ✔ (primo minigioco) — cavo del Rack B. Da fare: cassetto di Ada (tastierino, cap. 1), armadio di SANDBOX-7, etichette dei dispositivi (cap. 3).
- Sprint 4 ✔ (prima passata) — soffitto e plafoniere, parete della sorveglianza, pilastri, cucinetta e archivio arredati; corretto il bagliore arancione sui telai delle porte.

## Piano di lavoro (sprint)
1. **Bug e prologo** — B1–B3; prologo in quattro momenti (il turno al PC, Ada e l'archivio, la notte, chiuso dentro); titoli dei capitoli.
2. **RELAY come un Windows** — desktop con sfondo, cartelle vere sul desktop e in Esplora file (documenti con la storia), barra delle applicazioni con orologio e area notifiche, finestre che stanno nello schermo; obiettivo e telefono che non coprono nulla; Laboratorio di rete e Monitor ridisegnati.
3. **Minigiochi fisici** — cavo del rack (trova la porta giusta, segui il cavo, innesta con la levetta), cassetto di Ada, armadio; poi gli enigmi dei capitoli 1–3 previsti dal design.
4. **Ambiente** — luci e soffitto, parete di monitor della sorveglianza nell'open space, cucinetta e archivio arredati, colonne e dettagli.
5. **Prova completa** con una persona che non conosce il gioco.
