import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,TRACKS,EXERCISES,recordAttempt,levelFor,independentCount,streak,daily,needReview,reviewAnswer,dueReviews,shiftDay,validateState,makeVariant,recommend,registerGenerated,challengeStatus,generatedSequence,generatedProgress} from '../app/src/main/assets/web/core.js';
import {parseExercise,generationPrompt} from '../app/src/main/assets/web/tutor.js';
test('nessun XP o livello ottenuto da un errore',()=>{const s=initialState();recordAttempt(s,EXERCISES[0],{passed:false},'2026-10-01');assert.equal(s.xp,0);assert.equal(independentCount(s),0);assert.equal(s.review.functions.due,'2026-10-01');});
test('due problemi autonomi aumentano il livello senza duplicare XP',()=>{const s=initialState();recordAttempt(s,EXERCISES[0],{passed:true},'2026-10-01');const xp=s.xp;recordAttempt(s,EXERCISES[0],{passed:true},'2026-10-01');assert.equal(s.xp,xp);recordAttempt(s,EXERCISES[1],{passed:true},'2026-10-01');assert.equal(levelFor(s,'python'),2);assert.equal(daily(s,'2026-10-01').solved.length,2);assert.equal(levelFor(s,'ml'),1);});
test('una soluzione guidata non alza il livello; recupero autonomo assegna la differenza',()=>{const s=initialState();recordAttempt(s,EXERCISES[0],{passed:true,assisted:true},'2026-10-01');assert.equal(s.xp,8);assert.equal(independentCount(s),0);recordAttempt(s,EXERCISES[0],{passed:true,assisted:false},'2026-10-02');assert.equal(s.xp,25);assert.equal(independentCount(s),1);});
test('streak usa giornate locali e conserva la serie fino a ieri',()=>{const s=initialState();recordAttempt(s,EXERCISES[0],{passed:true},'2026-09-30');recordAttempt(s,EXERCISES[1],{passed:true},'2026-10-01');assert.equal(streak(s,'2026-10-02'),2);assert.equal(streak(s,'2026-10-03'),0);assert.equal(shiftDay('2026-10-01',-1),'2026-09-30');});
test('ripasso 1,3,7,14 giorni e reset dopo un errore',()=>{const s=initialState();needReview(s,'functions','2026-10-01');reviewAnswer(s,'functions',true,'2026-10-01');assert.equal(s.review.functions.due,'2026-10-02');reviewAnswer(s,'functions',true,'2026-10-02');assert.equal(s.review.functions.due,'2026-10-05');reviewAnswer(s,'functions',false,'2026-10-05');assert.equal(s.review.functions.stage,0);assert.equal(dueReviews(s,'2026-10-05').length,1);});
test('tutti i percorsi producono varianti riproducibili',()=>{for(const track of ['python','algorithms','data','ml','dl','rl','automation']){assert.deepEqual(makeVariant(track,4),makeVariant(track,4));assert.notDeepEqual(makeVariant(track,4).cases,makeVariant(track,5).cases);}});
test('backup valido e rifiuto di valori danneggiati',()=>{const s=initialState();assert.equal(validateState(JSON.parse(JSON.stringify(s))).schema,1);assert.throws(()=>validateState({...s,xp:NaN}));assert.throws(()=>validateState({...s,goal:9}));});
test('schema delle sfide AI, test distinti e contesto progressivo',()=>{const s=initialState();const text=JSON.stringify({title:'Triplo',description:'Restituisci il triplo di x.',function:'triplo',params:['x'],solution:'def triplo(x):\n    return 3*x',cases:[{args:[1],expected:3},{args:[0],expected:0},{args:[-2],expected:-6},{args:[4],expected:12}],tips:['Moltiplica.','Usa return.'],study:'Il risultato di una funzione si restituisce con return.'});const e=parseExercise(text,s,'python');s.generated[e.id]=e;registerGenerated(s.generated);assert.equal(recommend(s).id,e.id);recordAttempt(s,e,{passed:true},'2026-10-01');assert.equal(independentCount(s,'python'),1);assert.equal(validateState(JSON.parse(JSON.stringify(s))).generated[e.id].title,'Triplo');assert.match(generationPrompt(s,'python'),/independently solved: 1/);assert.throws(()=>parseExercise(text.replace('"expected":3','"expected":0').replace('"expected":-6','"expected":0'),s,'python'));registerGenerated({});});

const savedChallenge=(id,track='python')=>({...EXERCISES.find(e=>e.track===track),id,generated:true});
test('sfide schema 1 ordinate e numerate per percorso senza riscrivere il backup',()=>{
  const s=initialState();for(const e of [savedChallenge('ai-z'),savedChallenge('ai-a','data'),savedChallenge('ai-b'),savedChallenge('ai-c')])s.generated[e.id]=e;
  const before=JSON.stringify(s),entries=generatedSequence(s);
  assert.deepEqual(entries.map(({exercise,number})=>[exercise.id,number]),[['ai-z',1],['ai-a',1],['ai-b',2],['ai-c',3]]);
  assert.deepEqual(generatedSequence(validateState(JSON.parse(before)),'python').map(({exercise,number})=>[exercise.id,number]),[['ai-z',1],['ai-b',2],['ai-c',3]]);
  assert.equal(JSON.stringify(s),before);assert.equal(s.schema,1);assert.equal(s.xp,0);
});
test('stati delle sfide derivati da bozze, verifiche, tip e risultati già salvati',()=>{
  const s=initialState(),e=savedChallenge('ai-stato');s.generated[e.id]=e;
  assert.equal(challengeStatus(s,e),'ready');s.drafts[e.id]=e.starter;assert.equal(challengeStatus(s,e),'ready');
  s.drafts[e.id]+='\n# prova';assert.equal(challengeStatus(s,e),'in-progress');delete s.drafts[e.id];
  s.attempts[e.id]={count:0,failures:0,tipsUnlocked:1};assert.equal(challengeStatus(s,e),'in-progress');
  s.solved[e.id]={day:'2026-10-02',assisted:true};assert.equal(challengeStatus(s,e),'guided');
  s.solved[e.id].assisted=false;assert.equal(challengeStatus(s,e),'solved');
});
test('continua dalla prima sfida non completata, non dall’ultima generata',()=>{
  const s=initialState(),first=savedChallenge('ai-prima'),last=savedChallenge('ai-ultima');s.generated={[first.id]:first,[last.id]:last};s.drafts[first.id]=first.starter+'\n# da riprendere';
  registerGenerated(s.generated);
  try{
    assert.equal(generatedProgress(s,'python').next.exercise.id,first.id);assert.equal(recommend(s,'python').id,first.id);
    recordAttempt(s,first,{passed:true,code:s.drafts[first.id]});
    const progress=generatedProgress(s,'python');assert.equal(progress.next.exercise.id,last.id);assert.equal(progress.independent,1);assert.equal(progress.pending,1);assert.equal(levelFor(s,'python'),1);
  }finally{registerGenerated({});}
});
test('le guidate si possono riprovare da domani, dopo le sfide ancora da svolgere',()=>{
  const s=initialState(),guided=savedChallenge('ai-guidata'),pending=savedChallenge('ai-pendente');s.generated={[guided.id]:guided,[pending.id]:pending};s.solved[guided.id]={day:'2026-10-01',assisted:true};
  assert.equal(generatedProgress(s,'python','2026-10-02').next.exercise.id,pending.id);
  s.solved[pending.id]={day:'2026-10-01',assisted:false};
  assert.equal(generatedProgress(s,'python','2026-10-01').next,null);assert.equal(generatedProgress(s,'python','2026-10-02').next.exercise.id,guided.id);
  assert.equal(generatedProgress(s,'python').completed,2);assert.equal(generatedProgress(s,'python').independent,1);
});
test('sfide del tutor e livelli restano separati nei sette percorsi, XP non duplicati',()=>{
  const s=initialState();for(const t of TRACKS)for(let n=1;n<=2;n++){const e=savedChallenge(`ai-${t.id}-${n}`,t.id);s.generated[e.id]=e;}
  registerGenerated(s.generated);
  try{
    for(const t of TRACKS){
      assert.equal(levelFor(s,t.id),1);assert.equal(generatedProgress(s,t.id).total,2);
      for(const {exercise:e} of generatedSequence(s,t.id))recordAttempt(s,e,{passed:true,code:e.solution},'2026-10-02');
      assert.equal(levelFor(s,t.id),2);assert.equal(generatedProgress(s,t.id).independent,2);assert.equal(generatedProgress(s,t.id).next,null);
    }
    const xp=s.xp;for(const {exercise:e} of generatedSequence(s))recordAttempt(s,e,{passed:true,code:e.solution},'2026-10-02');assert.equal(s.xp,xp);
    const restored=validateState(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.generated,s.generated);assert.deepEqual(restored.solved,s.solved);assert.deepEqual(restored.drafts,s.drafts);assert.deepEqual(restored.review,s.review);assert.deepEqual(restored.daily,s.daily);
  }finally{registerGenerated({});}
});
