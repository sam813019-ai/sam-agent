#!/usr/bin/env python3
"""抓某一團的客戶與其完整購買歷史。用法: team_fetch.py <source_id> <out.json> <created_after> <created_before>"""
import json,re,urllib.request,sys,time
env=open('/Users/mac/Downloads/sam-agent/heiwei-review/.env.local').read()
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',env).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review"}
def get(u):
    for i in range(3):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H)))
        except Exception:
            if i==2: raise
            time.sleep(2)
SIDS=set(sys.argv[1].split(","));OUT,AFTER,BEFORE=sys.argv[2],sys.argv[3],sys.argv[4]
o=[];prev=None
while True:
    u=f"https://open.shopline.io/v1/orders?per_page=250&created_after={AFTER}&created_before={BEFORE}"
    if prev: u+="&previous_id="+prev
    it=get(u).get("items",[]); o+=it
    if len(it)<250: break
    prev=it[-1]["id"]
tm=[x for x in o if (x.get("order_source") or {}).get("source_id") in SIDS]
print("團內訂單",len(tm))
cust={}
for x in tm:
    cid=x.get("customer_id")
    if not cid: continue
    c=cust.setdefault(cid,{"name":x.get("customer_name"),"phone":x.get("customer_phone"),
                           "email":x.get("customer_email"),"cl":[],"items":[]})
    c["cl"].append({"date":x["created_at"][:10],"total":x["total"]["dollars"]})
    for it in x.get("subtotal_items",[]):
        c["items"].append({"t":(it.get("title_translations") or {}).get("zh-hant") or "",
                           "q":it.get("quantity") or 1,
                           "amt":(it.get("discounted_total") or it.get("total") or {}).get("dollars",0)})
print("客戶",len(cust))
for i,(cid,v) in enumerate(cust.items(),1):
    h=get(f"https://open.shopline.io/v1/orders?customer_id={cid}&per_page=100").get("items",[])
    v["hist"]=sorted([{"no":x["order_number"],"date":x["created_at"][:10],"total":x["total"]["dollars"],
        "sid":(x.get("order_source") or {}).get("source_id"),
        "src":((x.get("order_source") or {}).get("name") or {}).get("zh-hant")
              or {"storefront":"官網","offline_store":"實體店"}.get((x.get("order_source") or {}).get("type"),"?"),
        "items":[{"t":(it.get("title_translations") or {}).get("zh-hant") or "","q":it.get("quantity") or 1,
                  "amt":(it.get("discounted_total") or it.get("total") or {}).get("dollars",0)}
                 for it in x.get("subtotal_items",[])]}
        for x in h],key=lambda z:z["date"])
    if i%50==0: print(f"  ...{i}/{len(cust)}",flush=True)
json.dump(cust,open(OUT,"w"),ensure_ascii=False)
print("saved",OUT)
