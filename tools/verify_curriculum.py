import json, math, importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('curriculum',Path(__file__).with_name('make_curriculum.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
def clean(v):
 if hasattr(v,'tolist'):v=v.tolist()
 if isinstance(v,(list,tuple)):return [clean(x) for x in v]
 if isinstance(v,dict):return {k:clean(x) for k,x in v.items()}
 return v
def same(a,b):
 if isinstance(a,bool) or isinstance(b,bool):return type(a)==type(b) and a==b
 if isinstance(a,(int,float)) and isinstance(b,(int,float)):return math.isclose(a,b,rel_tol=1e-6,abs_tol=1e-8)
 if isinstance(a,list) and isinstance(b,list):return len(a)==len(b) and all(same(x,y) for x,y in zip(a,b))
 if isinstance(a,dict) and isinstance(b,dict):return a.keys()==b.keys() and all(same(a[k],b[k]) for k in a)
 return a==b
checks=0
for e in c.EXERCISES:
 for case in e['cases']:
  ns={};exec(e['solution'],ns);actual=clean(ns[e['function']](*case['args']));assert same(actual,case['expected']),(e['id'],case,actual);checks+=1
print('OK:',len(c.EXERCISES),'soluzioni,',checks,'casi')
