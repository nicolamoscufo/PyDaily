import {TRACKS, LESSONS, EXERCISES} from './curriculum.js';
import {rememberDiagnostic,validDiagnostic,validPersonalHint} from './practice.js';
export {TRACKS, LESSONS, EXERCISES};
export const STORAGE_KEY = 'pydaily-v1';
let generated = {};
export function registerGenerated(items={}) { generated=items; }
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function shiftDay(key, n) {
  const [y,m,d]=key.split('-').map(Number);
  return dayKey(new Date(y,m-1,d+n,12));
}
export function initialState() {
  return {schema:1,onboarded:false,goal:3,preferred:'python',xp:0,solved:{},attempts:{},drafts:{},review:{},daily:{},read:{},variantSerial:{},generated:{},reminder:{enabled:false,time:'19:30'},created:dayKey()};
}
export function validateState(raw) {
  if (!raw || raw.schema!==1 || ![1,3,5].includes(raw.goal) || !TRACKS.some(t=>t.id===raw.preferred) || typeof raw.xp!=='number' || !Number.isFinite(raw.xp) || raw.xp<0) throw Error('Backup non valido o di una versione diversa.');
  for(const key of ['solved','attempts','drafts','review','daily','read','variantSerial']) if(!raw[key] || typeof raw[key]!=='object' || Array.isArray(raw[key])) throw Error('Il backup è incompleto.');
  const savedGenerated=raw.generated||{};
  for(const [id,e] of Object.entries(savedGenerated)) if(!/^ai-[a-z0-9-]+$/.test(id)||e.id!==id||!TRACKS.some(t=>t.id===e.track)||typeof e.title!=='string'||typeof e.description!=='string'||typeof e.starter!=='string'||typeof e.solution!=='string'||!Number.isInteger(e.level)||e.level<1||!Array.isArray(e.cases)||e.cases.length<3||!Array.isArray(e.tips)||!LESSONS.some(l=>l.id===e.lesson))throw Error('Il backup contiene sfide generate non valide.');
  for(const [id,solved] of Object.entries(raw.solved)) if(!(EXERCISES.some(e=>e.id===id)||savedGenerated[id]||/^(python|algorithms|data|ml|dl|rl|automation)-lab-\d+$/.test(id)) || typeof solved.assisted!=='boolean' || !/^\d{4}-\d{2}-\d{2}$/.test(solved.day||'')) throw Error('Il backup contiene risultati non validi.');
  for(const [id,value] of Object.entries(raw.drafts)) if(typeof value!=='string' || value.length>20000) throw Error('Il backup contiene codice non valido.');
  for(const [id,value] of Object.entries(raw.review)) if(!LESSONS.some(l=>l.id===id) || !value || !/^\d{4}-\d{2}-\d{2}$/.test(value.due||'') || !Number.isInteger(value.stage) || value.stage<0 || value.stage>4) throw Error('Il backup contiene ripassi non validi.');
  for(const [key,value] of Object.entries(raw.daily)) if(!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value || !Array.isArray(value.solved) || !Number.isFinite(value.attempts) || !Number.isFinite(value.xp)) throw Error('Il backup contiene giornate non valide.');
  for(const [id,value] of Object.entries(raw.variantSerial)) if(!TRACKS.some(t=>t.id===id)||!Number.isInteger(value)||value<0||value>100000) throw Error('Il backup contiene laboratori non validi.');
  for(const value of Object.values(raw.attempts)){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Il backup contiene tentativi non validi.');
    for(const key of ['lastRun','lastFailure'])if(value[key]!==undefined&&!validDiagnostic(value[key]))throw Error('Il backup contiene una diagnosi non valida.');
    if(value.lastRunAt!==undefined&&(!Number.isFinite(value.lastRunAt)||value.lastRunAt<0))throw Error('Il backup contiene una data di verifica non valida.');
    if(value.personalHints!==undefined&&(!Array.isArray(value.personalHints)||value.personalHints.length>3||!value.personalHints.every(validPersonalHint)))throw Error('Il backup contiene suggerimenti personali non validi.');
  }
  return {...initialState(),...raw,reminder:{enabled:false,time:'19:30'}};
}
export const independentCount=(s,track)=>Object.entries(s.solved).filter(([id,r])=>!r.assisted && (!track || getExercise(id)?.track===track)).length;
export const levelFor=(s,track)=>1+Math.floor(independentCount(s,track)/2);
export function daily(s,key=dayKey()) { return s.daily[key] || {attempts:0,solved:[],xp:0}; }
export function streak(s,today=dayKey()) {
  let cursor=daily(s,today).solved.length ? today : shiftDay(today,-1), count=0;
  while(daily(s,cursor).solved.length){count++;cursor=shiftDay(cursor,-1);if(count>10000)break;}
  return count;
}
export const dueReviews=(s,today=dayKey())=>Object.entries(s.review).filter(([,r])=>r.due<=today).map(([id,r])=>({...LESSONS.find(l=>l.id===id),...r})).sort((a,b)=>a.due.localeCompare(b.due));
export function needReview(s,lesson,today=dayKey()) {
  s.review[lesson]={stage:0,due:today,reason:'Un passaggio da chiarire'};
}
export function reviewAnswer(s,lesson,correct,today=dayKey()) {
  const old=s.review[lesson]||{stage:0};
  const stage=correct?Math.min(4,old.stage+1):0;
  const gap=[0,1,3,7,14][stage];
  s.review[lesson]={stage,due:shiftDay(today,gap),reason:correct?'Ripasso programmato':'Riprova con calma'};
  if(correct)s.read[lesson]=today;
}
export function recordAttempt(s,exercise,{passed,assisted=false,code='',error='',result=null},today=dayKey()) {
  const id=exercise.id;
  const d=s.daily[today] ||= {attempts:0,solved:[],xp:0};
  d.attempts++;
  const old=s.attempts[id]||{count:0,failures:0};
  s.attempts[id]={...old,count:old.count+1,failures:old.failures+(passed?0:1),lastDay:today,lastError:passed?'':String(error).slice(0,600)};
  s.drafts[id]=code;
  if(result)rememberDiagnostic(s,exercise,code,result);
  if(!passed){needReview(s,exercise.lesson,today);return {xp:0,newSolved:false,promoted:false};}
  const prior=s.solved[id];
  const newSolved=!prior;
  const upgrade=!!prior && prior.assisted && !assisted;
  const base=20+5*Math.min(exercise.level,5);
  const gained=newSolved?(assisted?8:base):upgrade?base-8:0;
  if(newSolved||upgrade)s.solved[id]={day:today,assisted,xp:assisted?8:base};
  if(!d.solved.includes(id))d.solved.push(id);
  s.xp+=gained;d.xp+=gained;
  if(old.failures||assisted){s.review[exercise.lesson]={stage:1,due:shiftDay(today,1),reason:'Riprendi questo concetto domani'};}
  const promoted=!assisted&&(newSolved||upgrade)&&independentCount(s,exercise.track)%2===0;
  return {xp:gained,newSolved:newSolved||upgrade,promoted};
}

function random(seed){let x=(seed*1664525+1013904223)>>>0;return ()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};}
export function makeVariant(track,serial) {
  const template={python:'media_task',algorithms:'top_k',data:'prodotto_matrici',ml:'train_linear',dl:'passo_logistico',rl:'policy_eval',automation:'flatten_config'}[track];
  const base=EXERCISES.find(e=>e.track===track&&e.function===template);
  if(!base||!Number.isInteger(serial)||serial<0||serial>100000)return null;
  const rng=random(serial+TRACKS.findIndex(t=>t.id===track)*1009);
  const ri=(a,b)=>a+Math.floor(rng()*(b-a+1));
  const cases=[];
  for(let c=0;c<4;c++){
    if(track==='python'){
      const tasks=Array.from({length:8+Math.min(60,serial*2)+c},()=>({latency_s:ri(0,20)/2,passed:ri(0,1)===1}));
      const ok=tasks.filter(t=>t.passed);
      cases.push({args:[tasks],expected:{count:ok.length,mean:ok.length?ok.reduce((s,t)=>s+t.latency_s,0)/ok.length:0}});
    }else if(track==='algorithms'){
      const values=Array.from({length:10+Math.min(90,serial*3)+c},()=>ri(-20,20));const k=ri(1,values.length+2);
      cases.push({args:[values,k],expected:[...values].sort((a,b)=>b-a).slice(0,k)});
    }else if(track==='data'){
      const n=2+Math.min(5,Math.floor(serial/3)),m=3+c,p=2+Math.min(5,Math.floor(serial/4));
      const a=Array.from({length:n},()=>Array.from({length:m},()=>ri(-4,4)));
      const b=Array.from({length:m},()=>Array.from({length:p},()=>ri(-4,4)));
      cases.push({args:[a,b],expected:a.map(row=>Array.from({length:p},(_,j)=>row.reduce((sum,x,k)=>sum+x*b[k][j],0)))});
    }else if(track==='ml'){
      const xs=Array.from({length:4+Math.min(40,serial)},()=>ri(-3,3)),ys=xs.map(x=>2*x+ri(-2,2));const lr=0.01,steps=3+Math.min(37,serial)+c;
      let w=0,b=0;for(let step=0;step<steps;step++){let gw=0,gb=0;xs.forEach((x,i)=>{const e=w*x+b-ys[i];gw+=e*x;gb+=e;});w-=lr*2*gw/xs.length;b-=lr*2*gb/xs.length;}
      cases.push({args:[xs,ys,lr,steps],expected:[w,b]});
    }else if(track==='dl'){
      const x=c===3?1000:ri(-8,8),y=ri(0,1),w=ri(-10,10)/5,b=ri(-10,10)/5,lr=0.01;
      const z=w*x+b,p=z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z)),err=p-y;
      cases.push({args:[x,y,w,b,lr],expected:[w-lr*err*x,b-lr*err]});
    }else if(track==='rl'){
      const n=2+Math.min(4,Math.floor(serial/4)),P=Array.from({length:n},()=>{const row=Array.from({length:n},()=>ri(1,5));const total=row.reduce((a,b)=>a+b,0);return row.map(x=>x/total);});
      const rewards=Array.from({length:n},()=>ri(-3,5)),gamma=0.8,steps=3+Math.min(32,serial)+c;let v=Array(n).fill(0);
      for(let i=0;i<steps;i++)v=P.map((row,j)=>rewards[j]+gamma*row.reduce((sum,p,k)=>sum+p*v[k],0));
      cases.push({args:[P,rewards,gamma,steps],expected:v});
    }else{
      const config={enabled:true,items:[ri(0,9),ri(0,9)],empty:{}},depth=2+Math.min(8,Math.floor(serial/3));let target=config,path=[];
      for(let i=0;i<depth;i++){let key='layer'+i;target[key]={};path.push(key);target=target[key];}
      const value=ri(-100,100);target.value=value;
      cases.push({args:[config],expected:{enabled:true,items:config.items,[path.join('.')+'.value']:value}});
    }
  }
  return {...base,id:`${track}-lab-${serial}`,title:`${base.title} · laboratorio ${serial+1}`,level:5,variant:true,description:base.description+' Nuovi dati generati per allenarti senza memorizzare le risposte.',cases};
}
export function getExercise(id){
  if(generated[id])return generated[id];
  const fixed=EXERCISES.find(e=>e.id===id);if(fixed)return fixed;
  const match=/^(python|algorithms|data|ml|dl|rl|automation)-lab-(\d+)$/.exec(id);
  return match?makeVariant(match[1],Number(match[2])):null;
}
export function challengeStatus(s,e){
  const solved=s.solved[e.id];
  if(solved)return solved.assisted?'guided':'solved';
  const attempt=s.attempts[e.id];
  return (Object.hasOwn(s.drafts,e.id)&&s.drafts[e.id]!==e.starter)||attempt?.count>0||attempt?.lastRun||attempt?.tipsUnlocked>0||attempt?.revealedDay||attempt?.personalHints?.length?'in-progress':'ready';
}
export function generatedSequence(s,track){
  // Le chiavi ai-* mantengono l'ordine di inserimento anche nei backup schema 1.
  // La numerazione per percorso è derivata: nessuna riscrittura dei vecchi esercizi.
  const numbers={};
  return Object.values(s.generated||{}).map(exercise=>({exercise,number:numbers[exercise.track]=(numbers[exercise.track]||0)+1,status:challengeStatus(s,exercise)})).filter(item=>!track||item.exercise.track===track);
}
export function generatedProgress(s,track,today=dayKey()){
  const entries=generatedSequence(s,track),count=status=>entries.filter(item=>item.status===status).length;
  const independent=count('solved'),guided=count('guided');
  const next=entries.find(item=>item.status==='ready'||item.status==='in-progress')||entries.find(item=>item.status==='guided'&&s.solved[item.exercise.id].day!==today)||null;
  return {entries,total:entries.length,independent,guided,completed:independent+guided,inProgress:count('in-progress'),ready:count('ready'),pending:entries.length-independent-guided,next};
}
export function recommend(s,track=s.preferred){
  const level=levelFor(s,track),today=dayKey();
  const next=generatedProgress(s,track,today).next;
  if(next)return next.exercise;
  const available=EXERCISES.filter(e=>e.track===track&&(!s.solved[e.id] || (s.solved[e.id].assisted&&s.solved[e.id].day!==today)));
  available.sort((a,b)=>Math.abs(a.level-level)-Math.abs(b.level-level)||a.level-b.level);
  if(available.length)return available[0];
  let serial=s.variantSerial[track]||0;
  while(s.solved[`${track}-lab-${serial}`])serial++;
  s.variantSerial[track]=serial;
  return makeVariant(track,serial);
}
