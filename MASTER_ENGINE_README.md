# L'Ultima Lettera — Master statico

Il gioco usa `master.html` + `master-engine.js`.

Non richiede API key, server AI o connessioni esterne per la partita.

Il motore è un text adventure locale: interpreta azioni, aggiorna lo stato, sblocca indizi, gestisce interrogatori, cronologia e aiuti 1/2/3.

Lo stato della partita viene conservato nel browser con `localStorage`, quindi un refresh non azzera automaticamente l'indagine.

## Comandi naturali supportati
- esamina la scena / appartamento
- scrivania / ricevuta / cestino
- busta / lettera
- telefono / messaggio / chiamata
- libreria / libro / Budapest / Hotel Gellért
- taccuino / iniziali
- Margaret / Edward / Rachel
- stazione / deposito bagagli
- confrontiamo gli orari / cronologia
- teoria / sospetto
- aiuto livello 1, 2 o 3
- ricomincia

Il motore è volutamente aperto: il giocatore può scrivere frasi diverse e il parser prova a ricondurle a una pista del caso.
