import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../app/src/main/assets/web/theme.js',import.meta.url),'utf8');
function boot({stored=null,dark=false,denied=false,native=true}={}){
  const values=new Map([['pydaily-v1','progressi intatti']]);if(stored!==null)values.set('pydaily-theme',stored);
  const listeners={},calls=[],meta={},root={dataset:{}};
  let change;
  const media={matches:dark,addEventListener:(type,fn)=>{change=fn;}};
  const window={matchMedia:()=>media,addEventListener:(type,fn)=>{listeners[type]=fn;},dispatchEvent:()=>{}};
  if(native)window.Native={setTheme:mode=>calls.push(mode)};
  const localStorage={getItem:key=>{if(denied)throw Error('non disponibile');return values.get(key)??null;},setItem:(key,value)=>{if(denied)throw Error('non disponibile');values.set(key,value);}};
  runInNewContext(script,{window,localStorage,document:{documentElement:root,querySelector:()=>({setAttribute:(k,v)=>{meta[k]=v;}})},CustomEvent:class{constructor(type,detail){this.type=type;this.detail=detail;}}});
  return {api:window.PyDailyTheme,root,values,calls,meta,system:value=>{media.matches=value;change();},storage:event=>listeners.storage(event)};
}
test('chiaro predefinito e preferenze danneggiate non cambiano i progressi',()=>{
  for(const stored of [null,'sconosciuto','<script>']){
    const env=boot({stored,dark:true});assert.equal(env.root.dataset.theme,'light');assert.equal(env.values.get('pydaily-v1'),'progressi intatti');
  }
});
test('scuro salvato applicato subito e sincronizzato con il bridge Android',()=>{
  const env=boot({stored:'dark'});assert.equal(env.root.dataset.theme,'dark');assert.equal(env.meta.content,'#101914');assert.deepEqual(env.calls,['dark']);
  assert.equal(env.api.setPreference('light'),true);assert.equal(env.root.dataset.theme,'light');assert.equal(env.meta.content,'#f7f8f4');assert.equal(env.values.get('pydaily-theme'),'light');
  assert.equal(env.values.get('pydaily-v1'),'progressi intatti');
});
test('come il telefono segue i cambiamenti; una scelta esplicita li ignora',()=>{
  const env=boot({stored:'system',dark:true});assert.equal(env.root.dataset.theme,'dark');env.system(false);assert.equal(env.root.dataset.theme,'light');
  env.api.setPreference('dark');env.system(false);assert.equal(env.root.dataset.theme,'dark');assert.equal(env.api.getPreference(),'dark');
});
test('storage non disponibile e bridge assente non impediscono di applicare il tema',()=>{
  const env=boot({denied:true,native:false});assert.equal(env.root.dataset.theme,'light');assert.equal(env.api.setPreference('dark'),false);assert.equal(env.root.dataset.theme,'dark');
});
test('cambiamenti da un’altra scheda vengono applicati senza toccare altre chiavi',()=>{
  const env=boot();env.storage({key:'pydaily-theme',newValue:'dark'});assert.equal(env.root.dataset.theme,'dark');env.storage({key:'pydaily-v1',newValue:'altro'});assert.equal(env.root.dataset.theme,'dark');
  env.storage({key:null});assert.equal(env.root.dataset.theme,'light');
});
