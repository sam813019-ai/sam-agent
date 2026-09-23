import json,re,urllib.request,os,datetime
sp=os.path.dirname(os.path.abspath(__file__))
env=open('/Users/mac/Downloads/sam-agent/heiwei-review/.env.local').read()
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',env).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review"}
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H)))
NOW="6a8d14e8d99f5b000a1876db"; PX_OLD={'698acd2d224fc842c0b735d7','68f1e8395b978c00168541c5'}
WEB={None,'storefront','offline_store'}
c=json.load(open(sp+"/pinxin_repeat.json"))
out=[]
for cid,v in c.items():
    oth=[h for h in v["hist"] if h[4] not in WEB and h[4]!=NOW and h[4] not in PX_OLD]
    if not oth: continue
    orders=get(f"https://open.shopline.io/v1/orders?customer_id={cid}&per_page=100").get("items",[])
    def items(o):
        r=[]
        for it in o.get("subtotal_items",[]):
            t=(it.get("title_translations") or {}).get("zh-hant") or "(無標題)"
            q=it.get("quantity") or 1
            amt=(it.get("discounted_total") or it.get("total") or {}).get("dollars",0)
            r.append({"t":t,"q":q,"amt":amt})
        return r
    prev_orders=[];now_orders=[]
    for o in sorted(orders,key=lambda z:z["created_at"]):
        s=o.get("order_source") or {}; sid=s.get("source_id")
        rec={"no":o["order_number"],"date":o["created_at"][:10],
             "total":o["total"]["dollars"],
             "src":(s.get("name") or {}).get("zh-hant") or {"storefront":"官網","offline_store":"實體店"}.get(s.get("type"),"?"),
             "items":items(o)}
        if sid==NOW: now_orders.append(rec)
        elif sid not in WEB and sid not in PX_OLD: prev_orders.append(rec)
    out.append({"name":v["name"],"phone":v["phone"],"email":v["email"],
                "prev":prev_orders,"now":now_orders,
                "gap":(datetime.date.fromisoformat(now_orders[0]["date"])
                       -datetime.date.fromisoformat(prev_orders[-1]["date"])).days})
out.sort(key=lambda z:z["gap"])
json.dump(out,open(sp+"/cross_items.json","w"),ensure_ascii=False,indent=1)
print("跨團客戶",len(out),"位\n")
for p in out:
    print(f"■ {p['name']}　{p['phone'] or ''}　間隔 {p['gap']} 天")
    for o in p["prev"]:
        print(f"   前團 {o['date']} {o['src']}  NT${o['total']:,.0f}")
        for i in o["items"]: print(f"        - {i['t']} x{i['q']}  ${i['amt']:,.0f}")
    for o in p["now"]:
        print(f"   品馨 {o['date']}  NT${o['total']:,.0f}")
        for i in o["items"]: print(f"        - {i['t']} x{i['q']}  ${i['amt']:,.0f}")
    print()
