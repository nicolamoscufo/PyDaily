export class PythonRunner {
  constructor(onStatus=()=>{}){this.onStatus=onStatus;this.pending=null;this.ready=false;this.counter=0;this.create();}
  create(){
    this.ready=false;this.onStatus('loading');
    this.worker=new Worker(new URL('./python-worker.js',import.meta.url));
    this.bootTimer=setTimeout(()=>{this.worker.terminate();this.onStatus('error');if(this.pending){this.pending.reject(Error('Python non si è avviato. Tocca Riprova Python.'));this.pending=null;}},45000);
    this.worker.onmessage=event=>{
      const data=event.data;
      if(data.type==='ready'){clearTimeout(this.bootTimer);this.ready=true;this.onStatus('ready');if(this.pending&&!this.pending.sent)this.send();}
      if(data.type==='boot-error'){clearTimeout(this.bootTimer);this.onStatus('error');if(this.pending){this.pending.reject(Error('Impossibile avviare Python. Riprova.'));this.pending=null;}}
      if(data.type==='result'&&this.pending?.id===data.id){clearTimeout(this.pending.timer);const p=this.pending;this.pending=null;this.onStatus('ready');p.resolve(data.result);}
    };
    this.worker.onerror=()=>{clearTimeout(this.bootTimer);this.onStatus('error');if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(Error('Il motore Python si è fermato. Riprova.'));this.pending=null;}};
  }
  run(job){
    if(this.pending)return Promise.reject(Error('Aspetta la verifica in corso.'));
    return new Promise((resolve,reject)=>{this.pending={id:++this.counter,job,resolve,reject,sent:false};if(this.ready)this.send();});
  }
  send(){
    const p=this.pending;if(!p)return;p.sent=true;this.onStatus('running');
    p.timer=setTimeout(()=>{this.worker.terminate();this.pending=null;p.reject(Error('Tempo scaduto (4 secondi). Controlla i cicli: ogni iterazione deve avvicinarsi alla fine.'));this.create();},4000);
    this.worker.postMessage({id:p.id,job:p.job});
  }
  restart(){clearTimeout(this.bootTimer);this.worker.terminate();if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(Error('Esecuzione interrotta.'));this.pending=null;}this.create();}
}
