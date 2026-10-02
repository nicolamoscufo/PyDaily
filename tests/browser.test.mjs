import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const webRoot=new URL('../app/src/main/assets/web/',import.meta.url);
const server=createServer((req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';const bytes=readFileSync(new URL(name,webRoot));const ext=name.split('.').at(-1);res.setHeader('Content-Type',({js:'text/javascript',mjs:'text/javascript',wasm:'application/wasm',css:'text/css',html:'text/html',json:'application/json',svg:'image/svg+xml',woff2:'font/woff2',ttf:'font/ttf'})[ext]||'application/octet-stream');res.end(bytes);}catch{res.statusCode=404;res.end();}});
const require=createRequire(import.meta.url);
let playwright;
try { playwright=require('playwright'); }
catch(error) {
 if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw new Error('Installa le dipendenze con npm install prima dei test browser.',{cause:error});
 playwright=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
}
const {chromium}=playwright;
const browser=await chromium.launch({
 ...(process.env.PYDAILY_BROWSER_EXECUTABLE?{executablePath:process.env.PYDAILY_BROWSER_EXECUTABLE}:{}),
 args:['--no-sandbox']
});
try {
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
await page.goto(origin);
await page.getByRole('button',{name:'Cominciamo'}).click();
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
await page.screenshot({path:fileURLToPath(new URL('../artifacts/PyDaily-anteprima.png',import.meta.url)),fullPage:false});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.getByRole('button',{name:'Inizia la sfida'}).click();
await page.locator('#code-editor').fill('def doppio(numero):\n    print(numero * 2)');
await page.getByRole('button',{name:'Verifica la soluzione'}).click();
await page.getByText('La funzione restituisce None.').waitFor({timeout:45000});
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pydaily-v1')).xp),0);
await page.locator('#code-editor').fill('def doppio(numero):\n    return numero * 2');
await page.getByRole('button',{name:'Dammi un tip'}).click();
assert.equal(await page.locator('#hint-panel .hint').count(),1);
await page.getByRole('button',{name:'Verifica la soluzione'}).click();
await page.getByText('Tutti i test superati.').waitFor();
await page.getByRole('button',{name:'Prossimo problema'}).click();
await page.locator('#code-editor').fill('def somma_lista(valori):\n    return sum(valori)');
await page.getByRole('button',{name:'Verifica la soluzione'}).click();
await page.getByText('Un passo avanti, un livello in più!').waitFor();
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pydaily-v1')).xp),50);
await page.getByRole('button',{name:'Prossimo problema'}).click();
const hintExercise=await page.locator('[data-action="solution"]').evaluate(()=>JSON.parse(localStorage.getItem('pydaily-v1')).solved);
const beforeHints=await page.locator('#code-editor').evaluate(el=>{
 el.value=el.value+'\n'+Array.from({length:45},(_,i)=>'# bozza '+i+' '.repeat(80)+'fine').join('\n');el.dispatchEvent(new Event('input'));
 el.setSelectionRange(12,19,'backward');el.scrollTop=95;el.scrollLeft=45;window.hintEditor=el;
 return {code:el.value,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection,top:el.scrollTop,left:el.scrollLeft};
});
await page.locator('[data-action="hint"]').evaluate(el=>el.click());
await page.getByText('SUGGERIMENTO 1 DI 2').waitFor();
const firstTip=await page.locator('#hint-panel .hint p').innerText();
await page.locator('[data-action="hint"]').evaluate(el=>el.click());
await page.getByText('SUGGERIMENTO 2 DI 2').waitFor();
assert.equal(await page.locator('#hint-panel .hint').count(),2);
assert.equal(await page.locator('#hint-panel .hint p').first().innerText(),firstTip);
await page.getByRole('button',{name:'Rileggi i suggerimenti'}).evaluate(el=>el.click());
assert.equal(await page.locator('#code-editor').evaluate(el=>el===window.hintEditor),true);
assert.deepEqual(await page.locator('#code-editor').evaluate(el=>({code:el.value,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection,top:el.scrollTop,left:el.scrollLeft})),beforeHints);
assert.equal(await page.getByRole('dialog').count(),0);
assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('pydaily-v1')).solved),hintExercise);
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pydaily-v1')).xp),50);
const hintedId=await page.evaluate(()=>Object.entries(JSON.parse(localStorage.getItem('pydaily-v1')).attempts).find(([,a])=>a.tipsUnlocked===2)[0]);
assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('pydaily-v1')).attempts[id].revealedDay,hintedId),undefined);
await page.locator('[data-action="back-track"]').click();
await page.locator(`[data-action="exercise"][data-id="${hintedId}"]`).first().click();
assert.equal(await page.locator('#hint-panel .hint').count(),2);
assert.equal(await page.locator('#code-editor').inputValue(),beforeHints.code);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.getByRole('button',{name:'Mostra la soluzione'}).click();
await page.getByRole('button',{name:'Inserisci nell’editor'}).click();
await page.getByRole('button',{name:'Verifica la soluzione'}).click();
await page.getByText('Soluzione guidata salvata.').waitFor();
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pydaily-v1')).xp),58);
await page.reload();
await page.getByRole('button',{name:'Percorsi',exact:true}).click();
await page.locator('[data-action="track"][data-track="python"]').click();
await page.locator(`[data-action="exercise"][data-id="${hintedId}"]`).first().click();
assert.equal(await page.locator('#hint-panel .hint').count(),2);
await page.getByRole('button',{name:'Studio',exact:true}).click();
await page.locator('#lesson-search').fill('Q-learning');
assert.equal(await page.locator('.lesson-card').count(),1);
await page.locator('.lesson-card').click();
await page.getByRole('button',{name:'B 4',exact:true}).click();
await page.getByText('Il prossimo ripasso è programmato.').waitFor();
await page.getByRole('button',{name:'Chiudi la lezione'}).click();
await page.getByRole('button',{name:'Percorsi',exact:true}).click();
await page.getByRole('button',{name:'Dati & NumPy Le basi',exact:false}).count();
await page.locator('[data-action="track"][data-track="data"]').click();
await page.locator('[data-action="exercise"][data-id="data-scala_array"]').click();
await page.locator('#code-editor').fill('def scala_array(valori, fattore):\n    import numpy as np\n    return (np.array(valori) * fattore).tolist()');
await page.getByRole('button',{name:'Verifica la soluzione'}).click();
await page.getByText('Tutti i test superati.').waitFor({timeout:45000});
await page.screenshot({path:fileURLToPath(new URL('../artifacts/PyDaily-editor.png',import.meta.url)),fullPage:true});
await page.locator('#code-editor').fill('def scala_array(valori, fattore):\n    while True:\n        pass');
await page.getByRole('button',{name:'Verifica la soluzione'}).click();
await page.getByText('Tempo scaduto (4 secondi).').waitFor({timeout:12000});
assert.equal(errors.length,0,errors.join('\n'));
console.log('MOBILE_OK: esecuzione reale, errori, livelli, soluzione guidata, ripasso, NumPy, timeout, persistenza, layout.');

// Controlli AST e ritorni verificati nel motore Python reale, non con stub.
const strictResults=await page.evaluate(async()=>{
 const {PythonRunner}=await import('./runner.js');const r=new PythonRunner();
 try{
  const cases=[{args:[1],expected:3},{args:[0],expected:0},{args:[-2],expected:-6},{args:[4],expected:12}];
  const run=code=>r.run({code,function:'triplica',params:['x'],cases,validateGenerated:true});
  const results=[];
  for(const code of ['def triplica(y):\n    return y*3','def triplica(x=1):\n    return x*3','def triplica(*args):\n    return args[0]*3','def triplica(x):\n    return lambda: x*3','def triplica(x):\n    return float("inf")','def triplica(x):\n    import random\n    return random.random()','def triplica(x):\n    from numpy.random import rand\n    return rand()','async def triplica(x):\n    return x*3'])results.push(await run(code));
  results.push(await run('def triplica(x):\n    import numpy as np\n    return np.array(x*3).tolist()'));
  return results;
 }finally{r.worker.terminate();clearTimeout(r.bootTimer);}
});
assert.ok(strictResults.slice(0,-1).every(r=>!r.passed&&r.error));
assert.equal(strictResults.at(-1).passed,true);
console.log('PYTHON_VALIDATION_OK: firme AST, closure, non finiti, random e async rifiutati; NumPy eseguito.');
const qualityResults=await page.evaluate(async()=>{
 const {PythonRunner}=await import('./runner.js'),{parseExercise,verifyGeneratedExercise}=await import('./tutor.js'),{initialState}=await import('./core.js');
 const r=new PythonRunner();
 try{
  const results=[];
  for(const identity of [false,true]){
   const d={title:identity?'Eco di un intero':'Triplo non memorizzato',description:identity?'x è un intero. Restituisci x invariato, anche per zero e negativi.':'x è un intero. Restituisci il triplo di x, anche per zero e negativi.',function:'calcolo',params:['x'],solution:identity?'def calcolo(x):\n    return x':'def calcolo(x):\n    return {1:3,0:0,-2:-6,4:12}.get(x,0)',cases:[1,0,-2,4].map(x=>({args:[x],expected:identity?x:3*x})),tips:['Usa i parametri.','Usa return.'],study:'Una funzione restituisce un valore.'};
   const reference={...d,solution:identity?'def calcolo(x):\n    return x':'def calcolo(x):\n    return x*3',cases:[2,3,-5,11].map(x=>({args:[x],expected:identity?x:3*x}))};
   const e=parseExercise(JSON.stringify(d),initialState(),'python');
   try{await verifyGeneratedExercise(e,r,{generate:async()=>JSON.stringify(reference)});results.push({error:'',cases:e.cases.length});}
   catch(error){results.push({error:error.message,cases:e.cases.length});}
  }
  return results;
 }finally{r.worker.terminate();clearTimeout(r.bootTimer);}
});
assert.match(qualityResults[0].error,/nuovi casi/);
assert.match(qualityResults[1].error,/Test troppo deboli/);
assert.ok(qualityResults.every(r=>r.cases===4));
console.log('QUALITY_OK: soluzione che memorizza i test e test banali scartati con Python reale.');

// Verifica anche il flusso del tutor nativo, con un bridge controllato.
const aiContext=await browser.newContext({viewport:{width:1200,height:900}});
await aiContext.addInitScript(()=>{
 window.Native={modelStatus:()=>JSON.stringify({available:true,model:'Qwen2.5-Coder 3B',ramGB:8,busy:false}),modelAction:()=>{},cancelGeneration:()=>{},generateExercise:(id,system,prompt)=>{
   window.testGenerationPrompts ||= [];window.testGenerationPrompts.push(prompt);
   const reviewing=prompt.startsWith('REVISIONE INDIPENDENTE');
   if(!reviewing)window.testCandidates=(window.testCandidates||0)+1;
   const data={title:'Somma gli estremi',description:'valori è una lista di interi. Restituisci il primo valore più l’ultimo. Per la lista vuota restituisci 0; per un solo elemento restituisci il suo doppio.',function:'somma_estremi',params:['valori'],solution:'def somma_estremi(valori):\n    return valori[0]+valori[-1] if valori else 0',cases:[{args:[[2,3,5]],expected:7},{args:[[]],expected:0},{args:[[-2,4]],expected:2},{args:[[3]],expected:6}],tips:['Guarda le posizioni iniziale e finale.','Gestisci prima la lista vuota.'],study:'Gli indici individuano una posizione. -1 è l’ultimo elemento.'};
   // Prima proposta: soluzione e expected concordano, ma contraddicono il testo.
   if(window.testCandidates===1&&!reviewing){data.solution='def somma_estremi(valori):\n    return sum(valori)';data.cases[0].expected=10;data.cases[3].expected=3;}
   if(window.testCandidates>=3)Object.assign(data,{title:'Massimo in coppia',description:'a e b sono interi. Restituisci il maggiore tra a e b, anche quando sono uguali.',function:'max_coppia',params:['a','b'],solution:'def max_coppia(a, b):\n    return a if a >= b else b',cases:[{args:[2,3],expected:3},{args:[-1,-4],expected:-1},{args:[0,0],expected:0},{args:[5,2],expected:5}]});
   if(reviewing)data.cases=data.function==='somma_estremi'?[{args:[[5,1,9]],expected:14},{args:[[-5,9,2]],expected:-3},{args:[[0,4,8,0]],expected:0},{args:[[7]],expected:14}]:[{args:[9,1],expected:9},{args:[-9,-2],expected:-2},{args:[7,7],expected:7},{args:[-2,4],expected:4}];
  setTimeout(()=>window.PyDailyNative.onEvent({type:'generation',id,text:JSON.stringify(data)}),40);
 }};
});
const aiPage=await aiContext.newPage();
await aiPage.goto(origin);
await aiPage.getByRole('button',{name:'Cominciamo'}).click();
await aiPage.getByRole('button',{name:'Genera una sfida'}).click();
await aiPage.getByRole('heading',{name:'Somma gli estremi',exact:true}).waitFor({timeout:45000});
assert.equal(await aiPage.evaluate(()=>window.testGenerationPrompts.length),4);
assert.match(await aiPage.evaluate(()=>window.testGenerationPrompts[2]),/Previous attempt was invalid:.*revisione indipendente/);
assert.equal(await aiPage.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('pydaily-v1')).generated).length),1);
assert.equal(await aiPage.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('pydaily-v1')).generated)[0].cases.length),8);
await aiPage.locator('#code-editor').fill('def somma_estremi(valori):\n    return valori[0]+valori[-1] if valori else 0');
await aiPage.locator('#code-editor').evaluate(el=>{window.desktopEditor=el;el.setSelectionRange(8,15);});
await aiPage.locator('[data-action="hint"]').evaluate(el=>el.click());
await aiPage.locator('[data-action="hint"]').evaluate(el=>el.click());
assert.equal(await aiPage.locator('#hint-panel .hint').count(),2);
assert.deepEqual(await aiPage.locator('#code-editor').evaluate(el=>({sameNode:el===window.desktopEditor,start:el.selectionStart,end:el.selectionEnd})),{sameNode:true,start:8,end:15});
await aiPage.getByRole('button',{name:'Verifica la soluzione'}).click();
await aiPage.getByText('Tutti i test superati.').waitFor();
await aiPage.screenshot({path:fileURLToPath(new URL('../artifacts/PyDaily-tutor.png',import.meta.url)),fullPage:true});
await aiPage.getByRole('button',{name:'Prossimo problema'}).click();
await aiPage.getByRole('heading',{name:'Massimo in coppia',exact:true}).waitFor();
assert.equal(await aiPage.evaluate(()=>window.testGenerationPrompts.length),6);
assert.match(await aiPage.evaluate(()=>window.testGenerationPrompts[4]),/independently solved: 1/);
await aiPage.locator('#code-editor').fill('def max_coppia(a, b):\n    return max(a, b)');
await aiPage.getByRole('button',{name:'Verifica la soluzione'}).click();
await aiPage.getByText('Un passo avanti, un livello in più!').waitFor();
await aiPage.getByRole('button',{name:'Prossimo problema'}).click();
await aiPage.locator('#toast').getByText('Il tutor non ha prodotto una sfida valida.',{exact:false}).waitFor();
assert.equal(await aiPage.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('pydaily-v1')).generated).length),2);
assert.match(await aiPage.evaluate(()=>window.testGenerationPrompts[6]),/Learner level: 2/);
assert.equal(await aiPage.evaluate(()=>window.testCandidates),5);
console.log('AI_FLOW_OK: incoerenza semantica rifiutata con Python reale, revisione cieca, secondo tentativo, test incrociati, progressione e ripetizioni.');
const diagnosticsBeforeCancel=await aiPage.evaluate(()=>window.PyDailyNative.diagnostics());
assert.equal(diagnosticsBeforeCancel.length,3);
await aiPage.evaluate(()=>{
 window.Native.cancelGeneration=()=>{window.testCancelCalled=true;};
 window.Native.generateExercise=(id,system,prompt)=>{
  if(prompt.startsWith('REVISIONE INDIPENDENTE')){window.lateReview={type:'generation',id,text:'null'};return;}
  const data={title:'Valore traslato',description:'x è un intero. Restituisci x più 7, anche per zero e negativi.',function:'traslato',params:['x'],solution:'def traslato(x):\n    return x+7',cases:[1,0,-2,4].map(x=>({args:[x],expected:x+7})),tips:['Pensa a una somma.','Usa return.'],study:'Una funzione trasforma un valore.'};
  setTimeout(()=>window.PyDailyNative.onEvent({type:'generation',id,text:JSON.stringify(data)}),40);
 };
});
await aiPage.getByRole('button',{name:'Oggi',exact:true}).click();
await aiPage.getByRole('button',{name:'Genera una sfida'}).click();
await aiPage.getByRole('heading',{name:'Il tutor rilegge la consegna'}).waitFor();
await aiPage.getByRole('button',{name:'Annulla',exact:true}).click();
await aiPage.locator('#toast').getByText('Generazione interrotta.',{exact:true}).waitFor();
assert.equal(await aiPage.evaluate(()=>window.testCancelCalled),true);
await aiPage.evaluate(()=>window.PyDailyNative.onEvent(window.lateReview));
assert.equal(await aiPage.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('pydaily-v1')).generated).length),2);
assert.deepEqual(await aiPage.evaluate(()=>window.PyDailyNative.diagnostics()),diagnosticsBeforeCancel);
assert.equal(await aiPage.locator('.generation-card').count(),0);
console.log('CANCEL_OK: annullamento durante la revisione, risposta tardiva ignorata, banca e diagnostica invariate.');

// Generazione dal Profilo: avanzamento/annullamento presenti in ogni schermata.
await aiPage.evaluate(()=>{
 window.Native.generateExercise=(id)=>{window.progressRequest=id;window.progressCalls=(window.progressCalls||0)+1;};
});
await aiPage.getByRole('button',{name:'Profilo',exact:true}).click();
await aiPage.getByRole('button',{name:'Genera',exact:true}).click();
assert.equal(await aiPage.locator('[data-generation-status]').count(),1);
assert.match(await aiPage.locator('[data-generation-status]').innerText(),/Non è ancora una sfida pronta/);
await aiPage.evaluate(()=>PyDailyNative.onEvent({type:'generation-progress',id:progressRequest,phase:'tokens',tokens:123,elapsedMs:8500}));
assert.match(await aiPage.locator('.generation-detail').innerText(),/123 token/);
await aiPage.evaluate(()=>PyDailyNative.onEvent({type:'generation-progress',id:progressRequest,phase:'done',tokens:0,elapsedMs:9000}));
assert.match(await aiPage.locator('.generation-detail').innerText(),/Risposta ricevuta, da verificare/);
assert.equal(await aiPage.locator('.generation-ready').count(),0);
assert.equal(await aiPage.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('pydaily-v1')).generated).length),2);
await aiPage.getByRole('button',{name:'Studio',exact:true}).click();
assert.equal(await aiPage.locator('[data-generation-status]').count(),1);
await aiPage.getByRole('button',{name:'Annulla',exact:true}).click();
assert.equal(await aiPage.locator('[data-generation-status]').count(),0);
await aiPage.getByRole('button',{name:'Profilo',exact:true}).click();
await aiPage.getByRole('button',{name:'Genera',exact:true}).click();
await aiPage.evaluate(()=>PyDailyNative.onEvent({type:'generation',id:progressRequest,error:'Tempo massimo del tutor raggiunto (3 minuti per richiesta).'}));
await aiPage.locator('.generation-error').waitFor();
assert.match(await aiPage.locator('.generation-error').innerText(),/Tempo massimo/);
assert.equal(await aiPage.evaluate(()=>progressCalls),2); // Il timeout non fa retry.
await aiPage.getByRole('button',{name:'Cambia modello',exact:true}).click();
await aiPage.getByRole('heading',{name:'Il tuo tutor locale'}).waitFor();
assert.equal(await aiPage.evaluate(()=>progressCalls),2);
await aiPage.getByRole('button',{name:'Oggi',exact:true}).click();
assert.equal(await aiPage.locator('.generation-error').count(),1);
await aiPage.getByRole('button',{name:'Chiudi',exact:true}).click();
assert.equal(await aiPage.locator('.generation-error').count(),0);
assert.equal(await aiPage.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('pydaily-v1')).generated).length),2);
console.log('GENERATION_STATUS_OK: Profilo e Studio, proposta distinta da sfida pronta, cambio modello dopo errore, avanzamento reale, annullamento, errore persistente e nessun retry dopo timeout.');

// Archivio schema 1 e completamento asincrono: nessuna sfida nascosta dietro un dialogo.
const archiveContext=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
await archiveContext.addInitScript(()=>{
 window.archiveStatus={available:true,busy:false,model:'Tutor simulato',ramGB:8};window.archiveMode='valid';window.archiveCalls=[];window.archiveCandidates=0;
 window.Native={
  modelStatus:()=>JSON.stringify(window.archiveStatus),modelAction:()=>{},reminder:()=>{},
  exportProgress:text=>{window.archiveBackup=text;},cancelGeneration:()=>{window.archiveCancelled=true;},
  generateExercise:(id,system,prompt)=>{
   window.archiveCalls.push(prompt);const reviewing=prompt.startsWith('REVISIONE INDIPENDENTE');
   if(!reviewing){const n=7+(++window.archiveCandidates);window.archiveProposal={title:'Traslazione numero '+n,description:`x è un intero. Restituisci x più ${n}, anche per zero e negativi.`,function:'trasla_sfida',params:['x'],solution:`def trasla_sfida(x):\n    return x+${n}`,cases:[1,0,-2,4].map(x=>({args:[x],expected:x+n})),tips:['Pensa alla traslazione.','Controlla lo zero.'],study:'Una funzione trasforma un valore.'};window.archiveOffset=n;}
   const data=reviewing?{...window.archiveProposal,title:'Revisione',cases:[2,3,-5,11].map(x=>({args:[x],expected:x+window.archiveOffset}))}:window.archiveProposal;
   const event={type:'generation',id,text:window.archiveMode==='rejected'?'null':JSON.stringify(data)};
   if(reviewing&&window.archiveMode==='deferred-review'){window.archiveReview=event;return;}
   setTimeout(()=>PyDailyNative.onEvent(event),20);
  }
 };
});
const archivePage=await archiveContext.newPage(),archiveErrors=[];archivePage.on('pageerror',error=>archiveErrors.push(error.message));
await archivePage.goto(origin);await archivePage.getByRole('button',{name:'Cominciamo'}).click();await archivePage.getByRole('button',{name:'Tutor',exact:true}).click();
await archivePage.getByRole('heading',{name:'Sfide del tutor',exact:true}).waitFor();assert.equal(await archivePage.locator('.challenge-row').count(),0);
await archivePage.getByRole('button',{name:'Genera una sfida',exact:true}).click();await archivePage.locator('#code-editor').waitFor({timeout:45000});
assert.equal(await archivePage.getByRole('dialog').count(),0);assert.equal(await archivePage.locator('.generation-ready').count(),0);
const firstChallenge=await archivePage.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('pydaily-v1')).generated)[0]);
const archiveDraft='def trasla_sfida(x):\n    # bozza della prima sfida\n    return x';
await archivePage.locator('#code-editor').fill(archiveDraft);await archivePage.getByRole('button',{name:'Dammi un tip'}).click();await archivePage.locator('[data-action="tutor-library"]').click();
assert.equal(await archivePage.locator('.challenge-row[data-status="in-progress"]').count(),1);
await archivePage.getByRole('button',{name:'Genera una sfida',exact:true}).click();await archivePage.getByRole('heading',{name:'Traslazione numero 9',exact:true}).waitFor();
const secondChallenge=await archivePage.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('pydaily-v1')).generated)[1]);
await archivePage.locator('[data-action="tutor-library"]').click();assert.deepEqual(await archivePage.locator('.challenge-copy small').allTextContents(),['Sfida 1 · livello 1','Sfida 2 · livello 1']);
await archivePage.getByRole('button',{name:'Continua · sfida 1',exact:true}).click();assert.equal(await archivePage.locator('#code-editor').inputValue(),archiveDraft);assert.equal(await archivePage.locator('#hint-panel .hint').count(),1);
await archivePage.locator('#code-editor').fill(firstChallenge.solution);await archivePage.getByRole('button',{name:'Verifica la soluzione'}).click();await archivePage.getByText('Tutti i test superati.').waitFor();
const callsBeforeNext=await archivePage.evaluate(()=>archiveCalls.length);await archivePage.getByRole('button',{name:'Prossimo problema'}).click();await archivePage.getByRole('heading',{name:secondChallenge.title,exact:true}).waitFor();assert.equal(await archivePage.evaluate(()=>archiveCalls.length),callsBeforeNext);
await archivePage.getByRole('button',{name:'Mostra la soluzione'}).click();await archivePage.getByRole('button',{name:'Inserisci nell’editor'}).click();await archivePage.getByRole('button',{name:'Verifica la soluzione'}).click();await archivePage.getByText('Soluzione guidata salvata.').waitFor();
await archivePage.locator('[data-action="tutor-library"]').click();assert.equal(await archivePage.locator('.challenge-row[data-status="solved"]').count(),1);assert.equal(await archivePage.locator('.challenge-row[data-status="guided"]').count(),1);assert.match(await archivePage.locator('.challenge-overview').innerText(),/Livello 1/);
await archivePage.getByRole('button',{name:'Genera una sfida',exact:true}).click();await archivePage.getByRole('heading',{name:'Traslazione numero 10',exact:true}).waitFor();
const thirdChallenge=await archivePage.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('pydaily-v1')).generated)[2]);await archivePage.locator('#code-editor').fill(thirdChallenge.solution);await archivePage.getByRole('button',{name:'Verifica la soluzione'}).click();await archivePage.getByText('Un passo avanti, un livello in più!').waitFor();assert.equal(await archivePage.evaluate(()=>JSON.parse(localStorage.getItem('pydaily-v1')).xp),58);
await archivePage.locator('[data-action="tutor-library"]').click();assert.match(await archivePage.locator('.challenge-overview').innerText(),/Livello 2/);
await archivePage.evaluate(()=>archiveMode='deferred-review');await archivePage.getByRole('button',{name:'Genera una sfida',exact:true}).click();await archivePage.getByRole('heading',{name:'Il tutor rilegge la consegna'}).waitFor();
await archivePage.getByRole('button',{name:'Studio',exact:true}).click();await archivePage.locator('.lesson-card').first().click();await archivePage.evaluate(()=>PyDailyNative.onEvent(archiveReview));await archivePage.locator('.generation-ready').waitFor();
assert.equal(await archivePage.getByRole('dialog').count(),1);assert.equal(await archivePage.locator('#code-editor').count(),0);assert.match(await archivePage.locator('main h1').innerText(),/Fai spazio/);
await archivePage.getByRole('button',{name:'Chiudi la lezione'}).click();await archivePage.getByRole('button',{name:'Apri la sfida',exact:true}).click();await archivePage.getByRole('heading',{name:'Traslazione numero 11',exact:true}).waitFor();assert.equal(await archivePage.getByRole('dialog').count(),0);
// Se la risposta arriva mentre scrivi un'altra sfida, resta disponibile senza toccare l'editor.
await archivePage.locator('[data-action="tutor-library"]').click();await archivePage.getByRole('button',{name:'Genera una sfida',exact:true}).click();await archivePage.getByRole('heading',{name:'Il tutor rilegge la consegna'}).waitFor();
await archivePage.getByRole('button',{name:'Tutor',exact:true}).click();await archivePage.locator(`.challenge-row[data-id="${firstChallenge.id}"]`).click();
const concurrentDraft=firstChallenge.solution+'\n# bozza durante la generazione';await archivePage.locator('#code-editor').fill(concurrentDraft);
const editorWhileGenerating=await archivePage.locator('#code-editor').evaluate(el=>{window.archiveEditor=el;el.setSelectionRange(7,13,'backward');return {value:el.value,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection};});
await archivePage.evaluate(()=>PyDailyNative.onEvent(archiveReview));await archivePage.locator('.generation-ready').waitFor();assert.equal(await archivePage.locator('#code-editor').evaluate(el=>el===window.archiveEditor),true);
assert.deepEqual(await archivePage.locator('#code-editor').evaluate(el=>({value:el.value,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection})),editorWhileGenerating);assert.equal(await archivePage.getByRole('button',{name:'Verifica la soluzione'}).isEnabled(),true);
assert.equal(await archivePage.locator('main h1').innerText(),firstChallenge.title);assert.equal(await archivePage.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('pydaily-v1')).generated).length),5);
await archivePage.getByRole('button',{name:'Apri la sfida',exact:true}).click();await archivePage.getByRole('heading',{name:'Traslazione numero 12',exact:true}).waitFor();await archivePage.locator('[data-action="tutor-library"]').click();
// Nessun numero o progresso inventato dopo una proposta rifiutata o annullata.
await archivePage.evaluate(()=>archiveMode='rejected');await archivePage.getByRole('button',{name:'Genera una sfida',exact:true}).click();await archivePage.locator('.generation-error').waitFor();assert.match(await archivePage.locator('.generation-error').innerText(),/Nessuna nuova sfida è stata salvata/);assert.equal(await archivePage.locator('.challenge-row').count(),5);
await archivePage.getByRole('button',{name:'Chiudi',exact:true}).click();await archivePage.evaluate(()=>archiveMode='deferred-review');await archivePage.getByRole('button',{name:'Genera una sfida',exact:true}).click();await archivePage.getByRole('heading',{name:'Il tutor rilegge la consegna'}).waitFor();
await archivePage.getByRole('button',{name:'Annulla',exact:true}).click();await archivePage.evaluate(()=>PyDailyNative.onEvent(archiveReview));assert.equal(await archivePage.locator('.generation-ready').count(),0);assert.equal(await archivePage.locator('.challenge-row').count(),5);
await archivePage.locator('[data-action="tutor-filter"][data-track="data"]').click();assert.equal(await archivePage.locator('.challenge-row').count(),0);await archivePage.evaluate(()=>archiveMode='valid');await archivePage.getByRole('button',{name:'Genera una sfida',exact:true}).click();await archivePage.locator('#code-editor').waitFor();
await archivePage.locator('[data-action="tutor-library"]').click();assert.deepEqual(await archivePage.locator('.challenge-copy small').allTextContents(),['Sfida 1 · livello 1']);await archivePage.locator('[data-action="tutor-filter"][data-track="all"]').click();assert.equal(await archivePage.locator('.challenge-track').count(),2);assert.equal(await archivePage.locator('.challenge-row').count(),6);
const progressBeforeArchive=await archivePage.evaluate(()=>localStorage.getItem('pydaily-v1'));
await archivePage.evaluate(()=>{archiveStatus.available=false;PyDailyNative.onEvent({type:'model-status',...archiveStatus});});await archivePage.reload();await archivePage.getByRole('button',{name:'Tutor',exact:true}).click();assert.equal(await archivePage.locator('.challenge-row').count(),6);assert.equal(await archivePage.evaluate(()=>localStorage.getItem('pydaily-v1')),progressBeforeArchive);
for(const mode of ['light','dark']){
 await archivePage.evaluate(mode=>PyDailyTheme.setPreference(mode),mode);
 for(const width of [320,393,1200]){await archivePage.setViewportSize({width,height:852});assert.equal(await archivePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await assertContrast(archivePage,[['.challenge-copy h3','.challenge-row'],['.challenge-copy small','.challenge-row'],['.challenge-row .tag','.challenge-row .tag'],['.challenge-overview p','.challenge-overview']]);}
}
await archivePage.setViewportSize({width:393,height:852});await archivePage.screenshot({path:fileURLToPath(new URL('../artifacts/PyDaily-sfide-tutor.png',import.meta.url)),fullPage:true});
await archivePage.locator(`.challenge-row[data-id="${firstChallenge.id}"]`).click();assert.equal(await archivePage.locator('#code-editor').inputValue(),concurrentDraft);assert.equal(await archivePage.locator('#hint-panel .hint').count(),1);assert.equal(await archivePage.evaluate(()=>PyDailyBack()),true);await archivePage.getByRole('heading',{name:'Sfide del tutor',exact:true}).waitFor();
await archivePage.getByRole('button',{name:'Profilo',exact:true}).click();await archivePage.getByRole('button',{name:'Esporta progressi'}).click();await archivePage.evaluate(()=>dispatchEvent(new CustomEvent('pydaily-import',{detail:archiveBackup})));await archivePage.getByRole('button',{name:'Importa questi progressi'}).click();await archivePage.getByRole('button',{name:'Tutor',exact:true}).click();assert.equal(await archivePage.locator('.challenge-row').count(),6);
const archiveRestored=await archivePage.evaluate(()=>JSON.parse(localStorage.getItem('pydaily-v1'))),archiveOriginal=JSON.parse(progressBeforeArchive);for(const key of ['generated','solved','drafts','attempts','daily','review'])assert.deepEqual(archiveRestored[key],archiveOriginal[key]);assert.equal(archiveRestored.xp,58);assert.equal(archiveRestored.schema,1);
assert.equal(archiveErrors.length,0,archiveErrors.join('\n'));
console.log('TUTOR_LIBRARY_OK: apertura immediata o esplicita, lezione/editor preservati, sequenza per percorso, ripresa/next senza inferenza superflua, autonome/guidate/livelli, rifiuti/annullamento, offline/backup schema 1 e layout/contrasto 320/393/1200 px.');

// Indizi: bridge simulato, risultati Python reali, nessuna soluzione di riferimento nel prompt.
const hintContext=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
await hintContext.addInitScript(()=>{
 window.hintStatus={available:true,busy:false,model:'Qwen3 simulato',ramGB:8,activeId:'qwen3-06',installed:['qwen3-06'],fairConsent:false};window.hintMode='valid';window.hintInputs=[];window.modelActions=[];window.adaptedPrompts=[];
 window.Native={
  modelStatus:()=>JSON.stringify(window.hintStatus),
  modelAction:action=>{window.modelActions.push(action);if(action==='accept-fair-license')window.hintStatus.fairConsent=true;},
  exportProgress:text=>{window.exportedMetrics=JSON.parse(text);},
  cancelGeneration:()=>{window.hintCancelled=true;window.hintStatus.busy=false;setTimeout(()=>PyDailyNative.onEvent({type:'model-status',...window.hintStatus}),0);},
  generateHint:(id,system,prompt)=>{
   window.hintStatus.busy=true;window.hintInputs.push({system,data:JSON.parse(prompt.slice(prompt.indexOf('{')))});
   const text=window.hintMode==='leak'?JSON.stringify({hint:'def doppio(numero):\n    return numero * 2',focus:'return'}):JSON.stringify({hint:'Il calcolo viene mostrato, ma cosa riceve chi chiama la funzione?',focus:'return'});
   const event={type:'generation',id,text,metrics:{promptTokens:100,outputTokens:25,decodeTokens:24,decodeMs:200,peakProcessRssMiB:200}};
   if(window.hintMode==='deferred'){window.lateHint=event;return;}
   if(window.hintMode==='timeout'){delete event.text;event.error='Tempo massimo del tutor raggiunto.';}
   setTimeout(()=>{window.hintStatus.busy=false;PyDailyNative.onEvent(event);},20);
  },
  generateExercise:(id,system,prompt)=>{
   window.adaptedPrompts.push(prompt);const reviewing=prompt.startsWith('REVISIONE INDIPENDENTE');
   const data={title:'Trasla di cinque',description:'x è un intero. Restituisci x più cinque, anche per zero e negativi.',function:'sposta_cinque',params:['x'],solution:'def sposta_cinque(x):\n    return x+5',cases:(reviewing?[-2,3,9,12]:[-1,0,2,5]).map(x=>({args:[x],expected:x+5})),tips:['Ragiona su una traslazione.','Controlla lo zero.'],study:'Una funzione trasforma un valore.'};
   setTimeout(()=>PyDailyNative.onEvent({type:'generation',id,text:JSON.stringify(data)}),20);
  }
 };
});
const hintPage=await hintContext.newPage(),hintErrors=[];hintPage.on('pageerror',e=>hintErrors.push(e.message));
await hintPage.goto(origin);await hintPage.getByRole('button',{name:'Cominciamo'}).click();await hintPage.getByRole('button',{name:'Inizia la sfida'}).click();
const hintCode='def doppio(numero):\n    print(numero * 2)\n'+Array.from({length:40},(_,i)=>'# bozza '+i+' '.repeat(70)+'fine').join('\n');
await hintPage.locator('#code-editor').fill(hintCode);await hintPage.locator('[data-action="hint"]').evaluate(el=>el.click());
const personalBefore=await hintPage.locator('#code-editor').evaluate(el=>{window.personalEditor=el;el.setSelectionRange(12,19,'backward');el.scrollTop=95;el.scrollLeft=40;return {value:el.value,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection,top:el.scrollTop,left:el.scrollLeft};});
await hintPage.locator('[data-action="personal-hint"]').evaluate(el=>el.click());await hintPage.locator('.personal-hint').waitFor({timeout:45000});
assert.equal(await hintPage.locator('#code-editor').evaluate(el=>el===window.personalEditor),true);
assert.deepEqual(await hintPage.locator('#code-editor').evaluate(el=>({value:el.value,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection,top:el.scrollTop,left:el.scrollLeft})),personalBefore);
assert.equal(await hintPage.locator('#hint-panel .hint').count(),1);assert.equal(await hintPage.getByRole('dialog').count(),0);
const hintInput=await hintPage.evaluate(()=>window.hintInputs[0].data);assert.equal(hintInput.python.kind,'missing-return');assert.equal(hintInput.python.failedCase.actual,null);assert.ok(hintInput.python.output);assert.equal(hintInput.solution,undefined);assert.equal(hintInput.codeTruncated,true);
const personalSaved=await hintPage.evaluate(()=>JSON.parse(localStorage.getItem('pydaily-v1')));assert.equal(personalSaved.xp,0);assert.equal(Object.keys(personalSaved.solved).length,0);assert.equal(personalSaved.attempts['python-doppio'].count,0);assert.equal(personalSaved.attempts['python-doppio'].revealedDay,undefined);
await hintPage.locator('[data-action="back-track"]').click();await hintPage.locator('[data-action="exercise"][data-id="python-doppio"]').first().click();assert.equal(await hintPage.locator('.personal-hint').count(),1);
await hintPage.reload();await hintPage.getByRole('button',{name:'Inizia la sfida'}).click();assert.equal(await hintPage.locator('.personal-hint').count(),1);
await hintPage.evaluate(()=>window.hintMode='leak');await hintPage.locator('[data-action="personal-hint"]').evaluate(el=>el.click());await hintPage.getByText('Risposta scartata: contiene codice',{exact:false}).waitFor();assert.equal(await hintPage.locator('.personal-hint').count(),1);assert.equal(await hintPage.getByRole('dialog').count(),0);
await hintPage.evaluate(()=>window.hintMode='deferred');await hintPage.locator('[data-action="personal-hint"]').evaluate(el=>el.click());await hintPage.waitForFunction(()=>window.hintInputs.length===2);
await hintPage.locator('#code-editor').fill(hintCode+'\n# nuova bozza');await hintPage.evaluate(()=>{window.hintStatus.busy=false;PyDailyNative.onEvent(window.lateHint);});await hintPage.locator('[data-action="personal-hint"]').waitFor();assert.equal(await hintPage.locator('.personal-hint').count(),1);assert.match(await hintPage.locator('#code-editor').inputValue(),/nuova bozza/);
await hintPage.locator('[data-action="personal-hint"]').evaluate(el=>el.click());await hintPage.waitForFunction(()=>window.hintInputs.length===3);await hintPage.locator('[data-action="back-track"]').click();assert.equal(await hintPage.evaluate(()=>window.hintCancelled),true);await hintPage.evaluate(()=>PyDailyNative.onEvent(window.lateHint));await hintPage.locator('[data-action="exercise"][data-id="python-doppio"]').first().click();assert.equal(await hintPage.locator('.personal-hint').count(),1);
await hintPage.evaluate(()=>window.hintMode='timeout');await hintPage.locator('[data-action="personal-hint"]').evaluate(el=>el.click());await hintPage.getByText('Tempo massimo del tutor raggiunto.',{exact:true}).waitFor();assert.equal(await hintPage.evaluate(()=>window.hintInputs.length),4);
await hintPage.locator('#code-editor').fill('def doppio(numero):\n    return numero * 2');await hintPage.getByRole('button',{name:'Verifica la soluzione'}).click();await hintPage.getByText('Tutti i test superati.').waitFor();assert.equal(await hintPage.evaluate(()=>JSON.parse(localStorage.getItem('pydaily-v1')).xp),25);
await hintPage.getByRole('button',{name:'Oggi',exact:true}).click();await hintPage.getByRole('button',{name:'Genera una sfida'}).click();await hintPage.getByRole('heading',{name:'Trasla di cinque'}).waitFor();
const adapted=await hintPage.evaluate(()=>window.adaptedPrompts[0]);assert.match(adapted,/missing-return/);assert.match(adapted,/"corrected":true/);assert.match(adapted,/at most ONE small reasoning step/);assert.match(adapted,/Learner level: 1/);
await hintPage.getByRole('button',{name:'Profilo',exact:true}).click();await hintPage.getByRole('heading',{name:'MobileLLM-R1.5-950M · Q4_K_M',exact:true}).waitFor();assert.equal(await hintPage.locator('.model-choice').count(),6);
for(const width of [320,393,1200]){await hintPage.setViewportSize({width,height:852});assert.equal(await hintPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
const progressBeforeModel=await hintPage.evaluate(()=>localStorage.getItem('pydaily-v1'));
await hintPage.locator('[data-model-action="download:mobile-r15"]').click();await hintPage.getByRole('dialog').waitFor();assert.deepEqual(await hintPage.evaluate(()=>window.modelActions),[]);
await hintPage.getByRole('button',{name:'Accetta e scarica',exact:true}).click();assert.deepEqual(await hintPage.evaluate(()=>window.modelActions),[]);
await hintPage.locator('#fair-consent').check();await hintPage.getByRole('button',{name:'Accetta e scarica',exact:true}).click();assert.deepEqual(await hintPage.evaluate(()=>window.modelActions),['accept-fair-license','download:mobile-r15']);assert.equal(await hintPage.evaluate(()=>localStorage.getItem('pydaily-v1')),progressBeforeModel);
await hintPage.evaluate(()=>{window.hintStatus.installed=['qwen3-06','coder1'];window.hintStatus.partial=['qwen3-17'];PyDailyNative.onEvent({type:'model-status',...window.hintStatus});});
assert.equal(await hintPage.locator('[data-model-action="download:coder1"]').innerText(),'Usa');assert.equal(await hintPage.locator('[data-model-action="download:qwen3-17"]').innerText(),'Riprendi');
await hintPage.locator('[data-model-action="download:coder1"]').click();await hintPage.locator('[data-action="remove-cached-model"][data-model-id="qwen3-17"]').click();await hintPage.locator('[data-action="confirm-remove-cached"]').click();
assert.deepEqual(await hintPage.evaluate(()=>window.modelActions.slice(-2)),['download:coder1','remove:qwen3-17']);assert.equal(await hintPage.evaluate(()=>localStorage.getItem('pydaily-v1')),progressBeforeModel);
await hintPage.getByRole('button',{name:'Esporta misure',exact:true}).click();const metricsExport=await hintPage.evaluate(()=>window.exportedMetrics);assert.equal(metricsExport.format,'pydaily-tutor-metrics-v1');assert.ok(metricsExport.measurements.some(m=>m.kind==='cycle'&&m.status==='accepted'));assert.ok(!JSON.stringify(metricsExport).includes('submittedCode'));assert.ok(!JSON.stringify(metricsExport).includes(hintCode));
// Timeout Python reale analizzato dal tutor; annullamento anche prima dell'inferenza.
await hintPage.getByRole('button',{name:'Percorsi',exact:true}).click();await hintPage.locator('[data-action="track"][data-track="python"]').click();await hintPage.locator('[data-action="exercise"][data-id="python-doppio"]').first().click();
await hintPage.evaluate(()=>window.hintMode='valid');await hintPage.locator('#code-editor').fill('def doppio(numero):\n    while True:\n        pass');
await hintPage.locator('[data-action="personal-hint"]').evaluate(el=>el.click());await hintPage.waitForFunction(()=>window.hintInputs.at(-1).data.python.kind==='timeout');await hintPage.locator('[data-action="personal-hint"]').waitFor();
const timeoutDiagnostic=await hintPage.evaluate(()=>JSON.parse(localStorage.getItem('pydaily-v1')).attempts['python-doppio'].lastFailure);assert.equal(timeoutDiagnostic.kind,'timeout');assert.equal(await hintPage.evaluate(()=>JSON.parse(localStorage.getItem('pydaily-v1')).xp),25);
const requestsBeforeChecking=await hintPage.evaluate(()=>window.hintInputs.length);await hintPage.locator('[data-action="personal-hint"]').evaluate(el=>el.click());await hintPage.locator('[data-action="cancel-personal-hint"]').evaluate(el=>el.click());
await hintPage.locator('[data-action="personal-hint"]').waitFor();assert.equal(await hintPage.evaluate(()=>window.hintInputs.length),requestsBeforeChecking);assert.equal(await hintPage.locator('.personal-hint').count(),2);
assert.equal(hintErrors.length,0,hintErrors.join('\n'));
console.log('PERSONAL_HINTS_OK: Python reale, indizi persistenti senza XP/soluzioni, editor preservato, leak/stale/annullamento/timeout, contesto corretto, modelli/licenza e metriche private.');

// Aspetto: scelte reali nel Profilo, layout/contrasto e conservazione del codice.
const themeContext=await browser.newContext({viewport:{width:393,height:852},colorScheme:'dark'});
await themeContext.addInitScript(()=>{
 window.testNativeThemes=[];
 window.Native={modelStatus:()=>JSON.stringify({available:false,busy:false,ramGB:8}),setTheme:mode=>window.testNativeThemes.push(mode)};
});
const themePage=await themeContext.newPage(),themeErrors=[];
themePage.on('pageerror',error=>themeErrors.push(error.message));
await themePage.goto(origin);
assert.equal(await themePage.locator('html').getAttribute('data-theme'),'light');
await themePage.getByRole('button',{name:'Cominciamo'}).click();
await themePage.getByRole('button',{name:'Profilo',exact:true}).click();
const progressBeforeTheme=await themePage.evaluate(()=>localStorage.getItem('pydaily-v1'));
await themePage.getByLabel('Tema dell’app').selectOption('dark');
assert.equal(await themePage.locator('html').getAttribute('data-theme'),'dark');
assert.equal(await themePage.evaluate(()=>localStorage.getItem('pydaily-v1')),progressBeforeTheme);
assert.equal(await themePage.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(16, 25, 20)');
assert.equal(await themePage.evaluate(()=>window.testNativeThemes.at(-1)),'dark');
await themePage.screenshot({path:fileURLToPath(new URL('../artifacts/PyDaily-profilo-scuro.png',import.meta.url)),fullPage:true});
await themePage.getByRole('button',{name:'Oggi',exact:true}).click();
await themePage.getByRole('button',{name:'Inizia la sfida'}).click();

async function assertContrast(page,pairs){
 const ratios=await page.evaluate(pairs=>{
  const rgb=value=>value.match(/[\d.]+/g).slice(0,3).map(Number);
  const luminance=values=>values.map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
  return pairs.map(([foreground,background])=>{
   const fg=luminance(rgb(getComputedStyle(document.querySelector(foreground)).color));
   const bg=luminance(rgb(getComputedStyle(document.querySelector(background)).backgroundColor));
   return {selector:foreground,ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)};
  });
 },pairs);
 for(const {selector,ratio} of ratios)assert.ok(ratio>=4.5,`${selector}: contrasto ${ratio.toFixed(2)} < 4.5`);
}
for(const mode of ['light','dark']){
 await themePage.evaluate(mode=>window.PyDailyTheme.setPreference(mode),mode);
 for(const width of [320,393,1200]){
  await themePage.setViewportSize({width,height:852});
  const measurements=await themePage.locator('.keyboard-tools button').evaluateAll(buttons=>buttons.map(el=>({label:el.textContent,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize),clipped:el.scrollWidth>el.clientWidth})));
  for(const button of measurements){assert.ok(button.width>=44&&button.height>=44&&button.font>=14,JSON.stringify(button));assert.equal(button.clipped,false,button.label);}
  assert.equal(await themePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await themePage.locator('.keyboard-tools').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await assertContrast(themePage,[['.keyboard-tools button','.keyboard-tools button'],['.line-numbers','.editor'],['#code-editor','.editor'],['.contract p','.contract'],['.editor-actions .primary','.editor-actions .primary']]);
 }
}
await themePage.setViewportSize({width:393,height:852});
await themePage.locator('#code-editor').fill('abc');
await themePage.locator('#code-editor').evaluate(el=>el.setSelectionRange(1,2));
await themePage.getByRole('button',{name:'Inserisci 4 spazi',exact:true}).click();
assert.equal(await themePage.locator('#code-editor').inputValue(),'a    c');
await themePage.locator('#code-editor').fill('def prova():\n');
await themePage.locator('#code-editor').evaluate(el=>el.setSelectionRange(el.value.length,el.value.length));
await themePage.getByRole('button',{name:'Inserisci return',exact:true}).click();
assert.equal(await themePage.locator('#code-editor').inputValue(),'def prova():\n    return ');
await themePage.getByRole('button',{name:'Ripristina codice',exact:true}).click();
await themePage.getByRole('dialog').getByRole('button',{name:'Annulla',exact:true}).click();
assert.equal(await themePage.locator('#code-editor').inputValue(),'def prova():\n    return ');

await themePage.locator('#code-editor').fill('def doppio(numero):\n    return numero * 2\n'+Array.from({length:30},(_,i)=>'# bozza '+i+' '.repeat(60)+'fine').join('\n'));
assert.equal(await themePage.locator('.line-numbers').evaluate(el=>Math.abs(el.getBoundingClientRect().height-document.getElementById('code-editor').getBoundingClientRect().height)<2),true);
const editorBeforeTheme=await themePage.locator('#code-editor').evaluate(el=>{window.themeEditor=el;el.setSelectionRange(12,19,'backward');el.scrollTop=95;el.scrollLeft=45;return {value:el.value,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection,top:el.scrollTop,left:el.scrollLeft};});
await themePage.evaluate(()=>{window.PyDailyTheme.setPreference('light');window.PyDailyTheme.setPreference('dark');});
assert.equal(await themePage.locator('#code-editor').evaluate(el=>el===window.themeEditor),true);
assert.deepEqual(await themePage.locator('#code-editor').evaluate(el=>({value:el.value,start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection,top:el.scrollTop,left:el.scrollLeft})),editorBeforeTheme);
assert.equal(await themePage.getByRole('dialog').count(),0);
await themePage.getByRole('button',{name:'Dammi un tip'}).click();
await assertContrast(themePage,[['.hint p','.hint'],['.hint b','.hint']]);
await themePage.getByRole('button',{name:'Verifica la soluzione'}).click();
await themePage.getByText('Tutti i test superati.').waitFor({timeout:45000});
assert.equal(await themePage.evaluate(()=>JSON.parse(localStorage.getItem('pydaily-v1')).xp),25);
await assertContrast(themePage,[['.feedback p','.feedback'],['.test-chip','.test-chip']]);
await themePage.screenshot({path:fileURLToPath(new URL('../artifacts/PyDaily-editor-scuro.png',import.meta.url)),fullPage:true});
await themePage.getByRole('button',{name:'Mostra la soluzione'}).click();
await assertContrast(themePage,[['.lesson-intro','.modal'],['.solution-code','.solution-code']]);
await themePage.getByRole('dialog').getByRole('button',{name:'Torna a provare'}).click();
await themePage.getByRole('button',{name:'Studio',exact:true}).click();
await themePage.locator('.lesson-card').first().click();
await assertContrast(themePage,[['.lesson-intro','.modal'],['.quiz h3','.quiz']]);
await themePage.getByRole('button',{name:'Chiudi la lezione'}).click();
await themePage.getByRole('button',{name:'Percorsi',exact:true}).click();
await themePage.locator('[data-action="track"][data-track="data"]').click();
await assertContrast(themePage,[['.track-hero p','.track-hero']]);
await themePage.getByRole('button',{name:'Profilo',exact:true}).click();
await assertContrast(themePage,[['.model-card>p','.model-card'],['.model-choice p','.model-choice'],['.appearance-settings label','.appearance-settings']]);
await themePage.reload();
assert.equal(await themePage.locator('html').getAttribute('data-theme'),'dark');
assert.equal(await themePage.evaluate(()=>window.testNativeThemes[0]),'dark');
await themePage.getByRole('button',{name:'Profilo',exact:true}).click();
assert.equal(await themePage.getByLabel('Tema dell’app').inputValue(),'dark');
const progressAfterReload=await themePage.evaluate(()=>localStorage.getItem('pydaily-v1'));
await themePage.getByLabel('Tema dell’app').selectOption('system');
await themePage.emulateMedia({colorScheme:'light'});
await themePage.waitForFunction(()=>document.documentElement.dataset.theme==='light');
await themePage.emulateMedia({colorScheme:'dark'});
await themePage.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
assert.equal(await themePage.getByLabel('Tema dell’app').inputValue(),'system');
await themePage.getByLabel('Tema dell’app').selectOption('light');
await themePage.emulateMedia({colorScheme:'dark'});
assert.equal(await themePage.locator('html').getAttribute('data-theme'),'light');
assert.equal(await themePage.evaluate(()=>localStorage.getItem('pydaily-v1')),progressAfterReload);
assert.equal(themeErrors.length,0,themeErrors.join('\n'));
console.log('THEME_EDITOR_OK: temi persistenti, sistema/bridge, nessun testo tagliato a 320/393/1200 px, contrasto >=4.5, scorciatoie, codice/cursore/scroll e XP preservati.');
} finally {
 await browser.close();
 if(server.listening)await new Promise(resolve=>server.close(resolve));
}
