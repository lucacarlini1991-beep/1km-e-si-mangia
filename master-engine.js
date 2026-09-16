/* L'ULTIMA LETTERA — Static Text Adventure Engine
   Parser locale: nessuna API AI necessaria.
*/
(function(){
'use strict';
const KEY='UL_STATIC_MASTER_V1';
const clone=o=>JSON.parse(JSON.stringify(o));
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9àèéìòù\s]/g,' ').replace(/\s+/g,' ').trim();
const initial={scene:'london_flat',clues:[],visited:[],flags:{},history:[],players:['Luca','Sara'],turn:0};
const CASE={
 opening:`Il fascicolo UL-01 è aperto. Sono le 22:17 di una sera di ottobre 2026, a Londra.\n\nThomas Vale, consulente finanziario di 58 anni, è stato trovato morto nel suo appartamento di Bloomsbury. La porta non mostra segni di effrazione. Sul tavolo c'è una busta color avorio, senza francobollo e senza mittente.\n\nNon avete ancora un colpevole. Avete una scena, alcune domande e tutto il tempo necessario per farle nel vostro ordine.\n\nPotete scrivere normalmente: “esamino la scrivania”, “guardo la lettera”, “interrogo Margaret”, “controllo il telefono”, “voglio sapere dell'Ungheria”.`,
 scenes:{
  london_flat:{name:'Appartamento di Thomas Vale',text:`L'appartamento è ordinato in modo quasi innaturale. Il corpo è già stato rimosso. Restano la polizia scientifica, la scrivania, il telefono di Thomas, una libreria e la busta color avorio sul tavolo.`},
  desk:{name:'Scrivania',text:`Sulla scrivania trovate un taccuino, una penna stilografica, un computer spento e una ricevuta piegata in quattro. Nel cestino c'è una seconda ricevuta strappata.`},
  letter:{name:'Busta color avorio',text:`La busta è stata aperta senza essere strappata. Dentro c'è un foglio con una sola frase dattiloscritta: “Alcune promesse sopravvivono a chi le ha fatte.” In basso compare una data: 14/10/1984.`},
  phone:{name:'Telefono di Thomas',text:`Il telefono è protetto ma le notifiche recenti sono visibili. Alle 21:41 Thomas ha ricevuto un messaggio da un contatto salvato come “M.”: “Non puoi continuare a nasconderlo.” Alle 21:53 una chiamata persa da un numero londinese non salvato.`},
  bookshelf:{name:'Libreria',text:`Tra libri di storia economica e archivi di giornali c'è un volume fotografico su Budapest. Una pagina è piegata all'altezza di un'immagine del 1984.`}
 },
 clues:{
  letter:{text:`La data sulla lettera è 14 ottobre 1984. La frase sembra una minaccia solo a prima vista; non contiene un nome.`},
  receipt:{text:`La ricevuta è di un deposito bagagli alla stazione di King's Cross, ore 18:32. La data è quella del giorno della morte.`},
  tornreceipt:{text:`La ricevuta strappata riporta soltanto “BUD... 84” e una cifra parzialmente leggibile.`},
  phone:{text:`Il messaggio delle 21:41 dice: “Non puoi continuare a nasconderlo.” Il contatto “M.” e il numero della chiamata persa restano da identificare.`},
  book:{text:`Nel volume su Budapest la fotografia mostra una piccola sala conferenze nel 1984. Sul retro, scritto a matita, c'è: “Hotel Gellért — 14/10”.`},
  notebook:{text:`Nel taccuino compaiono tre iniziali: M.V., E.H., R.K. Accanto alle prime due c'è un segno di spunta; accanto a R.K. una domanda.`},
  margaret:{text:`Margaret Vale, ex moglie di Thomas, ammette di averlo incontrato quella sera alle 20:10. Dice di aver litigato con lui per una vecchia questione di famiglia e di essere andata via alle 20:35.`},
  edward:{text:`Edward Hart, socio d'affari, sostiene di essere rimasto in ufficio fino alle 21:30. Conosceva Thomas da oltre vent'anni e nega di sapere qualcosa di Budapest.`},
  rachel:{text:`Rachel Kovacs, storica e consulente d'archivio, dice di aver parlato con Thomas alle 19:15. Quando sente nominare Budapest, evita di rispondere direttamente e chiede chi vi abbia parlato del 1984.`},
  station:{text:`Alla stazione emerge che il deposito bagagli è stato ritirato alle 21:07 da una persona che ha usato un codice, non un documento. Il codice non è ancora collegato a un nome.`},
  archive:{text:`Un archivio fotografico collega la conferenza dell'Hotel Gellért del 14/10/1984 a un piccolo gruppo di giovani economisti britannici presenti a Budapest.`}
 },
 helps:{
  1:`Livello 1 — Direzione: avete già davanti almeno tre piste concrete. Non limitatevi alla scena: cercate un collegamento tra gli oggetti e le persone.`,
  2:`Livello 2 — Dettaglio: una data compare in più di un punto del fascicolo. Quando una data si ripete, confrontate ciò che accadde nello stesso giorno e non soltanto ciò che accadde a Londra.`,
  3:`Livello 3 — Svolta: il collegamento con Budapest non è un semplice ricordo del passato. Cercate chi avrebbe avuto un motivo per conservare, nascondere o recuperare qualcosa legato al 14 ottobre 1984.`
 }
};
function load(){try{return Object.assign(clone(initial),JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){return clone(initial)}}
function save(s){localStorage.setItem(KEY,JSON.stringify(s))}
function has(s,c){return s.clues.includes(c)}
function addClue(s,c){if(!has(s,c))s.clues.push(c)}
function contains(q,arr){return arr.some(x=>q.includes(x))}
function response(s,text,kind='normal'){s.history.push({q:text,a:kind});s.turn++;save(s);return kind}
function parse(s,input){const q=norm(input);if(!q)return 'Scrivete un’azione: esaminate qualcosa, interrogate qualcuno oppure formulate una teoria.';
 if(contains(q,['aiuto livello 1','aiuto 1','aiuto primo']))return response(s,input,CASE.helps[1]);
 if(contains(q,['aiuto livello 2','aiuto 2','aiuto secondo']))return response(s,input,CASE.helps[2]);
 if(contains(q,['aiuto livello 3','aiuto 3','aiuto terzo']))return response(s,input,CASE.helps[3]);
 if(contains(q,['ricomincia','nuova partita','reset'])){Object.assign(s,clone(initial));save(s);return CASE.opening}
 if(contains(q,['soluzione','chi e l assassino','chi ha ucciso','accuso']))return response(s,input,finale(s,q));
 if(contains(q,['scena','appartamento','salotto','camera','corpo'])){s.visited.push('london_flat');return response(s,input,CASE.scenes.london_flat.text)}
 if(contains(q,['scrivania','tavolo','cestino','ricevuta'])){s.visited.push('desk');addClue(s,'receipt');addClue(s,'tornreceipt');return response(s,input,CASE.scenes.desk.text+'\n\n'+CASE.clues.receipt.text+'\n\n'+CASE.clues.tornreceipt.text)}
 if(contains(q,['busta','lettera','foglio','frase'])){s.visited.push('letter');addClue(s,'letter');return response(s,input,CASE.scenes.letter.text+'\n\n'+CASE.clues.letter.text)}
 if(contains(q,['telefono','messaggio','chiamata','numero'])){s.visited.push('phone');addClue(s,'phone');return response(s,input,CASE.scenes.phone.text+'\n\n'+CASE.clues.phone.text)}
 if(contains(q,['libreria','libro','budapest','ungheria','gellert','gellért'])){s.visited.push('bookshelf');addClue(s,'book');addClue(s,'archive');return response(s,input,CASE.scenes.bookshelf.text+'\n\n'+CASE.clues.book.text+'\n\n'+CASE.clues.archive.text)}
 if(contains(q,['taccuino','appunti','iniziali','notebook'])){addClue(s,'notebook');return response(s,input,CASE.clues.notebook.text)}
 if(contains(q,['margaret','ex moglie','moglie'])){addClue(s,'margaret');return response(s,input,CASE.clues.margaret.text)}
 if(contains(q,['edward','hart','socio'])){addClue(s,'edward');return response(s,input,CASE.clues.edward.text)}
 if(contains(q,['rachel','kovacs','storica','archivista'])){addClue(s,'rachel');return response(s,input,CASE.clues.rachel.text)}
 if(contains(q,['stazione','king cross','king’s cross','deposito','bagagli'])){addClue(s,'station');return response(s,input,CASE.clues.station.text)}
 if(contains(q,['confronta','confrontiamo','orario','ore','tempo','cronologia']))return response(s,input,compare(s));
 if(contains(q,['teoria','penso','secondo me','credo','sospetto','forse']))return response(s,input,`Teoria registrata. Il fascicolo non vi dirà se è corretta. Per metterla alla prova, cercate un fatto indipendente che possa confermarla o smentirla.`);
 if(contains(q,['sospettati','chi sono','persone','indagati']))return response(s,input,`Per ora emergono tre nomi dal materiale disponibile: Margaret Vale, Edward Hart e Rachel Kovacs. Non sono equivalenti: ciascuno ha una relazione diversa con Thomas e con ciò che state scoprendo.`);
 if(contains(q,['budapest 1984','1984'])){addClue(s,'book');return response(s,input,`La data 1984 è presente nel fascicolo. Per ora sapete soltanto che la lettera riporta 14/10/1984 e che un archivio fotografico collega quella data all'Hotel Gellért di Budapest.`)}
 return response(s,input,`Il Master prende nota della vostra azione, ma non trova ancora un elemento preciso da associare. Provate a specificare cosa volete esaminare, chi volete interrogare o quale fatto volete confrontare.`)
}
function compare(s){let out=[];if(has(s,'letter'))out.push('14/10/1984 — data sulla lettera.');if(has(s,'book'))out.push('14/10/1984 — Hotel Gellért, Budapest.');if(has(s,'receipt'))out.push('18:32 — deposito bagagli a King’s Cross.');if(has(s,'phone'))out.push('21:41 — messaggio “Non puoi continuare a nasconderlo”; 21:53 — chiamata persa.');return out.length?out.join('\n'):`Non avete ancora abbastanza orari nel fascicolo. Cercate documenti e comunicazioni prima di ricostruire la cronologia.`}
function finale(s,q){const ready=['letter','receipt','phone','book','notebook','station'].every(c=>has(s,c));if(!ready)return `Non è ancora il momento della soluzione. Avete bisogno di collegare meglio gli elementi del fascicolo. Una buona accusa dovrebbe spiegare chi, come, perché, cosa accadde a Budapest nel 1984 e perché la vicenda è riemersa ora.`;if(contains(q,['rachel','kovacs'])&&contains(q,['margaret','edward']))return `Avete formulato un'accusa completa. Il fascicolo può ora passare alla verifica finale.`;return `Avete raggiunto abbastanza elementi per tentare un'accusa, ma questa frase non specifica ancora tutti i punti necessari. Indicate chiaramente: CHI, COME, PERCHÉ, COSA ACCADDE A BUDAPEST e PERCHÉ È RIEMERSO ORA.`}
window.UltimaLetteraEngine={load,save,parse,caseData:CASE,reset:function(){const s=clone(initial);save(s);return s},clueCount:function(s){return s.clues.length}};
})();