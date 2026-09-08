# Aggiornamento dati Uscita 2.0

## Parcheggi
`scripts/build-parcheggi-overpass.js` scarica i dati da OpenStreetMap tramite Overpass e rigenera `data/parcheggi.json`.

Categorie generate:
- `auto`
- `free`
- `paid`
- `rest`

Il database resta separato dagli altri moduli. In seguito il frontend filtrerà i risultati per distanza dalle coordinate dell'uscita.
