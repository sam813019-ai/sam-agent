#!/usr/bin/env python3
"""六團 CRM 標籤指派 V1。用法: tag_crm_v1.py <scratchpad> [--dry-run]"""
import json,sys,re,datetime,time,urllib.request,urllib.error,collections
sp=sys.argv[1]; DRY="--dry-run" in sys.argv
BASE="https://open.shopline.io/v1"
env=open('/Users/mac/Downloads/sam-agent/heiwei-review/.env.local').read()
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',env).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review","Content-Type":"application/json"}
def api(u,d=None,m="GET",tries=3):
    for i in range(tries):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,data=d,headers=H,method=m)))
        except urllib.error.HTTPError as e:
            if e.code in (429,500,502,503,504) and i<tries-1: time.sleep(2*(i+1)); continue
            raise
        except Exception:
            if i<tries-1: time.sleep(2*(i+1)); continue
            raise
MAY='69f055f1d1bff05f11af8636'; AUG='6a869d73b02c3b16856b59c3'
PX_NOW='6a8d14e8d99f5b000a1876db'
D=lambda f: json.load(open(sp+"/"+f))
cl,co,tl,st,yb,px = D('chenling.json'),D('coco.json'),D('tonglin.json'),D('stella.json'),D('yb.json'),D('pinxin_repeat.json')
def norm(h): return [{'date':x[1],'total':x[2],'sid':x[4]} if isinstance(x,list) else x for x in h]
def bottles(v):
    b=0
    for i in v.get('items',[]):
        if '贈品' in i['t']: continue
        mm=re.search(r'(10|[１２３５1235])入',i['t'])
        if mm: b+={'１':1,'２':2,'３':3,'５':5,'1':1,'2':2,'3':3,'5':5,'10':10}[mm.group(1)]*i['q']
    return b
EXCLUDE_NAMES={'宋珮瑄','冀子琪'}          # 分銷型帳號：排除所有波次
EXCLUDE_IDS={'68a06427b9a091000de10637'}   # 使用者本人帳號：排除全部

assign=collections.defaultdict(set)   # cid -> tags
def add(cid,tag):
    if cid in EXCLUDE_IDS: return
    assign[cid].add(tag)

# ── 波次標籤 ──────────────────────────────
for cid,v in yb.items():
    h=v['hist']; m5=any(o['sid']==MAY for o in h); a8=any(o['sid']==AUG for o in h)
    if v['name'] in EXCLUDE_NAMES: continue
    if m5 and not a8: add(cid,'V1-補貨加新品')
    elif a8 and not m5: add(cid,'V1-YB回購')
for src in (co,tl,st):
    for cid,v in src.items():
        if v['name'] in EXCLUDE_NAMES: continue
        b=bottles(v)
        if b<=2: add(cid,'V1-補貨加新品')
        elif b<=6: add(cid,'V1-純新品')
# 陳綾
for cid,v in cl.items():
    if v['name'] in EXCLUDE_NAMES: continue
    L=sum(o['total'] for o in v['hist']); aft=[o for o in v['hist'] if o['date']>'2026-01-23']
    if aft: add(cid,'V1-新品優先')
    elif L>=20000: add(cid,'V1-VIP人工')
    else: add(cid,'V1-保養線')
# 品馨：團內首購且無其他購買紀錄
for cid,v in px.items():
    h=norm(v['hist']); inside=[o for o in h if o['sid']==PX_NOW]; prior=[o for o in h if o['sid']!=PX_NOW]
    if not prior and len(inside)==1: add(cid,'V1-品馨回購')

# ── 狀態標籤 ──────────────────────────────
allc={}
for src in (cl,co,tl,st,yb,px):
    for cid,v in src.items():
        h=norm(v['hist'])
        e=allc.setdefault(cid,{'name':v['name'],'hist':h})
        if len(h)>len(e['hist']): e['hist']=h
for cid,v in allc.items():
    L=sum(o['total'] for o in v['hist'])
    if L>=20000: add(cid,'VIP-高價值')
    if len(v['hist'])>=2: add(cid,'回頭客')
for src in (co,tl,st,yb):
    for cid,v in src.items():
        if bottles(v)>=7: add(cid,'大量採購')

cnt=collections.Counter(t for tags in assign.values() for t in tags)
print(f"客戶 {len(assign)} 位／標籤指派 {sum(len(t) for t in assign.values())} 筆\n")
for t,c_ in sorted(cnt.items(),key=lambda kv:-kv[1]): print(f"  {t:<16}{c_:>6}")
if DRY: raise SystemExit
print("\n開始寫入…",flush=True)
ok=fail=0; failed={}
t0=time.time()
for i,(cid,tags) in enumerate(assign.items(),1):
    body=json.dumps({"tags":sorted(tags),"update_mode":"add"}).encode()
    try: api(f"{BASE}/customers/{cid}/tags",body,"PATCH"); ok+=1
    except Exception as e: failed[cid]=sorted(tags); fail+=1; print("FAIL",cid,str(e)[:80],flush=True)
    if i%300==0: print(f"  ...{i}/{len(assign)}  {time.time()-t0:.0f}s",flush=True)
    time.sleep(0.05)
if failed:
    print(f"重試 {len(failed)} 筆…")
    again={}
    for cid,tags in failed.items():
        time.sleep(1)
        try: api(f"{BASE}/customers/{cid}/tags",json.dumps({"tags":tags,"update_mode":"add"}).encode(),"PATCH"); ok+=1; fail-=1
        except Exception as e: again[cid]=str(e)[:100]
    failed=again
print(f"\n寫入成功 {ok}／失敗 {len(failed)}")
import random
sample=random.sample(list(assign),min(120,len(assign))); bad=[]
for cid in sample:
    try:
        t=set(api(f"{BASE}/customers/{cid}").get("tags") or [])
        if not assign[cid].issubset(t): bad.append((cid,sorted(assign[cid]),sorted(t)))
    except Exception as e: bad.append((cid,'讀取失敗',str(e)[:60]))
    time.sleep(0.05)
print(f"抽樣驗證 {len(sample)} 位 → 不符 {len(bad)}")
for b in bad[:10]: print("  ",b)
