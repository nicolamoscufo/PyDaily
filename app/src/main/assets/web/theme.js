/* Eseguito prima dei CSS: la preferenza locale non modifica i backup dei progressi. */
(()=>{
  const KEY='pydaily-theme';
  const normalize=value=>['light','dark','system'].includes(value)?value:'light';
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  let preference='light';
  try{preference=normalize(localStorage.getItem(KEY));}catch{}
  function apply(){
    const resolved=preference==='system'?(media.matches?'dark':'light'):preference;
    document.documentElement.dataset.theme=resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',resolved==='dark'?'#101914':'#f7f8f4');
    try{if(typeof window.Native?.setTheme==='function')window.Native.setTheme(resolved);}catch{}
    window.dispatchEvent(new CustomEvent('pydaily-theme-change',{detail:{preference,resolved}}));
  }
  window.PyDailyTheme={
    getPreference:()=>preference,
    setPreference:value=>{
      preference=normalize(value);let saved=true;
      try{localStorage.setItem(KEY,preference);}catch{saved=false;}
      apply();return saved;
    }
  };
  const systemChanged=()=>{if(preference==='system')apply();};
  if(media.addEventListener)media.addEventListener('change',systemChanged);else media.addListener(systemChanged);
  window.addEventListener('storage',event=>{
    if(event.key!==KEY&&event.key!==null)return;
    if(event.key===null){try{preference=normalize(localStorage.getItem(KEY));}catch{preference='light';}}
    else preference=normalize(event.newValue);
    apply();
  });
  apply();
})();
