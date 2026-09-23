#!/usr/bin/env python3
"""依 order_source(一頁式商店) 把所有團購客戶標上「團購-<團主>」。

前置: 先跑 scan_order_sources.py 產出 source_index.json
用法:
    python3 tag_all_groupbuys.py --index source_index.json [--dry-run] [--skip <sid>,<sid>]

同一位客戶跨多團 → 一次 PATCH 帶多個標籤(省呼叫)。update_mode=add 累加、冪等，可重跑。
"""
import argparse, json, random, re, time, urllib.request, urllib.error
BASE="https://open.shopline.io/v1"
ENV="/Users/mac/Downloads/sam-agent/heiwei-review/.env.local"
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',open(ENV).read()).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review","Content-Type":"application/json"}

# 名稱清理不了的特例，直接指定團主名
OVERRIDE={
 "QUALｘCOCOｘ何謂美 爆白團0622-0623":"COCO",
 "歐巴藥師99ｘ何謂美":"歐巴藥師",
 "宜蓁首團ｘ 新版2.0爆白":"宜蓁",
 "樂樂團購8/16~8/23":"樂樂",
 "楊楊生日慶ｘ何謂美":"Yboutique",   # 楊楊＝楠梓YB 主理人，同一團主共用標籤
}

def api(u,data=None,method="GET",tries=3):
    for i in range(tries):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(u,data=data,headers=H,method=method)))
        except urllib.error.HTTPError as e:
            if e.code in (429,500,502,503,504) and i<tries-1:
                time.sleep(2*(i+1)); continue
            raise
        except Exception:
            if i<tries-1: time.sleep(2*(i+1)); continue
            raise

def owner(name):
    if name in OVERRIDE: return OVERRIDE[name]
    n=re.split(r'\s*[ｘ×✕]\s*|\s+x\s+', name)[0]          # 取「ｘ何謂美」前面那段
    n=re.sub(r'(團購|首團|團)?\s*[\d/~\-\.]*$','',n)        # 去尾巴的日期與「團購」
    return re.sub(r'\s+','',n) or name.strip()

p=argparse.ArgumentParser()
p.add_argument("--index",required=True); p.add_argument("--dry-run",action="store_true")
p.add_argument("--skip",default=""); p.add_argument("--prefix",default="團購-")
a=p.parse_args()

idx=json.load(open(a.index)); skip=set(x for x in a.skip.split(",") if x)
groups=[(s,e) for s,e in idx.items() if e.get("type")=="one_page_store" and s not in skip]
groups.sort(key=lambda kv: kv[1]["first"])

cust={}
for sid,e in groups:
    tag=a.prefix+owner(e["name"])
    print(f"■ {e['first']}~{e['last']}  {e['name']}  {e['orders']}單/{len(set(e['customer_ids']))}客 → 「{tag}」")
    for cid in set(e["customer_ids"]): cust.setdefault(cid,set()).add(tag)

pairs=sum(len(v) for v in cust.values())
print(f"\n不重複客戶 {len(cust)} 位，標籤指派 {pairs} 筆（跨團客戶一次寫入多標籤）")
if a.dry_run: raise SystemExit

ok=0; failed={}
t0=time.time()
for i,(cid,tags) in enumerate(cust.items(),1):
    body=json.dumps({"tags":sorted(tags),"update_mode":"add"}).encode()
    try:
        api(f"{BASE}/customers/{cid}/tags",body,"PATCH"); ok+=1
    except Exception as ex:
        failed[cid]=sorted(tags); print("  FAIL",cid,str(ex)[:100],flush=True)
    if i%200==0: print(f"  ...{i}/{len(cust)}  {time.time()-t0:.0f}s",flush=True)
    time.sleep(0.05)

if failed:
    print(f"\n重試 {len(failed)} 筆失敗…")
    again={}
    for cid,tags in failed.items():
        time.sleep(1)
        try:
            api(f"{BASE}/customers/{cid}/tags",json.dumps({"tags":tags,"update_mode":"add"}).encode(),"PATCH"); ok+=1
        except Exception as ex: again[cid]=str(ex)[:120]
    failed=again

print(f"\n寫入成功 {ok}/{len(cust)}，最終失敗 {len(failed)}")
for cid,err in failed.items(): print("  ",cid,err)

# 抽樣驗證
sample=random.sample(list(cust),min(120,len(cust)))
bad=[]
for cid in sample:
    try:
        c=api(f"{BASE}/customers/{cid}")
        if not cust[cid].issubset(set(c.get("tags") or [])): bad.append((cid,c.get("name"),c.get("tags")))
    except Exception as ex: bad.append((cid,"讀取失敗",str(ex)[:80]))
    time.sleep(0.05)
print(f"\n抽樣驗證 {len(sample)} 位 → 不符 {len(bad)}")
for b in bad: print("  ",b)
