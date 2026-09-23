import json,re,urllib.request,collections,datetime
env=open('/Users/mac/Downloads/sam-agent/heiwei-review/.env.local').read()
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',env).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review"}
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H)))
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
rev=sum(x["total"]["dollars"] for x in px)
cust={x["customer_id"] for x in px if x.get("customer_id")}
byday=collections.Counter(x["created_at"][:10] for x in px)
print(f"品馨團 8/26–9/2：{len(px)} 單 / {len(cust)} 客 / 營收 NT${rev:,.0f} / 客單 ${rev/len(px):,.0f}")
print("每日單數:", "  ".join(f"{d[5:]}={n}" for d,n in sorted(byday.items())))
# 回頭客：這團客戶中，先前已有其他團購標籤的
prev_tag=0; names=[]
for cid in cust:
    c=get("https://open.shopline.io/v1/customers/"+cid)
    t=[x for x in (c.get("tags") or []) if x.startswith("團購-") and x!="團購-品馨"]
    if t: prev_tag+=1; names.append((c.get("name"),t))
print(f"其中 {prev_tag} 位帶有其他團主標籤（跨團）:")
for n,t in names: print("   ",n,t)
# 商品排行
p=collections.Counter()
for x in px:
    for it in x.get("subtotal_items",[]):
        ti=(it.get("title_translations") or {}).get("zh-hant") or ""
        p[ti]+=it.get("quantity") or 0
for k,v in p.most_common(8): print(f"  {v:>4} {k}")
