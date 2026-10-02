/* Python 3.12 e NumPy sono asset locali. Nessun servizio remoto. */
importScripts('./vendor/pyodide/pyodide.js');
const ready=loadPyodide({indexURL:new URL('./vendor/pyodide/',self.location.href).href}).then(async py=>{
  await py.loadPackage('numpy');
  return py;
});
ready.then(()=>self.postMessage({type:'ready'})).catch(e=>self.postMessage({type:'boot-error',error:String(e)}));
const HARNESS=String.raw`
import ast as _ast, json as _json, math as _math, io as _io, contextlib as _contextlib, copy as _copy, traceback as _traceback
_job = _json.loads(_payload)
_code = _job['code']
_allowed = {'math','statistics','random','collections','itertools','functools','re','json','string','numpy','heapq','bisect','typing','csv','io','decimal','fractions'}
_blocked_calls = {'eval','exec','compile','open','input','__import__','breakpoint','globals','locals','getattr','setattr','delattr','vars','dir','exit','quit'}
def _clean(v):
    if hasattr(v, 'tolist'): v = v.tolist()
    if isinstance(v, dict): return {str(k): _clean(x) for k,x in v.items()}
    if isinstance(v, (list, tuple)): return [_clean(x) for x in v]
    if v is None or isinstance(v,(str,bool,int)): return v
    if isinstance(v,float): return v if _math.isfinite(v) else str(v)
    return str(v)
def _same(a,b):
    if isinstance(a,bool) or isinstance(b,bool): return type(a) is type(b) and a == b
    if isinstance(a,(int,float)) and isinstance(b,(int,float)): return _math.isclose(a,b,rel_tol=1e-6,abs_tol=1e-8)
    if isinstance(a,list) and isinstance(b,list): return len(a)==len(b) and all(_same(x,y) for x,y in zip(a,b))
    if isinstance(a,dict) and isinstance(b,dict): return a.keys()==b.keys() and all(_same(a[k],b[k]) for k in a)
    return type(a) is type(b) and a==b
_result = {'passed':False,'cases':[],'output':'','error':''}
try:
    if len(_code)>12000: raise ValueError('Il codice supera 12.000 caratteri.')
    _tree = _ast.parse(_code, filename='esercizio.py')
    for _node in _ast.walk(_tree):
        if isinstance(_node,_ast.Import):
            if any(a.name.split('.')[0] not in _allowed for a in _node.names): raise ValueError('Questo modulo non è incluso. Usa Python standard o NumPy.')
        if isinstance(_node,_ast.ImportFrom) and ((_node.module or '').split('.')[0] not in _allowed or _node.level): raise ValueError('Questo modulo non è incluso.')
        if isinstance(_node,_ast.Name) and _node.id in _blocked_calls: raise ValueError('Questa funzione non è disponibile negli esercizi. Usa i parametri e return.')
        if isinstance(_node,_ast.Attribute) and _node.attr.startswith('__'): raise ValueError('Gli attributi interni non sono disponibili negli esercizi.')
    _stream = _io.StringIO()
    for _case in _job.get('cases',[]):
        _ns = {'__name__':'__exercise__'}
        with _contextlib.redirect_stdout(_stream), _contextlib.redirect_stderr(_stream):
            exec(compile(_tree,'esercizio.py','exec'),_ns)
            _fn = _ns.get(_job['function'])
            if not callable(_fn): raise ValueError('Definisci la funzione '+_job['function']+' con il nome richiesto.')
            _actual = _clean(_fn(*_copy.deepcopy(_case['args'])))
        _result['cases'].append({'passed':_same(_actual,_case['expected']),'actual':_actual,'expected':_case['expected']})
    _result['output']=_stream.getvalue()[:3000]
    _result['passed']=bool(_result['cases']) and all(c['passed'] for c in _result['cases'])
except BaseException as _err:
    _result['error']=''.join(_traceback.format_exception_only(type(_err),_err)).strip()
    if isinstance(_err, SyntaxError):
        _result['error'] += '\nControlla la riga '+str(_err.lineno)+': due punti e indentazione.'
_json.dumps(_result, ensure_ascii=False)
`;
self.onmessage=async event=>{
  const {id,job}=event.data;
  try{
    const py=await ready;
    const makeDict=py.globals.get('dict');const ns=makeDict();makeDict.destroy();
    ns.set('_payload',JSON.stringify(job));
    try { const json=py.runPython(HARNESS,{globals:ns});self.postMessage({type:'result',id,result:JSON.parse(json)}); }
    finally { ns.destroy(); }
  }catch(error){self.postMessage({type:'result',id,result:{passed:false,cases:[],error:String(error),output:''}});}
};
