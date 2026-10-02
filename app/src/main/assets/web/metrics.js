export const METRICS_KEY='pydaily-tutor-metrics-v1';
const fields=['elapsedMs','loadMs','promptMs','decodeMs','samplingMs','promptTokens','outputTokens','decodeTokens','peakProcessRssMiB','processPssMiB','contextTokens','threads'];
export function measurement(entry){
  const clean={kind:['exercise','hint','cycle'].includes(entry.kind)?entry.kind:'exercise',model:String(entry.model||'GGUF').slice(0,100),status:['completed','failed','accepted','rejected','cancelled','timeout'].includes(entry.status)?entry.status:'failed'};
  for(const key of fields)if(Number.isFinite(entry[key])&&entry[key]>=0)clean[key]=Math.round(entry[key]*10)/10;
  if(Number.isInteger(entry.attempts)&&entry.attempts>=1&&entry.attempts<=2)clean.attempts=entry.attempts;
  if(typeof entry.track==='string'&&/^(python|algorithms|data|ml|dl|rl|automation)$/.test(entry.track))clean.track=entry.track;
  return clean;
}
export function loadMeasurements(){try{const items=JSON.parse(globalThis.localStorage?.getItem(METRICS_KEY)||'[]');return Array.isArray(items)?items.slice(-40).map(measurement):[];}catch{return [];}}
export function saveMeasurements(items){try{globalThis.localStorage?.setItem(METRICS_KEY,JSON.stringify(items.slice(-40)));}catch{}}
export function metricSummary(items){const cycles=items.filter(m=>m.kind==='cycle'&&['accepted','rejected'].includes(m.status)),accepted=cycles.filter(m=>m.status==='accepted'),times=accepted.map(m=>m.elapsedMs).filter(Number.isFinite).sort((a,b)=>a-b);return {cycles:cycles.length,accepted:accepted.length,medianMs:times.length?times.length%2?times[Math.floor(times.length/2)]:(times[times.length/2-1]+times[times.length/2])/2:null};}
