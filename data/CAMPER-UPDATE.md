# Aggiornamento dati Camper

`scripts/build-camper-overpass.js` genera `data/camper.json` interrogando OpenStreetMap tramite Overpass.

Categorie/servizi estratti:
- `area` — area sosta / caravan site
- `water` — acqua potabile
- `grey` — scarico acque
- `wc` — scarico WC quando rilevabile
- `service` — camper service
- `electricity` — elettricità quando indicata

I record possono contenere più servizi: un'unica area camper può quindi apparire nei sottotab pertinenti senza duplicare il luogo nel database.
