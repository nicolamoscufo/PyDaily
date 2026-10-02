export const FOCUS={syntax:'Sintassi',signature:'Firma della funzione',return:'Valore restituito',conditions:'Condizioni',iteration:'Cicli',collections:'Liste e dizionari',indexing:'Indici',numpy:'NumPy',calculation:'Calcolo',timeout:'Tempo di esecuzione',other:'Ragionamento'};
export function codeFingerprint(code){let hash=2166136261;for(let i=0;i<code.length;i++){hash^=code.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0')+':'+code.length;}
function compactValue(value){try{const text=JSON.stringify(value);return text&&text.length<=500?JSON.parse(text):'[dato troppo lungo]';}catch{return '[dato non disponibile]';}}
export function diagnosticFor(e,code,result){
  const index=(result.cases||[]).findIndex(c=>!c.passed),failed=index>=0?result.cases[index]:null,error=String(result.error||'');
  let kind=result.passed?'correct':/Tempo scaduto|timeout/i.test(error)?'timeout':/SyntaxError|IndentationError|TabError/.test(error)?'syntax':error?'runtime':failed?.actual===null&&failed.expected!==null?'missing-return':'wrong-result';
  return {codeHash:codeFingerprint(code),passed:!!result.passed,kind,error:error.slice(0,500),output:String(result.output||'').slice(0,500),passedCases:(result.cases||[]).filter(c=>c.passed).length,totalCases:e.cases.length,...(failed?{failedCase:{args:compactValue(e.cases[index]?.args),actual:compactValue(failed.actual),expected:compactValue(failed.expected)}}:{})};
}
export function rememberDiagnostic(s,e,code,result,at=Date.now()){
  const previous=s.attempts[e.id]||{count:0,failures:0},diagnostic=diagnosticFor(e,code,result);
  s.attempts[e.id]={...previous,lastRun:diagnostic,lastRunAt:at,...(!diagnostic.passed?{lastFailure:diagnostic}:{})};
  return diagnostic;
}
export function validDiagnostic(d){return !!d&&typeof d==='object'&&!Array.isArray(d)&&typeof d.passed==='boolean'&&/^[a-f0-9]{8}:\d{1,5}$/.test(d.codeHash||'')&&['correct','timeout','syntax','runtime','missing-return','wrong-result'].includes(d.kind)&&typeof d.error==='string'&&d.error.length<=500&&typeof d.output==='string'&&d.output.length<=500&&Number.isInteger(d.passedCases)&&d.passedCases>=0&&Number.isInteger(d.totalCases)&&d.totalCases>=0&&d.passedCases<=d.totalCases&&(d.failedCase===undefined||(d.failedCase&&typeof d.failedCase==='object'&&!Array.isArray(d.failedCase)&&['args','actual','expected'].every(k=>Object.hasOwn(d.failedCase,k))&&JSON.stringify(d.failedCase).length<=1800));}
export function validPersonalHint(h){return !!h&&typeof h.text==='string'&&h.text.length>0&&h.text.length<=360&&Object.hasOwn(FOCUS,h.focus)&&/^[a-f0-9]{8}:\d{1,5}$/.test(h.codeHash||'')&&/^\d{4}-\d{2}-\d{2}$/.test(h.day||'');}
