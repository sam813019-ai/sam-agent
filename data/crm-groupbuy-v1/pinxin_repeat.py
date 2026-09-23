import json,re,urllib.request,collections,datetime,os
sp=os.path.dirname(os.path.abspath(__file__))
env=open('/Users/mac/Downloads/sam-agent/heiwei-review/.env.local').read()
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',env).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review"}
def get(u):
    for i in range(3):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H)))
        except Exception as e:
            if i==2: raise
            import time; time.sleep(2)
SID="6a8d14e8d99f5b000a1876db"
o=[];prev=None
while True:
    u="https://open.shopline.io/v1/orders?per_page=250&created_after=2026-08-25T00:00:00Z"
    if prev: u+="&previous_id="+prev
    it=get(u).get("items",[])
    o+=it
    if len(it)<250: break
    prev=it[-1]["id"]
px=[x for x in o if (x.get("order_source") or {}).get("source_id")==SID]
cust={}
for x in px:
    cid=x.get("customer_id")
    if not cid: continue
    c=cust.setdefault(cid,{"name":x.get("customer_name"),"phone":x.get("customer_phone"),
                           "email":x.get("customer_email"),"px":[],"hist":[]})
    c["px"].append((x["order_number"],x["created_at"][:10],x["total"]["dollars"]))
print("品馨團客戶",len(cust))
def src(x):
    s=x.get("order_source") or {}
    n=(s.get("name") or {}).get("zh-hant")
    return n or {"storefront":"官網","offline_store":"實體店"}.get(s.get("type"),s.get("type") or "?")
for i,(cid,c) in enumerate(cust.items(),1):
    h=get(f"https://open.shopline.io/v1/orders?customer_id={cid}&per_page=100").get("items",[])
    c["hist"]=sorted([(x["order_number"],x["created_at"][:10],x["total"]["dollars"],src(x),
                       (x.get("order_source") or {}).get("source_id")) for x in h],key=lambda z:z[1])
    if i%40==0: print(f"  ...{i}/{len(cust)}",flush=True)
json.dump(cust,open(sp+"/pinxin_repeat.json","w"),ensure_ascii=False)

new=[];inteam=[];back=[]
for cid,c in cust.items():
    before=[h for h in c["hist"] if h[4]!=SID]
    inside=[h for h in c["hist"] if h[4]==SID]
    if before: back.append((cid,c,before,inside))
    elif len(inside)>1: inteam.append((cid,c,inside))
    else: new.append((cid,c))
print(f"\n===== 分類 =====")
print(f"全新客（此團首購且只買一次）: {len(new)}")
print(f"團內重複下單（同團買 2 次以上、但以前沒買過）: {len(inteam)}")
print(f"舊客回購（此團之前就跟何謂美買過）: {len(back)}")

print(f"\n===== 舊客回購 {len(back)} 位 =====")
for cid,c,before,inside in sorted(back,key=lambda z:z[2][0][1]):
    tot=sum(h[2] for h in c["hist"])
    gap=(datetime.date.fromisoformat(inside[0][1])-datetime.date.fromisoformat(before[-1][1])).days
    print(f"\n{c['name']}  {c['phone'] or ''} {c['email'] or ''}  ｜歷來 {len(c['hist'])} 單 / 累計 ${tot:,.0f} ｜距上次 {gap} 天")
    for h in before: print(f"    舊 {h[1]}  ${h[2]:>8,.0f}  {h[3]}")
    for h in inside: print(f"    ★ {h[1]}  ${h[2]:>8,.0f}  品馨團")

print(f"\n===== 團內重複下單 {len(inteam)} 位 =====")
for cid,c,inside in inteam:
    print(f"{c['name']}  {len(inside)} 單 / ${sum(h[2] for h in inside):,.0f}  " + " ".join(f"{h[1][5:]}(${h[2]:,.0f})" for h in inside))
