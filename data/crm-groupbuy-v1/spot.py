import json,re,urllib.request,collections
env=open('/Users/mac/Downloads/sam-agent/heiwei-review/.env.local').read()
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',env).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review"}
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H)))
for q in ["fet0938605114@gmail.com","0963527530","0917100977","0911271453"]:
    r=get("https://open.shopline.io/v1/customers/search?query="+q).get("items",[])
    if r: print(f"{r[0].get('name'):<10}", sorted(r[0].get('tags') or []))
