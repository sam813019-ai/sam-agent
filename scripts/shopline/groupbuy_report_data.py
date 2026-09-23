#!/usr/bin/env python3
"""彙整團購標籤報告所需數據：每團單數/客數/營收/AOV + 跨團客戶名單。
輸出 report_data.json（給 build_groupbuy_report.py 產 PDF 用）。"""
import json,os,re,sys,urllib.request,collections
BASE="https://open.shopline.io/v1"
ENV="/Users/mac/Downloads/sam-agent/heiwei-review/.env.local"
OUT=os.environ.get("SL_OUT","report_data.json")
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',open(ENV).read()).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review"}
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H)))

OV={'QUALｘCOCOｘ何謂美 爆白團0622-0623':'COCO','歐巴藥師99ｘ何謂美':'歐巴藥師',
    '宜蓁首團ｘ 新版2.0爆白':'宜蓁','樂樂團購8/16~8/23':'樂樂'}
def owner(n):
    if n in OV: return OV[n]
    x=re.split(r'\s*[ｘ×✕]\s*|\s+x\s+',n)[0]
    x=re.sub(r'(團購|首團|團)?\s*[\d/~\-\.]*$','',x)
    return re.sub(r'\s+','',x)

orders=[];prev=None;n=0
while True:
    u=f"{BASE}/orders?per_page=250&created_after=2023-01-01T00:00:00Z"
    if prev: u+="&previous_id="+prev
    it=get(u).get("items",[])
    if not it: break
    orders+=it; n+=len(it)
    print(f"...{n}",file=sys.stderr,flush=True)
    if len(it)<250: break
    prev=it[-1]["id"]

teams=collections.defaultdict(lambda:{"tag":None,"sessions":[],"orders":0,"revenue":0.0,"customers":set()})
cust_teams=collections.defaultdict(set)
cust_orders=collections.defaultdict(list)
for o in orders:
    s=o.get("order_source") or {}
    if s.get("type")!="one_page_store": continue
    name=(s.get("name") or {}).get("zh-hant") or ""
    tag="團購-"+owner(name)
    sid=s.get("source_id")
    t=teams[tag]; t["tag"]=tag
    d=o["created_at"][:10]
    ses=t.setdefault("sess",{}).setdefault(sid,{"name":name,"first":d,"last":d,"orders":0,"rev":0.0,"cust":set()})
    ses["first"]=min(ses["first"],d); ses["last"]=max(ses["last"],d)
    ses["orders"]+=1; ses["rev"]+=o["total"]["dollars"]
    if o.get("customer_id"): ses["cust"].add(o["customer_id"])
    t["orders"]+=1; t["revenue"]+=o["total"]["dollars"]
    cid=o.get("customer_id")
    if cid:
        t["customers"].add(cid); cust_teams[cid].add(tag)
        cust_orders[cid].append({"tag":tag,"team":name,"no":o["order_number"],
                                 "date":o["created_at"][:10],"total":o["total"]["dollars"]})

multi=sorted([c for c,t in cust_teams.items() if len(t)>1])
people=[]
for cid in multi:
    try: c=get(f"{BASE}/customers/{cid}")
    except Exception: c={}
    ords=sorted(cust_orders[cid],key=lambda x:x["date"])
    people.append({"id":cid,"name":c.get("name") or "(未填)","email":c.get("email") or "",
                   "phone":c.get("mobile_phone") or c.get("phone") or "",
                   "tags":sorted(cust_teams[cid]),"order_count":c.get("order_count"),
                   "gb_orders":ords,"gb_total":round(sum(x["total"] for x in ords)),
                   "gap":(__import__("datetime").date.fromisoformat(ords[-1]["date"])
                          -__import__("datetime").date.fromisoformat(ords[0]["date"])).days})
out={"generated":"2026-08-27","total_orders_scanned":n,
     "unique_customers":len(cust_teams),
     "assignments":sum(len(v) for v in cust_teams.values()),
     "teams":[{"tag":k,"orders":v["orders"],"revenue":round(v["revenue"]),
               "customers":len(v["customers"]),
               "sessions":[{"name":x["name"],"first":x["first"],"last":x["last"],
                            "orders":x["orders"],"revenue":round(x["rev"]),"customers":len(x["cust"])}
                           for x in sorted(v["sess"].values(),key=lambda z:z["first"])]}
              for k,v in sorted(teams.items(),key=lambda kv:-len(kv[1]["customers"]))],
     "cross":people}
json.dump(out,open(OUT,"w"),ensure_ascii=False,indent=1)
print(f"團 {len(teams)}／跨團客 {len(people)} → {OUT}")
