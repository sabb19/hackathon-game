# THE LAST SESSION — Documento di design (v2)

> Da approvare prima di costruire. Tutto ciò che è qui sotto sostituisce le scelte precedenti dove sono in conflitto.

## 1. In una frase
Un tecnico al primo turno di notte resta chiuso nel livello B2 di Halden Netcare. Per uscire deve riaprire il piano **stanza dopo stanza**: ogni porta si apre capendo un concetto di sicurezza informatica, **prima con le mani nel mondo, poi al computer**.

## 2. Pilastri (ogni scelta si misura su questi)
1. **Capire facendo** — nessun concetto spiegato senza usarlo entro un minuto; testi brevi (obiettivo ≤ 8 parole, spiegazione ≤ 3 righe).
2. **La stanza risponde** — ogni azione al computer cambia il mondo, ogni indizio del mondo serve al computer.
3. **Una cosa alla volta** — il giocatore sa sempre cosa fare, dove, con cosa (obiettivo + luce guida + Teo).
4. **Lo spazio è il premio** — ogni capitolo apre una stanza nuova (struttura da escape room).

## 3. La pianta del livello B2 (circa 28 × 22 m, soffitto 3,2 m)

```
 z ↑ (nord)
 -12 ┌──────────────┬───────────┬───────────────────────────────────────┐
     │ SALA RIUNIONI│  LOCALE   │            SALA SERVER                 │
     │  proiettore  │  TECNICO  │   4 file di rack, pavimento flottante, │
     │  (cap. 4)    │ (cap. 3)  │   aria condizionata, porta blindata    │
  -4 ├──────────────┼─────┬─────┴────────────────────────┬──────────────┤
     │ UFFICIO      │     │                               │ UFFICIO DI   │
     │ DI ADA       │     │       OPEN SPACE              │ TEO          │
     │ (cap. 1)     │     │   12 postazioni a banco       │ telecamere   │
  +2 │ tastierino   │     │   la tua postazione           │ (cap. 5)     │
     ├──────────────┤     │                               ├──────────────┤
     │ (finestre)   │     │                               │ CUCINETTA    │
  +8 ├──────────────┴─────┴───────────────────────────────┴──────────────┤
     │ CORRIDOIO:  ascensori (spenti) · SCALE (cap. 6) · USCITA (cap. 7)   │
 +11 └──────────────────────────────────────────────────────────────────────┘
     x: -14 ················································ +14
```

- **Finestre** sulla facciata ovest (ufficio di Ada, sala riunioni) e sud (corridoio): fuori la città, la pioggia.
- **Pareti vetrate** tra open space e uffici: si vede dentro le stanze chiuse prima di poterle aprire. Il giocatore *vede* il prossimo obiettivo.
- **Accessibili dall'inizio:** open space, cucinetta, corridoio. Tutto il resto è chiuso.

## 4. Flusso della partita (≈ 35–45 minuti)

| Tempo | Momento | Cosa succede |
|---|---|---|
| 0–2' | **Title** | L'edificio da fuori sotto la pioggia, una finestra del B2 accesa. "Nuovo turno" fa entrare la telecamera. |
| 2–5' | **Prologo · Arrivo** | Badge, ascensore, corridoio. Sulla scrivania un **biglietto di Teo** e il telefono che squilla: **videochiamata** (ritratto + testo): chi sei, cosa fai, chi è Ada, "non toccare l'armadio del locale tecnico". Tutorial dei comandi mentre cammini. |
| 5–7' | **Prologo · La notte** | Salto di tempo (23:44). La macchinetta del caffè è guasta → vai verso le scale per scendere al B1. Badge rifiutato → **lockdown** (serrande, luci arancioni, porte che si bloccano). Teo chiama, preoccupato. |
| 7–12' | **Cap. 1 · L'ufficio di Ada** | Password e autenticazione. |
| 12–18' | **Cap. 2 · La sala server** | Rete, switch, router. |
| 18–24' | **Cap. 3 · Il locale tecnico** | IP, MAC, inventario → SANDBOX-7. |
| 24–30' | **Cap. 4 · La sala riunioni** | Phishing: Bruno era la vittima. |
| 30–35' | **Cap. 5 · L'ufficio di Teo** | Log e telecamere: la verità su Ada e sull'intruso. |
| 35–40' | **Cap. 6 · Le scale** | Firewall. |
| 40–45' | **Cap. 7 · L'uscita** | Segmentazione: la scelta su SANDBOX-7, l'alba. |

## 5. I capitoli: ogni concetto due volte (mani → computer)

| Cap. | Concetto | Enigma nel mondo | Enigma al computer | Conseguenza / premio |
|---|---|---|---|---|
| 1 | Autenticazione, password | **Il tastierino dell'ufficio di Ada.** Il codice si ricava dalle sue abitudini (foto con una data, calendario, tazza). Lezione: una password prevedibile si indovina osservando. | **La macchina che indovina** (3 round). Il PC ti obbliga a cambiare la tua password del post-it. | L'ufficio di Ada si apre: il suo **taccuino** (Tab → Taccuino). |
| 2 | Rete, switch, router, IP | **Il pannello dei cavi nel rack** (sala server vista dal vetro, poi dentro): colleghi i cavi colorati seguendo lo schema del taccuino. | **Laboratorio a 3 tappe** (quartiere, ponte, guasto). Il guasto si ripara nel rack. | La porta blindata della sala server si apre; luce da rossa a blu. |
| 3 | IP vs MAC, inventario | **Le etichette sotto i dispositivi:** giri con l'**inventario stampato** (dalla stampante) e confronti i numeri di serie veri. | **Le carte d'identità** (monitor). Il MAC smaschera PRINTER-2 = SANDBOX-7. | Il locale tecnico si apre: SANDBOX-7 nell'armadio. |
| 4 | Phishing, social engineering | **L'email stampata sulla scrivania di Bruno**, con la lente: trovi gli indizi (mittente, link, urgenza). | **La posta di Bruno:** segnali, blocchi il mittente, isoli l'account. | La sala riunioni si apre: il proiettore mostra la riunione di lunedì. |
| 5 | Log, ricostruzione | **I monitor delle telecamere** nell'ufficio di Teo: fotogrammi da ordinare. | **Linea del tempo dei log:** le credenziali di Bruno entrano alle 23:31, ma Bruno è a casa. SANDBOX-7 era una trappola di Ada. | Ribaltamento della storia. |
| 6 | Firewall, regole | **La lista badge del lettore** delle scale: chi può passare, chi no (metafora concreta). | **Il buttafuori:** regole sul traffico, il traffico si vede in coda. Una regola sbagliata spegne gli studi medici. | Le scale si sbloccano; le serrande salgono. |
| 7 | Segmentazione, risposta all'incidente | **Ridividi i cavi nel rack** per zone di colore. | **La topologia del cap. 2**, tua, con meno aiuti. Scelta: isolare o spegnere SANDBOX-7. | La porta d'uscita si apre, l'alba. |

**Regole per tutti gli enigmi:** una domanda, un concetto; prima la scheda (3 righe + metafora), poi le mani; ogni errore insegna qualcosa (mai tentativi a caso); al massimo 5 minuti; il concetto ritorna più avanti con meno aiuti.

## 6. La storia, in breve
- **Tu:** tecnico junior da due settimane, primo turno di notte da solo.
- **Teo:** supervisore. Presente come **voce scritta e ritratto** (videochiamate, telefonate con risposte a scelta), **occhio** (la telecamera di sicurezza ti segue col LED rosso), **mano** (da remoto sblocca cose quando lo aiuti).
- **Ada:** ha costruito la rete, in pensione da sei mesi. Non compare mai: parla con oggetti, appunti, il taccuino, l'ufficio rimasto com'era.
- **Bruno:** commerciale distratto. Sembra il colpevole (cap. 4), è la vittima (cap. 5).
- **La verità:** un attaccante ha rubato le credenziali di Bruno con il phishing; SANDBOX-7 era la trappola di Ada, che ha fatto scattare il lockdown per proteggere l'azienda.
- **Il finale:** isoli o spegni SANDBOX-7. Nessuna scelta è sbagliata; il rapporto spiega i compromessi.

## 7. Teo, oltre la chat
| Forma | Quando | Esempio |
|---|---|---|
| Videochiamata (ritratto + testo + 2–3 risposte) | Momenti chiave | Passaggio di consegne, lockdown, ribaltamento |
| Chat | Aiuti, battute, commenti | "Non quel cassetto…" |
| Telecamera di sicurezza | Sempre | Ti segue, LED rosso: Teo ti vede |
| Azioni a distanza | Fine capitolo | Accende una luce, sblocca una porta |
| Segreteria del telefono fisso | Prologo, cap. 4 | Messaggi lasciati prima del lockdown, con indizi |

## 8. Interazioni nel mondo
- **Inventario minimo** (max 4 oggetti, nel telefono): badge di Ada, inventario stampato, torcia, chiavetta USB.
- **Oggetti che fanno qualcosa:** stampante (stampa gli indizi), telefono fisso (segreteria), lettori badge, tastierini, pannello dei cavi, monitor delle telecamere, proiettore.
- **Comandi:** clic = interagisci/azione · tasto destro = indietro · Tab = telefono · Esc = pausa.

## 9. Title screen
- L'edificio da fuori, notte e pioggia, una finestra accesa al B2. Il titolo sopra.
- "Continua" solo se esiste una partita vera.
- "Nuovo turno" → la telecamera entra nell'edificio: è già il prologo.

## 10. Cosa si riusa / cosa si rifà
- **Si riusa:** motore 3D, controlli, ispezione, telefono, taccuino, interfaccia (direzione C), RELAY, tutti i modelli Blender, minigiochi password / rete / carte.
- **Si rifà:** la pianta (da stanza unica a piano a più stanze con porte), il prologo, il modo in cui appare Teo.
- **Nuovo:** porte e tastierini, pannello dei cavi, etichette dei dispositivi, stampante che stampa, telecamera che segue, videochiamate, capitoli 4–7.

## 11. Ordine di costruzione
1. **Piano e porte** — nuova pianta, stanze, porte bloccate e sbloccabili, vetri, illuminazione per stanza.
2. **Prologo e Teo** — arrivo, videochiamata, salto di tempo, lockdown, telecamera che segue.
3. **Capitoli 1–3** con gli enigmi fisici (tastierino, pannello dei cavi, etichette).
4. **Capitoli 4–7.**
5. **Rifinitura e prove** con 2–3 persone che non conoscono il gioco.

## 12. Domande aperte
- Durata obiettivo per l'hackathon: tutti e 7 i capitoli o una demo solida fino al capitolo 3–4?
- Videochiamata di Teo: ritratto illustrato statico (veloce) o mezzobusto 3D (più costoso)?
