import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,validateState,recordAttempt,EXERCISES,levelFor} from '../app/src/main/assets/web/core.js';
import {SYSTEM,REVIEW_SYSTEM,parseExercise,reviewPrompt,verifyGeneratedExercise,canonical,LocalTutor,hintPrompt,parseHint,generationPrompt} from '../app/src/main/assets/web/tutor.js';
import {codeFingerprint,diagnosticFor,rememberDiagnostic} from '../app/src/main/assets/web/practice.js';
import {measurement,metricSummary} from '../app/src/main/assets/web/metrics.js';
import {readFileSync} from 'node:fs';

const data=()=>({title:'Triplica gli interi',description:'x è un intero. Restituisci il triplo di x, anche per zero e numeri negativi.',function:'triplica',params:['x'],solution:'def triplica(x):\n    return x*3',cases:[{args:[1],expected:3},{args:[0],expected:0},{args:[-2],expected:-6},{args:[4],expected:12}],tips:['Pensa a una moltiplicazione.','Usa return.'],study:'Una funzione riceve un argomento e restituisce un valore.'});
const parse=d=>parseExercise(JSON.stringify(d),initialState(),'python');
const audit=()=>({...data(),cases:[{args:[2],expected:6},{args:[-3],expected:-9},{args:[10],expected:30},{args:[5],expected:15}]});

test('firma prima della consegna: prompt, esempio e grammatica hanno lo stesso ordine',()=>{
  const order=['title','function','params','description','solution','cases','tips','study'];
  for(const system of [SYSTEM,REVIEW_SYSTEM])assert.ok(system.includes('keys in order: '+order.join(', ')+'.'));
  const example=JSON.parse(SYSTEM.slice(SYSTEM.indexOf('\n')+1));assert.deepEqual(Object.keys(example),order);assert.ok(parse(example));
  const root=readFileSync(new URL('../native/tutor_policy.h',import.meta.url),'utf8').split('\n').find(line=>line.startsWith('root ::='));
  assert.deepEqual([...root.matchAll(/\\"([a-z]+)\\"/g)].map(match=>match[1]),order);
  assert.deepEqual(parse(Object.fromEntries(order.map(key=>[key,data()[key]]))).params,['x']);
});

test('rifiuta firme duplicate, keyword, pochi test, ingressi duplicati e tips vuoti',()=>{
  for(const change of [{params:['x','x']},{function:'return'},{params:['for']},{cases:data().cases.slice(0,3)},{cases:[data().cases[0],...data().cases.slice(0,3)]},{tips:['','Usa return.']}])assert.throws(()=>parse({...data(),...change}));
});
test('confronto degli ingressi indipendente dall’ordine delle chiavi JSON',()=>{
  assert.equal(canonical({a:1,b:[2]}),canonical({b:[2],a:1}));
  assert.throws(()=>parse({...data(),cases:[{args:[{a:1,b:2}],expected:1},{args:[{b:2,a:1}],expected:2},...data().cases.slice(2)]}),/stesso ingresso/);
});
test('rifiuta output solo nominalmente diversi entro la tolleranza Python',()=>{
  assert.throws(()=>parse({...data(),cases:data().cases.map((c,i)=>({...c,expected:1+i*1e-9}))}),/distinguono/);
});
test('contratto senza parametri e funzione completa nei tips vengono rifiutati',()=>{
  assert.throws(()=>parse({...data(),description:'Restituisci il triplo.'}),/tutti i parametri/);
  assert.throws(()=>parse({...data(),tips:[data().solution,'Usa return.']}),/funzione risolta/);
});
test('risposte non JSON o prive di oggetto producono errori in italiano',()=>{
  assert.throws(()=>parseExercise('non JSON',initialState(),'python'),/non è JSON valido/);
  for(const text of ['null','[]','true'])assert.throws(()=>parseExercise(text,initialState(),'python'),/oggetto JSON/);
});
test('rifiuta la ripetizione della descrizione anche con titolo e codice diversi',()=>{
  const s=initialState(),e=parse(data());s.generated[e.id]=e;
  assert.throws(()=>parseExercise(JSON.stringify({...data(),title:'Nuovo titolo',solution:'def triplica(x):\n    return x+x+x'}),s,'python'),/ripete/);
});
test('la revisione è cieca: nessuna soluzione, expected, tip o study originale',()=>{
  const e=parse(data()),prompt=reviewPrompt(e);
  const contract=JSON.parse(prompt.slice(prompt.indexOf('{')));
  assert.deepEqual(Object.keys(contract),['description','function','params','signature','avoidInputs']);
  assert.equal(contract.description,e.description);
  assert.equal(contract.signature,'def triplica(x):');
  assert.ok(!prompt.includes(e.solution));
});
test('solo l’esecuzione autorizza la sfida; i casi della revisione vengono conservati',async()=>{
  const jobs=[],e=parse(data());
  const runner={run:async job=>{jobs.push(job);return {passed:!job.code.includes('return 3\n')&&!job.code.endsWith('return 3')&&!job.code.endsWith('return x'),error:''};}};
  await verifyGeneratedExercise(e,runner,{generate:async()=>JSON.stringify({...audit(),title:EXERCISES[0].title})});
  assert.equal(e.cases.length,8);
  assert.equal(jobs.length,5);
  assert.ok(jobs.every(j=>j.validateGenerated&&canonical(j.params)==='["x"]'));
  assert.equal(jobs[1].cases.length,8);
});
test('un revisore positivo non sostituisce Python: soluzione incoerente scartata',async()=>{
  const e=parse({...data(),solution:'def triplica(x):\n    return x*2',cases:data().cases.map(c=>({...c,expected:c.expected*2/3}))});
  let calls=0;
  await assert.rejects(()=>verifyGeneratedExercise(e,{run:async()=>({passed:++calls===1,error:''})},{generate:async()=>JSON.stringify(audit())}),/Descrizione e test/);
  assert.equal(e.cases.length,4);
});
test('rifiuta contratti ambigui, revisione alterata e casi senza novità',async()=>{
  for(const [change,pattern] of [[{title:'RIFIUTA',description:'Manca il comportamento sullo zero.'},/ambiguo/],[{description:'Restituisci il doppio di x.'},/cambiato/],[{cases:data().cases},/test nuovi/]]){
    await assert.rejects(()=>verifyGeneratedExercise(parse(data()),{run:async()=>({passed:true})},{generate:async()=>JSON.stringify({...audit(),...change})}),pattern);
  }
});
test('rifiuta test che accettano una soluzione banale',async()=>{
  await assert.rejects(()=>verifyGeneratedExercise(parse(data()),{run:async()=>({passed:true})},{generate:async()=>JSON.stringify(audit())}),/Test troppo deboli/);
});
test('annullamento interrompe la verifica prima della revisione',async()=>{
  let cancelled=false;
  await assert.rejects(()=>verifyGeneratedExercise(parse(data()),{run:async()=>{cancelled=true;return {passed:true};}},{generate:async()=>{throw Error('Non deve essere chiamato');}},()=>cancelled),/interrotta/);
});
test('annullamento durante la revisione non esegue altri test né modifica la sfida',async()=>{
  let cancelled=false,calls=0;const e=parse(data());
  await assert.rejects(()=>verifyGeneratedExercise(e,{run:async()=>{calls++;return {passed:true};}},{generate:async()=>{cancelled=true;return JSON.stringify(audit());}},()=>cancelled),/interrotta/);
  assert.equal(calls,1);assert.equal(e.cases.length,4);
});
test('tips sbloccati e vecchie sfide senza params restano compatibili con schema 1',()=>{
  const s=initialState(),e=parse(data());delete e.params;e.cases=e.cases.slice(0,3);s.generated[e.id]=e;
  s.attempts[EXERCISES[0].id]={count:0,failures:0,tipsUnlocked:2};
  const loaded=validateState(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.schema,1);assert.equal(loaded.attempts[EXERCISES[0].id].tipsUnlocked,2);
  recordAttempt(loaded,EXERCISES[0],{passed:true});recordAttempt(loaded,EXERCISES[1],{passed:true});
  assert.equal(loaded.xp,50);assert.equal(levelFor(loaded,'python'),2);assert.equal(levelFor(loaded,'ml'),1);
  assert.equal(loaded.attempts[EXERCISES[0].id].tipsUnlocked,2);
});
test('diagnostica dei rifiuti locale e limitata al tentativo e al messaggio',()=>{
  const tutor={rejections:[]};
  for(let i=0;i<12;i++)LocalTutor.prototype.recordRejection.call(tutor,1,'errore '+i);
  assert.equal(tutor.rejections.length,10);assert.deepEqual(Object.keys(tutor.rejections[0]),['attempt','reason']);
});

function bridge(t,overrides={}){
  const oldWindow=globalThis.window,oldNative=globalThis.Native;
  const status={available:true,busy:false,model:'Qwen simulato'},requests=[];
  const native={modelStatus:()=>JSON.stringify(status),generateExercise:(...args)=>{requests.push(args);status.busy=true;},cancelGeneration:()=>{},...overrides};
  globalThis.window={Native:native};globalThis.Native=native;
  t.after(()=>{globalThis.window=oldWindow;globalThis.Native=oldNative;});
  return {tutor:new LocalTutor(),status,requests,native};
}
test('avanzamento nativo solo per la richiesta attiva; risposta tardiva ignorata',async t=>{
  const {tutor,status,requests}=bridge(t);const response=tutor.generate('sistema','richiesta');const id=requests[0][0];
  tutor.handle({type:'generation-progress',id:'vecchio',phase:'tokens',tokens:42,elapsedMs:5000});assert.equal(tutor.status.inference.tokens,0);
  tutor.handle({type:'generation-progress',id,phase:'tokens',tokens:42,elapsedMs:5000});assert.equal(tutor.status.inference.tokens,42);
  status.busy=false;tutor.handle({type:'generation',id,text:'risposta'});assert.equal(await response,'risposta');
  tutor.handle({type:'generation',id,text:'tardiva'});assert.equal(tutor.pending,null);assert.equal(tutor.status.inference,null);
});
test('timeout interrompe senza fingere che il nativo sia libero e non consente retry',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let cancelled=0;
  const {tutor,status,requests}=bridge(t,{cancelGeneration:()=>{cancelled++;}});
  const response=tutor.generate('sistema','richiesta');const rejection=assert.rejects(response,error=>error.retryable===false&&/Tempo massimo/.test(error.message));
  t.mock.timers.tick(195000);await rejection;assert.equal(cancelled,1);assert.equal(tutor.pending,null);assert.equal(tutor.status.busy,true);
  await assert.rejects(tutor.generate('s','p'),/terminando/);assert.equal(requests.length,1);
  status.busy=false;tutor.handle({type:'model-status',...status});const next=tutor.generate('s','p');
  const id=requests[1][0];tutor.handle({type:'generation',id,text:'valida'});assert.equal(await next,'valida');
});
test('annullamento immediato conserva busy fino alla conferma Android',async t=>{
  const {tutor,status,requests}=bridge(t);const response=tutor.generate('s','p');const rejected=assert.rejects(response,/interrotta/);
  tutor.cancel();await rejected;assert.equal(tutor.status.busy,true);
  tutor.handle({type:'generation',id:requests[0][0],text:'tardiva'});assert.equal(tutor.status.busy,true);
  status.busy=false;tutor.handle({type:'model-status',...status});assert.equal(tutor.status.busy,false);
});
test('errore del bridge libera pending e timer; timeout nativo non è rigenerabile',async t=>{
  const {tutor,requests}=bridge(t,{generateExercise:()=>{throw Error('Bridge fermo');}});
  await assert.rejects(tutor.generate('s','p'),error=>error.retryable===false);assert.equal(tutor.pending,null);assert.equal(tutor.status.busy,false);
  Native.generateExercise=(...args)=>requests.push(args);const response=tutor.generate('s','p');
  const rejected=assert.rejects(response,error=>error.retryable===false&&/Tempo massimo/.test(error.message));
  tutor.handle({type:'generation',id:requests[0][0],error:'Tempo massimo del tutor raggiunto (3 minuti per richiesta).'});await rejected;
});
test('errori numerici o vocabolario incompatibile interrompono il ciclo senza rigenerare',async t=>{
  const {tutor,requests}=bridge(t);
  for(const message of ['Il modello ha prodotto valori numerici non validi. Prova un altro GGUF.','Il modello non ha token compatibili con il formato richiesto. Prova un altro GGUF.','Il modello non ha prodotto risultati utilizzabili.']){
    const response=tutor.generate('s','p'),rejected=assert.rejects(response,error=>error.retryable===false&&error.message===message);
    tutor.handle({type:'generation',id:requests.at(-1)[0],error:message});await rejected;assert.equal(tutor.pending,null);assert.equal(tutor.status.busy,false);
  }
  assert.equal(requests.length,3);
});
test('Android riusa una sola Activity e non annuncia una sfida pronta dalla sola inferenza',()=>{
  const manifest=readFileSync(new URL('../app/src/main/AndroidManifest.xml',import.meta.url),'utf8'),bridge=readFileSync(new URL('../app/src/main/java/it/pydaily/app/LocalTutor.java',import.meta.url),'utf8');
  assert.match(manifest,/<activity[^>]*android:name="\.MainActivity"[^>]*android:launchMode="singleTask"/);
  assert.match(bridge,/Proposta ricevuta: la sfida deve ancora superare revisione e test Python/);assert.ok(!bridge.includes('Risposta del modello completata.'));
});
test('catalogo fissato, modelli originali conservati e MobileLLM aggiornato a R1.5',()=>{
  const models=JSON.parse(readFileSync(new URL('../app/src/main/assets/web/models.json',import.meta.url),'utf8'));
  assert.equal(models.length,5);assert.equal(new Set(models.map(m=>m.id)).size,5);
  for(const m of models){assert.match(m.url,/^https:\/\/huggingface\.co\/[^/]+\/[^/]+\/resolve\/[a-f0-9]{40}\//);assert.match(m.sha256,/^[a-f0-9]{64}$/);assert.ok(m.bytes>0&&Number.isInteger(m.bytes));assert.match(m.file,/^[a-z0-9.-]+\.gguf$/);}
  assert.ok(models.some(m=>m.id==='coder3'));assert.ok(models.some(m=>m.id==='coder1'));
  const mobile=models.find(m=>m.id==='mobile-r15');assert.equal(mobile.requiresConsent,true);assert.match(mobile.baseModel,/R1\.5-950M$/);assert.equal(mobile.bytes,618907200);
});
test('diagnosi dal risultato Python, dati compatti e nessun XP dalla sola analisi',()=>{
  const s=initialState(),e=EXERCISES[0],code='def doppio(numero):\n    print(numero * 2)';
  const result={passed:false,error:'',output:'6',cases:[{passed:false,actual:null,expected:6}]};
  const d=rememberDiagnostic(s,e,code,result,10);assert.equal(d.kind,'missing-return');assert.equal(s.xp,0);assert.equal(s.attempts[e.id].count,0);assert.equal(s.attempts[e.id].revealedDay,undefined);
  assert.deepEqual(d.failedCase,{args:e.cases[0].args,actual:null,expected:6});assert.equal(codeFingerprint(code),d.codeHash);
  assert.equal(diagnosticFor(e,code,{passed:false,error:'SyntaxError: invalid syntax',cases:[]}).kind,'syntax');
  assert.equal(diagnosticFor(e,code,{passed:false,error:'Tempo scaduto (4 secondi).',cases:[]}).kind,'timeout');
  const loaded=validateState(JSON.parse(JSON.stringify(s)));assert.deepEqual(loaded.attempts[e.id].lastFailure,d);
});
test('indizio: consegna, bozza e risultato reale, mai soluzione di riferimento',()=>{
  const e=parse(data()),code='def triplica(x):\n    print(x*2)',d=diagnosticFor(e,code,{passed:false,error:'',output:'2',cases:[{passed:false,actual:null,expected:3}]});
  const prompt=hintPrompt(e,code,d),input=JSON.parse(prompt.slice(prompt.indexOf('{')));
  assert.equal(input.submittedCode,code);assert.equal(input.python.kind,'missing-return');assert.equal(input.python.failedCase.actual,null);
  assert.ok(!prompt.includes(e.solution));assert.equal(input.solution,undefined);assert.equal(input.tips,undefined);
  assert.ok(hintPrompt(e,'\\'.repeat(12000),d).length<=6000);
});
test('indizi brevi, focus valido e rifiuto di codice esplicito, tracce e campi extra',()=>{
  const e=parse(data());assert.deepEqual(parseHint(JSON.stringify({hint:'Dove viene restituito il valore calcolato?',focus:'return'}),e),{text:'Dove viene restituito il valore calcolato?',focus:'return'});
  for(const change of [{hint:e.solution},{hint:'```python\nreturn x*3\n```'},{hint:'<think>ragiono</think>'},{hint:'x'.repeat(361)},{focus:'solution'},{solution:e.solution},{hint:'Calcola x*3.'}])assert.throws(()=>parseHint(JSON.stringify({hint:'Controlla il risultato.',focus:'other',...change}),e));
});
test('errore per percorso: consolida prima, piccolo passo solo dopo la correzione',()=>{
  const s=initialState(),e=EXERCISES[0],code='def doppio(numero):\n    print(numero * 2)';rememberDiagnostic(s,e,code,{passed:false,cases:[{passed:false,actual:null,expected:6}],error:''},1);
  assert.match(generationPrompt(s,'python'),/not a harder task/);assert.match(generationPrompt(s,'python'),/missing-return/);assert.ok(!generationPrompt(s,'ml').includes('missing-return'));
  recordAttempt(s,e,{passed:true,code:e.solution,result:{passed:true,cases:e.cases.map(c=>({passed:true,actual:c.expected,expected:c.expected})),error:''}});
  assert.match(generationPrompt(s,'python'),/at most ONE small reasoning step/);assert.equal(levelFor(s,'python'),1);assert.equal(s.xp,25);assert.ok(s.attempts[e.id].lastFailure);
});
test('backup schema 1 conserva indizi e diagnosi; rifiuta nuove strutture danneggiate',()=>{
  const s=initialState(),e=EXERCISES[0];rememberDiagnostic(s,e,e.starter,{passed:false,cases:[],error:'SyntaxError'},1);
  s.attempts[e.id].personalHints=[{text:'Controlla il valore restituito.',focus:'return',codeHash:codeFingerprint(e.starter),day:'2026-10-02'}];
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))).attempts[e.id].personalHints,s.attempts[e.id].personalHints);
  for(const change of [{lastRun:null},{lastRunAt:'ieri'},{personalHints:[{text:'non valido'}]},{personalHints:Array(4).fill(s.attempts[e.id].personalHints[0])}]){const copy=structuredClone(s);Object.assign(copy.attempts[e.id],change);assert.throws(()=>validateState(copy));}
});
test('bridge dedicato agli indizi, timeout breve e nessun fallback alla grammatica esercizi',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let hints=0;
  const {tutor,requests}=bridge(t,{generateHint:()=>{hints++;}});const response=tutor.generate('s','p',{kind:'hint'}),rejected=assert.rejects(response,/Tempo massimo/);
  assert.equal(hints,1);assert.equal(requests.length,0);t.mock.timers.tick(75000);await rejected;assert.equal(tutor.measurements.at(-1).kind,'hint');
});
test('APK vecchio: indizio indisponibile, nessuna richiesta esercizio involontaria',async t=>{
  const {tutor,requests}=bridge(t);await assert.rejects(tutor.generate('s','p',{kind:'hint'}),/Aggiorna/);assert.equal(requests.length,0);assert.equal(tutor.pending,null);
});
test('metriche limitate, senza prompt/codice, mediana dei soli cicli accettati',async t=>{
  const {tutor,requests}=bridge(t);const response=tutor.generate('s','p');tutor.handle({type:'generation',id:requests[0][0],text:'risposta',metrics:{promptTokens:30,outputTokens:10,decodeMs:200,code:'segreto',prompt:'segreto'}});await response;
  assert.equal(tutor.measurements[0].code,undefined);assert.equal(tutor.measurements[0].prompt,undefined);
  for(let i=0;i<50;i++)tutor.recordMeasurement({kind:'cycle',model:'simulato',status:i%2?'accepted':'rejected',elapsedMs:i*10});assert.equal(tutor.measurements.length,40);
  const summary=metricSummary([{kind:'cycle',status:'accepted',elapsedMs:10},{kind:'cycle',status:'rejected',elapsedMs:500},{kind:'hint',status:'completed',elapsedMs:5},{kind:'cycle',status:'accepted',elapsedMs:30}]);assert.deepEqual(summary,{cycles:3,accepted:2,medianMs:20});
  assert.equal(measurement({kind:'hint',status:'completed',elapsedMs:NaN,decodeMs:-1,solution:'segreto'}).decodeMs,undefined);
});
