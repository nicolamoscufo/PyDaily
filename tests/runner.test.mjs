import test from 'node:test';
import assert from 'node:assert/strict';
import {PythonRunner} from '../app/src/main/assets/web/runner.js';

function engine(t){
  t.mock.timers.enable({apis:['setTimeout']});
  const original=globalThis.Worker,workers=[];
  globalThis.Worker=class{constructor(){workers.push(this);}terminate(){this.terminated=true;}postMessage(job){this.job=job;}message(data){this.onmessage({data});}};
  t.after(()=>{globalThis.Worker=original;});
  return {runner:new PythonRunner(),workers};
}
test('dopo errore di avvio le nuove verifiche falliscono subito, senza attesa infinita',async t=>{
  const {runner,workers}=engine(t);workers[0].message({type:'boot-error'});
  await assert.rejects(runner.run({}),error=>error.retryable===false&&/Riprova Python/.test(error.message));
  assert.equal(runner.pending,null);assert.equal(workers[0].terminated,true);
  runner.restart();const response=runner.run({code:'pass'});workers[1].message({type:'ready'});
  workers[1].message({type:'result',id:workers[1].job.id,result:{passed:true}});assert.equal((await response).passed,true);
});
test('timeout di avvio e arresto del worker chiudono ogni richiesta pendente',async t=>{
  const {runner,workers}=engine(t);const pending=runner.run({});const rejection=assert.rejects(pending,/non si è avviato/);
  t.mock.timers.tick(45000);await rejection;
  await assert.rejects(runner.run({}),/non è pronto/);
  runner.restart();workers[1].message({type:'ready'});const next=runner.run({});const failed=assert.rejects(next,/si è fermato/);
  workers[1].onerror();await failed;assert.equal(runner.ready,false);assert.equal(runner.pending,null);
});
test('postMessage fallito libera richiesta e timer',async t=>{
  const {runner,workers}=engine(t);workers[0].message({type:'ready'});workers[0].postMessage=()=>{throw Error('worker chiuso');};
  await assert.rejects(runner.run({}),/inviare/);assert.equal(runner.pending,null);assert.equal(runner.failed,true);
});
test('timeout del codice distinto da un errore del motore, per la diagnosi del tutor',async t=>{
  const {runner,workers}=engine(t);workers[0].message({type:'ready'});
  const response=runner.run({code:'while True: pass'}),rejected=assert.rejects(response,error=>error.pythonTimeout===true&&/4 secondi/.test(error.message));
  t.mock.timers.tick(4000);await rejected;assert.equal(workers[0].terminated,true);assert.equal(workers.length,2);
  const next=runner.run({});workers[1].message({type:'boot-error'});
  await assert.rejects(next,error=>!error.pythonTimeout&&error.retryable===false);
});
