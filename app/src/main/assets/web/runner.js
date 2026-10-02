export class PythonRunner {
  constructor(onStatus=()=>{}){this.onStatus=onStatus;this.pending=null;this.ready=false;this.counter=0;this.create();}
  create(){
    this.ready=false;this.failed=false;this.onStatus('loading');
    this.worker=new Worker(new URL('./python-worker.js',import.meta.url));
    this.bootTimer=setTimeout(()=>this.fail('Python non si è avviato. Tocca Riprova Python.'),45000);
    this.worker.onmessage=event=>{
      const data=event.data;
      if(data.type==='ready'){clearTimeout(this.bootTimer);this.ready=true;this.onStatus('ready');if(this.pending&&!this.pending.sent)this.send();}
      if(data.type==='boot-error')this.fail('Impossibile avviare Python. Tocca Riprova Python.');
      if(data.type==='result'&&this.pending?.id===data.id){clearTimeout(this.pending.timer);const p=this.pending;this.pending=null;this.onStatus('ready');p.resolve(data.result);}
    };
    this.worker.onerror=()=>this.fail('Il motore Python si è fermato. Tocca Riprova Python.');
  }
  fail(message){clearTimeout(this.bootTimer);this.worker.terminate();this.ready=false;this.failed=true;if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(Object.assign(Error(message),{retryable:false}));this.pending=null;}this.onStatus('error');}
  run(job){
    if(this.failed)return Promise.reject(Object.assign(Error('Python non è pronto. Apri una sfida e tocca Riprova Python.'),{retryable:false}));
    if(this.pending)return Promise.reject(Error('Aspetta la verifica in corso.'));
    return new Promise((resolve,reject)=>{this.pending={id:++this.counter,job,resolve,reject,sent:false};if(this.ready)this.send();});
  }
  send(){
    const p=this.pending;if(!p)return;p.sent=true;this.onStatus('running');
    p.timer=setTimeout(()=>{this.worker.terminate();this.pending=null;p.reject(Object.assign(Error('Tempo scaduto (4 secondi). Controlla i cicli: ogni iterazione deve avvicinarsi alla fine.'),{pythonTimeout:true}));this.create();},4000);
    try{this.worker.postMessage({id:p.id,job:p.job});}catch{this.fail('Impossibile inviare il codice a Python. Tocca Riprova Python.');}
  }
  restart(){clearTimeout(this.bootTimer);this.worker.terminate();if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(Error('Esecuzione interrotta.'));this.pending=null;}this.create();}
}
