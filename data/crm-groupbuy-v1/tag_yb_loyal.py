import json,re,urllib.request,time,os
sp=os.path.dirname(os.path.abspath(__file__))
env=open('/Users/mac/Downloads/sam-agent/heiwei-review/.env.local').read()
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',env).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review","Content-Type":"application/json"}
def api(u,d=None,m="GET"):
    for i in range(3):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,data=d,headers=H,method=m)))
        except Exception:
            if i==2: raise
            time.sleep(2)
MAY='69f055f1d1bff05f11af8636'; AUG='6a869d73b02c3b16856b59c3'
yb=json.load(open(sp+"/yb.json")); TAG="V1-YB忠誠客"
tgt=[cid for cid,v in yb.items()
     if any(o['sid']==MAY for o in v['hist']) and any(o['sid']==AUG for o in v['hist'])
     and v['name'] not in {'宋珮瑄','冀子琪'} and cid!='68a06427b9a091000de10637']
print("兩檔都買、需補標的:",len(tgt))
ok=fail=0
for cid in tgt:
    try:
        api(f"https://open.shopline.io/v1/customers/{cid}/tags",
            json.dumps({"tags":[TAG],"update_mode":"add"}).encode(),"PATCH")
        time.sleep(0.12)
        if TAG in (api("https://open.shopline.io/v1/customers/"+cid).get("tags") or []): ok+=1
        else: fail+=1
    except Exception as e: fail+=1; print("FAIL",cid,str(e)[:70])
print(f"成功 {ok} / 失敗 {fail}")
