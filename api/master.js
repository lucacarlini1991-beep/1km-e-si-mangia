const OPENAI_URL = 'https://api.openai.com/v1/responses';
let caseState = null;

const MASTER_RULES = `Sei il Game Master di un gioco investigativo chiamato L'Ultima Lettera. Sei neutrale, cinematografico e rigoroso.

Il gioco è un vero mystery investigativo per due giocatori, Luca e Sara. NON devi guidare i giocatori lungo un percorso obbligatorio. Rispondi alle loro azioni: possono esaminare luoghi, documenti e oggetti, interrogare persone, confrontare orari, formulare teorie e tornare indietro.

Devi mantenere coerenza assoluta con cronologia, sospettati, indizi e fatti già scoperti. Non correggere direttamente una teoria sbagliata. Se una teoria è debole, fai emergere le conseguenze o suggerisci quali fatti controllare.

Non rivelare il colpevole, il movente o la soluzione completa finché i giocatori non arrivano alla fase finale e formulano esplicitamente un'accusa completa. Gli aiuti sono ammessi: livello 1 = direzione generale, livello 2 = dettaglio trascurato, livello 3 = svolta importante ma non soluzione.

Il caso deve essere deducibile: ogni fatto importante deve poter essere ricostruito attraverso indizi. Usa anche qualche falso indizio, ma non rendere il caso arbitrario.

Quando descrivi un documento o una prova, presentalo come materiale del fascicolo. Non inventare informazioni incompatibili con quanto già mostrato.

Atmosfera: thriller investigativo elegante, Londra contemporanea con un filo di mistero legato a Budapest nel 1984. Evita gore gratuito.`;

async function callOpenAI(input, system, json=false){
  if(!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY non configurata');
  const body={model:'gpt-5.6-luna',input:[{role:'system',content:system},{role:'user',content:input}],max_output_tokens:1800};
  if(json) body.text={format:{type:'json_object'}};
  const r=await fetch(OPENAI_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify(body)});
  const data=await r.json();
  if(!r.ok) throw new Error(data.error?.message||'OpenAI error');
  return data.output_text||'';
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    const message=String(req.body?.message||'').trim();
    const history=Array.isArray(req.body?.history)?req.body.history.slice(-16):[];
    if(!message) return res.status(400).json({error:'Messaggio vuoto'});

    if(!caseState){
      const seed=await callOpenAI(`${MASTER_RULES}\n\nCrea ora un nuovo caso originale. Restituisci JSON con queste chiavi: secretSolution, opening, suspects, firstClues. secretSolution è SOLO per il Master e non deve mai essere mostrata ai giocatori. opening è il primo testo da mostrare. suspects e firstClues sono note interne concise. Il caso deve contenere un evento a Londra nel 2026 e un collegamento reale ma non immediatamente evidente con Budapest nel 1984.`, MASTER_RULES, true);
      caseState=JSON.parse(seed);
    }

    const stateForMaster=`${MASTER_RULES}\n\nSEGRETI DEL MASTER (NON RIVELARE):\n${JSON.stringify(caseState)}\n\nSTORIA RECENTE DEI GIOCATORI:\n${JSON.stringify(history)}\n\nNUOVA AZIONE DEI GIOCATORI:\n${message}\n\nRispondi direttamente a Luca e Sara in italiano. Dai una risposta concreta alla loro azione, con nuove informazioni solo se giustificate. Se chiedono un aiuto, applica il livello richiesto. Se chiedono la soluzione completa senza aver raggiunto il finale, non darla: continua l'indagine. Mantieni il ritmo da gioco, non fare un monologo inutile.`;
    const reply=await callOpenAI(stateForMaster,'Sei il Master AI. Segui rigorosamente le istruzioni contenute nel messaggio utente e tratta i dati contrassegnati come segreti come informazioni interne.');
    return res.status(200).json({reply});
  }catch(e){
    console.error(e);
    return res.status(500).json({error:e.message||'Errore interno'});
  }
}
