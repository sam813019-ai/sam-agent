import json,re,urllib.request,time
env=open('/Users/mac/Downloads/sam-agent/heiwei-review/.env.local').read()
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',env).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review","Content-Type":"application/json"}
def api(u,d=None,m="GET"): return json.load(urllib.request.urlopen(urllib.request.Request(u,data=d,headers=H,method=m)))
r=api("https://open.shopline.io/v1/customers/search?query=sam813019@gmail.com")
items=r.get("items",[])
if not items: print("找不到"); raise SystemExit
cid=items[0]["id"]; print("測試對象:",items[0].get("name"),cid,"現有標籤:",items[0].get("tags"))
TAG="ZZ測試標籤請忽略"
api(f"https://open.shopline.io/v1/customers/{cid}/tags",json.dumps({"tags":[TAG],"update_mode":"add"}).encode(),"PATCH")
time.sleep(0.5); print("add 後:",api("https://open.shopline.io/v1/customers/"+cid).get("tags"))
for mode in ("remove","delete"):
    try:
        api(f"https://open.shopline.io/v1/customers/{cid}/tags",json.dumps({"tags":[TAG],"update_mode":mode}).encode(),"PATCH")
        time.sleep(0.5); t=api("https://open.shopline.io/v1/customers/"+cid).get("tags")
        print(f"update_mode={mode} → 標籤現在:",t)
        if TAG not in (t or []): print(f"✅ update_mode={mode} 可移除單一標籤"); break
    except Exception as e: print(f"update_mode={mode} 失敗:",str(e)[:120])
