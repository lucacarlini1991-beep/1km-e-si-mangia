const base = process.env.TICKETONE_BASE || 'https://sampdoria.ticketone.it';
const eventId = process.env.TICKETONE_EVENT_ID;
const subEventId = process.env.TICKETONE_SUB_EVENT_ID;

if (!eventId || !subEventId) {
  throw new Error('Mancano TICKETONE_EVENT_ID e TICKETONE_SUB_EVENT_ID');
}

const url = `${base}/api/event/getpricesoptimized/${encodeURIComponent(eventId)}/${encodeURIComponent(subEventId)}`;
console.log(`GET ${url}`);

const response = await fetch(url, {
  headers: { Accept: 'application/json, text/plain, */*' },
  redirect: 'follow'
});

const body = await response.text();
console.log(`HTTP ${response.status}`);
console.log(`Content-Type: ${response.headers.get('content-type') || 'n/d'}`);
console.log(body ? body.slice(0, 10000) : '[risposta vuota]');
console.log('\nTEST SINGOLO COMPLETATO — nessun login, acquisto o polling.');
