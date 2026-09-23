import json,re,urllib.request,time,os
sp=os.path.dirname(os.path.abspath(__file__))
env=open('/Users/mac/Downloads/sam-agent/heiwei-review/.env.local').read()
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',env).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review","Content-Type":"application/json"}
def api(u,data=None,m="GET"):
    for i in range(3):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,data=data,headers=H,method=m)))
        except Exception:
            if i==2: raise
            time.sleep(2)
NOW="6a8d14e8d99f5b000a1876db"; TAG="回頭客"
c=json.load(open(sp+"/pinxin_repeat.json"))
targets=[]
for cid,v in c.items():
    prior=[h for h in v["hist"] if h[4]!=NOW]; inside=[h for h in v["hist"] if h[4]==NOW]
    if prior or len(inside)>1: targets.append((cid,v["name"],"舊客回購" if prior else "團內重複"))
print("要標的回頭客:",len(targets))
ok=fail=0
for cid,name,kind in targets:
    try:
        api(f"https://open.shopline.io/v1/customers/{cid}/tags",
            json.dumps({"tags":[TAG],"update_mode":"add"}).encode(),"PATCH")
    except Exception as e:
        print("FAIL",name,str(e)[:90]); fail+=1; continue
    time.sleep(0.15)
    t=api("https://open.shopline.io/v1/customers/"+cid).get("tags") or []
    if TAG in t: ok+=1; print(f"OK  {name:<8} {kind}  {t}")
    else: fail+=1; print("FAIL(verify)",name,t)
print(f"\n成功 {ok} / 失敗 {fail}")
