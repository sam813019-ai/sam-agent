#!/usr/bin/env python3
"""掃全站訂單，彙整所有 order_source（一頁式商店＝團主開團）與客戶名單。

用法: python3 scan_order_sources.py [--since 2023-01-01T00:00:00Z]
輸出: scratchpad/source_index.json  {source_id: {name, type, first, last, orders, customer_ids[]}}
"""
import argparse, json, os, re, sys, urllib.request
BASE="https://open.shopline.io/v1"
ENV="/Users/mac/Downloads/sam-agent/heiwei-review/.env.local"
OUT=os.environ.get("SL_OUT", os.path.join(os.path.dirname(os.path.abspath(__file__)),"source_index.json"))

env=open(ENV).read()
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',env).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review"}

def get(u):
    return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H)))

p=argparse.ArgumentParser(); p.add_argument("--since",default="2023-01-01T00:00:00Z"); a=p.parse_args()
idx={}; prev=None; n=0
while True:
    url=f"{BASE}/orders?per_page=250&created_after={a.since}"
    if prev: url+="&previous_id="+prev
    items=get(url).get("items",[])
    if not items: break
    n+=len(items)
    for o in items:
        s=o.get("order_source") or {}
        sid=s.get("source_id") or ("storefront" if s.get("type")=="storefront" else s.get("type") or "unknown")
        e=idx.setdefault(sid,{"name":(s.get("name") or {}).get("zh-hant") or s.get("type"),
                              "type":s.get("type"),"orders":0,"first":None,"last":None,"customer_ids":[]})
        e["orders"]+=1
        ca=o["created_at"][:10]
        e["first"]=ca if not e["first"] else min(e["first"],ca)
        e["last"]=ca if not e["last"] else max(e["last"],ca)
        if o.get("customer_id"): e["customer_ids"].append(o["customer_id"])
    print(f"...已掃 {n} 筆", file=sys.stderr, flush=True)
    if len(items)<250: break
    prev=items[-1]["id"]
for e in idx.values(): e["customers"]=len(set(e["customer_ids"]))
json.dump(idx,open(OUT,"w"),ensure_ascii=False)
print(f"訂單總數 {n}，來源 {len(idx)} 個 → {OUT}")
for sid,e in sorted(idx.items(),key=lambda kv:-kv[1]["orders"]):
    print(f"{e['orders']:>6} 單 / {e['customers']:>5} 客  {e['type']:<15} {sid:<26} {e['first']}~{e['last']}  {e['name']}")
