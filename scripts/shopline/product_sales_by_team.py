#!/usr/bin/env python3
"""撈全站訂單，依團購來源(one_page_store)彙整每個品項/組合的銷量與營收。
用法：python3 product_sales_by_team.py [--since 2025-01-01] [--out team_item_sales.json]"""
import json,os,re,sys,urllib.request,collections,argparse
BASE="https://open.shopline.io/v1"
ENV="/Users/mac/Downloads/sam-agent/heiwei-review/.env.local"
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',open(ENV).read()).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review"}
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=60))
ap=argparse.ArgumentParser(); ap.add_argument("--since",default="2025-01-01"); ap.add_argument("--out",default="team_item_sales.json")
a=ap.parse_args()

orders=[];prev=None
while True:
    u=f"{BASE}/orders?per_page=250&created_after={a.since}T00:00:00Z"
    if prev: u+="&previous_id="+prev
    it=get(u).get("items",[])
    if not it: break
    orders+=it; print(f"...{len(orders)}",file=sys.stderr,flush=True)
    if len(it)<250: break
    prev=it[-1]["id"]

sess={}
for o in orders:
    if o.get("status")=="cancelled": continue
    s=o.get("order_source") or {}
    if s.get("type")!="one_page_store": continue
    sid=s.get("source_id"); name=(s.get("name") or {}).get("zh-hant") or ""
    d=o["created_at"][:10]
    S=sess.setdefault(sid,{"name":name,"first":d,"last":d,"orders":0,"rev":0.0,"items":{}})
    S["first"]=min(S["first"],d); S["last"]=max(S["last"],d)
    S["orders"]+=1; S["rev"]+=o["total"]["dollars"]
    for it in o.get("subtotal_items",[]):
        t=(it.get("title_translations") or {}).get("zh-hant") or "(無名)"
        typ=it.get("item_type"); q=it.get("quantity") or 0
        tot=(it.get("total") or {}).get("dollars") or 0.0
        price=(it.get("item_price") or {}).get("dollars") or 0.0
        key=f"{typ}|{t}|{price:.0f}"
        r=S["items"].setdefault(key,{"type":typ,"title":t,"price":price,"qty":0,"lines":0,"rev":0.0,
            "children":[(c.get("title_translations") or {}).get("zh-hant") for c in (it.get("child_products") or [])]})
        r["qty"]+=q; r["lines"]+=1; r["rev"]+=tot
out={"since":a.since,"orders_scanned":len(orders),
     "sessions":sorted(sess.values(),key=lambda x:x["first"])}
json.dump(out,open(a.out,"w"),ensure_ascii=False,indent=1)
print(f"團購場次 {len(sess)} → {a.out}")
