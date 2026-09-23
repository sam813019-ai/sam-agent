#!/usr/bin/env python3
"""產出品馨團兩份報告 HTML：內部 CRM 版（完整）與團主版（不揭露其他團）。"""
import json,re,urllib.request,collections,datetime,sys,os
SP=os.path.dirname(os.path.abspath(sys.argv[0]))
sp=sys.argv[1]  # scratchpad dir
env=open('/Users/mac/Downloads/sam-agent/heiwei-review/.env.local').read()
token=re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)',env).group(1).strip()
H={"authorization":"Bearer "+token,"User-Agent":"HEIWEI-review"}
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H)))
NOW="6a8d14e8d99f5b000a1876db"; PX_OLD={'698acd2d224fc842c0b735d7','68f1e8395b978c00168541c5'}
WEB={None,'storefront','offline_store'}
cust=json.load(open(sp+"/pinxin_repeat.json"))
crossitems=json.load(open(sp+"/cross_items.json"))

o=[];prev=None
while True:
    u="https://open.shopline.io/v1/orders?per_page=250&created_after=2026-08-25T00:00:00Z"
    if prev: u+="&previous_id="+prev
    it=get(u).get("items",[]); o+=it
    if len(it)<250: break
    prev=it[-1]["id"]
px=[x for x in o if (x.get("order_source") or {}).get("source_id")==NOW]
rev=sum(x["total"]["dollars"] for x in px)
byday=collections.Counter(x["created_at"][:10] for x in px)
prod=collections.Counter(); prodrev=collections.Counter()
for x in px:
    for it in x.get("subtotal_items",[]):
        t=(it.get("title_translations") or {}).get("zh-hant") or "(無標題)"
        prod[t]+=it.get("quantity") or 0
        prodrev[t]+=(it.get("discounted_total") or it.get("total") or {}).get("dollars",0)

# 分類（品牌視角）
newc=[];inteam=[];back=[]
for cid,v in cust.items():
    prior=[h for h in v["hist"] if h[4]!=NOW]; inside=[h for h in v["hist"] if h[4]==NOW]
    if prior: back.append((v,prior,inside))
    elif len(inside)>1: inteam.append((v,inside))
    else: newc.append(v)
# 分類（團主視角）
loyal=[];web=[];firsttime=[];cross=[]
for cid,v in cust.items():
    prior=[h for h in v["hist"] if h[4]!=NOW]; inside=[h for h in v["hist"] if h[4]==NOW]
    pxp=[h for h in prior if h[4] in PX_OLD]; wp=[h for h in prior if h[4] in WEB]
    oth=[h for h in prior if h[4] not in PX_OLD and h[4] not in WEB]
    if oth: cross.append((v,oth,inside))
    if pxp: loyal.append((v,pxp,inside))
    elif wp: web.append((v,wp,inside))
    else: firsttime.append((v,inside))
def d(s): return s[5:].replace("-","/")
def m(v): return f"{v:,.0f}"
def spend(v): return sum(h[2] for h in v["hist"])
def now_spend(inside): return sum(h[2] for h in inside)

CSS="""<style>
@page{size:A4;margin:14mm 12mm 15mm}
*{box-sizing:border-box}
body{font-family:"Noto Sans TC","PingFang TC",sans-serif;color:#25211e;margin:0;font-size:9.4pt;
 line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1{font-size:19pt;margin:0 0 2mm;letter-spacing:.04em}
h2{font-size:11.5pt;margin:8mm 0 3mm;padding-bottom:1.5mm;border-bottom:1.6px solid #25211e;letter-spacing:.06em}
h2 span{font-weight:400;color:#8a8078;font-size:9pt;letter-spacing:0}
h3{font-size:10pt;margin:5mm 0 2mm;color:#6f6862}
.hdr{border-bottom:3px solid #25211e;padding-bottom:4mm;margin-bottom:5mm}
.brand{font-size:8.4pt;letter-spacing:.3em;color:#a4998f;margin-bottom:2mm}
.lead{color:#6f6862;margin:0 0 5mm}
.kpis{display:flex;gap:2.5mm;margin:4mm 0}
.kpi{flex:1;border:1px solid #e2dcd5;border-top:3px solid #c98fa8;padding:3.2mm 2.8mm;background:#fbf9f7}
.kpi .v{font-size:15pt;font-weight:700;line-height:1.15}
.kpi .l{font-size:7.8pt;color:#8a8078;margin-top:1mm}
.kpi .s{font-size:7.4pt;color:#a4998f;margin-top:.5mm}
table{width:100%;border-collapse:collapse;margin-top:2mm}
th{font-size:8pt;color:#8a8078;text-align:left;font-weight:600;border-bottom:1px solid #d8d1c9;padding:2mm 1.6mm}
td{padding:1.9mm 1.6mm;border-bottom:1px solid #efeae5;vertical-align:top}
tr:nth-child(even) td{background:#fbf9f7}
tr{page-break-inside:avoid}
.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.sub{color:#8a8078;font-size:7.6pt;word-break:break-all}
.note{background:#faf7f3;border-left:3px solid #c98fa8;padding:3.2mm 4mm;margin:4mm 0;font-size:8.8pt}
.note b{display:block;margin-bottom:1mm}
.bar{display:inline-block;height:2.6mm;background:#c98fa8;vertical-align:middle;border-radius:1px}
ol,ul{margin:2mm 0;padding-left:5mm} li{margin:1.4mm 0}
code{background:#f2ede7;padding:.2mm 1.1mm;font-size:8.2pt;font-family:Menlo,monospace}
.foot{margin-top:7mm;padding-top:3mm;border-top:1px solid #d8d1c9;color:#a4998f;font-size:7.8pt}
.pb{page-break-before:always}
.it{font-size:8.1pt;color:#4a4440;padding:.25mm 0 .25mm 2.2mm;border-left:1.5px solid #e6ded6;line-height:1.35}
.amt{color:#a4998f;font-variant-numeric:tabular-nums}
.od{font-size:8.3pt;color:#8a8078;margin:.8mm 0 .6mm}
.mult{font-size:11pt;font-weight:700;font-variant-numeric:tabular-nums}
.mult.up{color:#b0567f}
.note .em{font-weight:700;color:#b0567f}
.big{font-size:13pt;font-weight:700}
</style>"""

maxday=max(byday.values())
dayrows="".join(f"<tr><td>{d(k)}</td><td class=n>{v}</td><td><span class=bar style='width:{v/maxday*38}mm'></span></td>"
                f"<td class=n>{m(sum(x['total']['dollars'] for x in px if x['created_at'][:10]==k))}</td></tr>"
                for k,v in sorted(byday.items()))
prodrows="".join(f"<tr><td>{k}</td><td class=n>{v}</td><td class=n>{m(prodrev[k])}</td></tr>"
                 for k,v in prod.most_common(12))

# ── 內部 CRM 版 ──────────────────────────────────
backrows="".join(
 f"<tr><td><b>{v['name']}</b><div class=sub>{v['phone'] or ''} {v['email'] or ''}</div></td>"
 f"<td class=n>{len(v['hist'])}</td><td class=n>{m(spend(v))}</td>"
 f"<td class=n>{m(now_spend(i))}</td>"
 f"<td class=n>{(datetime.date.fromisoformat(i[0][1])-datetime.date.fromisoformat(p[-1][1])).days}</td>"
 f"<td class=sub style='font-size:8.2pt;color:#6f6862'>{p[-1][3]}<br>{p[-1][1]}</td></tr>"
 for v,p,i in sorted(back,key=lambda z:-spend(z[0])))
inteamrows="".join(
 f"<tr><td><b>{v['name']}</b><div class=sub>{v['phone'] or ''}</div></td><td class=n>{len(i)}</td>"
 f"<td class=n>{m(now_spend(i))}</td><td class=sub style='font-size:8.2pt'>"
 +" ".join(f"{d(h[1])} ${m(h[2])}" for h in i)+"</td></tr>"
 for v,i in sorted(inteam,key=lambda z:-now_spend(z[1])))
crossrows="".join(
 f"<tr><td><b>{v['name']}</b><div class=sub>{v['phone'] or ''}</div></td>"
 f"<td>{o[-1][3]}</td><td class=n>{o[-1][1]}</td>"
 f"<td class=n>{(datetime.date.fromisoformat(i[0][1])-datetime.date.fromisoformat(o[-1][1])).days}</td>"
 f"<td class=n>{m(now_spend(i))}</td></tr>"
 for v,o,i in sorted(cross,key=lambda z:(datetime.date.fromisoformat(z[2][0][1])-datetime.date.fromisoformat(z[1][-1][1])).days))
def ilist(o):
    return "".join(f"<div class=it>{i['t']}"+(f" ×{i['q']}" if i['q']>1 else "")
                   +(f" <span class=amt>${m(i['amt'])}</span>" if i['amt'] else " <span class=amt>贈品</span>")
                   +"</div>" for i in o["items"])
ci_rows=""
for p_ in crossitems:
    pv=sum(o["total"] for o in p_["prev"]); nw=sum(o["total"] for o in p_["now"])
    mult=nw/pv if pv else 0
    ci_rows+=(f"<tr><td><b>{p_['name']}</b><div class=sub>{p_['phone'] or ''}</div>"
      f"<div class=sub style='margin-top:1mm'>間隔 {p_['gap']} 天</div></td>"
      +"<td>"+"".join(f"<div class=od>{o['date'].replace('-','/')}　{o['src']}　<b>${m(o['total'])}</b></div>"+ilist(o) for o in p_["prev"])+"</td>"
      +"<td>"+"".join(f"<div class=od>{o['date'].replace('-','/')}　品馨團　<b>${m(o['total'])}</b></div>"+ilist(o) for o in p_["now"])+"</td>"
      +f"<td class=n><span class='mult{' up' if mult>=1.5 else ''}'>{mult:.1f}×</span>"
      f"<div class=sub style='margin-top:1mm'>${m(pv)}<br>→ ${m(nw)}</div></td></tr>")
ci_pv=sum(sum(o["total"] for o in p_["prev"]) for p_ in crossitems)
ci_nw=sum(sum(o["total"] for o in p_["now"]) for p_ in crossitems)

top=sorted(cust.values(),key=lambda v:-spend(v))[:12]
toprows="".join(f"<tr><td><b>{v['name']}</b><div class=sub>{v['phone'] or ''} {v['email'] or ''}</div></td>"
                f"<td class=n>{len(v['hist'])}</td><td class=n>{m(spend(v))}</td>"
                f"<td class=n>{m(spend(v)/len(v['hist']))}</td></tr>" for v in top)
sleep=[(v,p,i) for v,p,i in back
       if (datetime.date.fromisoformat(i[0][1])-datetime.date.fromisoformat(p[-1][1])).days>=180]
sleeprows="".join(f"<tr><td><b>{v['name']}</b><div class=sub>{v['phone'] or ''} {v['email'] or ''}</div></td>"
                  f"<td class=n>{(datetime.date.fromisoformat(i[0][1])-datetime.date.fromisoformat(p[-1][1])).days}</td>"
                  f"<td class=n>{m(spend(v))}</td><td class=sub style='font-size:8.2pt'>{p[-1][3]}</td></tr>"
 for v,p,i in sorted(sleep,key=lambda z:-(datetime.date.fromisoformat(z[2][0][1])-datetime.date.fromisoformat(z[1][-1][1])).days))
sp_new=sum(now_spend([h for h in v['hist'] if h[4]==NOW]) for v in newc)
sp_in=sum(now_spend(i) for v,i in inteam)
sp_bk=sum(now_spend(i) for v,p,i in back)

crm=f"""<title>品馨團 CRM 分析</title>{CSS}
<div class=hdr><div class=brand>HEIWEI 何謂美｜CRM 內部文件</div>
<h1>品馨團 顧客結構分析</h1>
<div class=lead>開團期間 2026/08/26–09/02（8 天）　資料截至 2026/09/03　顧客標籤：<code>團購-品馨</code>
<br>本文件含顧客個資與跨團資訊，<b>限內部使用，不得提供團主或外部夥伴</b>。</div></div>
<div class=kpis>
<div class=kpi><div class=v>163</div><div class=l>訂單</div><div class=s>8 天</div></div>
<div class=kpi><div class=v>142</div><div class=l>顧客</div><div class=s>已全數上標籤</div></div>
<div class=kpi><div class=v>{m(rev)}</div><div class=l>營收 NT$</div><div class=s>客單 ${m(rev/len(px))}</div></div>
<div class=kpi><div class=v>35%</div><div class=l>回頭客佔比</div><div class=s>50 / 142 位</div></div>
<div class=kpi><div class=v>13</div><div class=l>跨團重疊</div><div class=s>來自其他團主</div></div>
</div>

<h2>一、顧客結構 <span>品牌視角：以「是否買過何謂美」區分</span></h2>
<table>
<tr><th>分類</th><th class=n>人數</th><th class=n>佔比</th><th class=n>本團營收</th><th class=n>營收佔比</th><th class=n>人均消費</th></tr>
<tr><td><b>全新客</b><div class=sub>第一次買何謂美，且本團只下一單</div></td><td class=n>{len(newc)}</td>
 <td class=n>65%</td><td class=n>{m(sp_new)}</td><td class=n>50%</td><td class=n>{m(sp_new/len(newc))}</td></tr>
<tr><td><b>團內重複下單</b><div class=sub>以前沒買過，但本團下了 2 單以上</div></td><td class=n>{len(inteam)}</td>
 <td class=n>10%</td><td class=n>{m(sp_in)}</td><td class=n>23%</td><td class=n>{m(sp_in/len(inteam))}</td></tr>
<tr><td><b>舊客回購</b><div class=sub>開團前就買過何謂美</div></td><td class=n>{len(back)}</td>
 <td class=n>25%</td><td class=n>{m(sp_bk)}</td><td class=n>27%</td><td class=n>{m(sp_bk/len(back))}</td></tr>
</table>
<div class=note><b>回頭客人均消費是新客的 1.4–3 倍</b>
團內重複下單者只佔 10% 人數，卻貢獻 23% 營收、人均 ${m(sp_in/len(inteam))}，是新客的 3 倍。
她們的行為是「先下一單試水溫 → 幾天內回頭補購加購品」，代表加購區塊與滿額門檻設計有效，
下一團可把加購曝光再往前挪。</div>

<div class=pb></div>
<h2>二、舊客回購名單 <span>{len(back)} 位，依累計消費排序</span></h2>
<table><tr><th>顧客</th><th class=n>歷來單數</th><th class=n>累計消費</th><th class=n>本團消費</th><th class=n>距上次(天)</th><th>上次購買來源</th></tr>
{backrows}</table>

<div class=pb></div>
<h2>三、團內重複下單 <span>{len(inteam)} 位，本團就買了第二次</span></h2>
<table><tr><th>顧客</th><th class=n>單數</th><th class=n>本團消費</th><th>訂單序列</th></tr>{inteamrows}</table>

<h2>四、跨團重疊客戶 <span>{len(cross)} 位，同時是其他團主的客人</span></h2>
<div class=lead>這些人在其他團主的團也買過。<b>此節資訊不得出現在給團主的報告中。</b>
依間隔天數由短至長排列。</div>
<table>
<tr><th style="width:22%">顧客</th><th style="width:30%">前一團買了什麼</th><th style="width:32%">品馨團買了什麼</th><th class=n style="width:16%">金額變化</th></tr>
{ci_rows}
<tr style="border-top:2px solid #25211e"><td><b>合計</b></td><td class=n>${m(ci_pv)}</td>
<td class=n>${m(ci_nw)}</td><td class=n><span class="mult up">{ci_nw/ci_pv:.1f}×</span></td></tr>
</table>
<div class=note><b>不是分食，是升級</b>
這 13 位在前一團合計只花 ${m(ci_pv)}，到品馨團花了 ${m(ci_nw)}，<span class=em>客單放大 {ci_nw/ci_pv:.1f} 倍</span>。
關鍵在品項結構：她們在前一團買的幾乎都是單價 $1,000–$2,000 的防曬小組合，
到品馨團則升級成「洗安蜜懶人保養組」($3,680)、「水安瓶」「蜜蜜霜」等高單價保養品。
代表這批人是<span class=em>被防曬品帶進來、再被保養組合留下</span>的典型路徑 ——
低單價防曬是入門磁鐵，保養組才是利潤來源，兩者搭配的團購設計是有效的。</div>
<div class=note><b>檔期排程風險</b>Yboutique 團（8/20–8/24）結束後 4–12 天內，就有 9 位同一批客人再買品馨團。
短期重複曝光同一族群雖然這次拉出了高客單，但會加速名單疲乏；
建議同族群團主檔期至少間隔 3–4 週，或刻意錯開主打品類（防曬 vs 保養）避免互相稀釋。</div>

<div class=pb></div>
<h2>五、高價值顧客 <span>累計消費 TOP 12，建議轉入 VIP 經營</span></h2>
<table><tr><th>顧客</th><th class=n>歷來單數</th><th class=n>累計消費</th><th class=n>平均客單</th></tr>{toprows}</table>

<h2>六、沉睡喚醒 <span>距上次購買 180 天以上、本團被拉回來的 {len(sleep)} 位</span></h2>
<table><tr><th>顧客</th><th class=n>沉睡天數</th><th class=n>累計消費</th><th>上次來源</th></tr>{sleeprows}</table>
<div class=note><b>團購是有效的沉睡喚醒管道</b>最久的沉睡 525 天後被拉回。
CRM 名單中的高價值沉睡客，可優先在下一檔團購前定向邀請，而非只靠官網 EDM。</div>

<div class=pb></div>
<h2>七、每日單量與商品表現</h2>
<h3>每日訂單</h3>
<table><tr><th>日期</th><th class=n>訂單</th><th></th><th class=n>營收 NT$</th></tr>{dayrows}</table>
<h3>熱賣商品 TOP 12（件數）</h3>
<table><tr><th>商品</th><th class=n>件數</th><th class=n>營收 NT$</th></tr>{prodrows}</table>

<h2>八、後續行動</h2>
<ol>
<li><b>50 位回頭客</b>（團內重複 14 + 舊客回購 36）建議加掛 <code>回頭客</code> 標籤，與一次性新客分流推播。</li>
<li><b>92 位全新客</b>是首購，7–14 天內是回購黃金期，建議在收團後兩週內推一次專屬優惠。</li>
<li><b>高價值 TOP 12</b> 累計消費 $17,000 以上，轉入 VIP 一對一經營，不再走群發。</li>
<li><b>13 位跨團重疊</b>不列入團主報告；排檔期時避免同族群連續曝光。</li>
<li><b>品馨自己的回頭客 17 位</b>（含 10 月團 8 位、2 月團 9 位）可作為與團主續約的談判依據。</li>
</ol>
<div class=foot>HEIWEI 何謂美｜品馨團 CRM 分析　產出 2026/09/03　資料來源 Shopline Open API（order_source 歸團）　內部限定</div>
"""
open(sp+"/crm.html","w").write(crm)

# ── 團主版 ───────────────────────────────────────
loyalrows="".join(
 f"<tr><td><b>{v['name']}</b></td><td class=n>{p[-1][1].replace('-','/')}</td><td class=n>{m(p[-1][2])}</td>"
 f"<td class=n>{m(now_spend(i))}</td>"
 f"<td class=n>{(datetime.date.fromisoformat(i[0][1])-datetime.date.fromisoformat(p[-1][1])).days}</td></tr>"
 for v,p,i in sorted(loyal,key=lambda z:-now_spend(z[2])))
webrows="".join(f"<tr><td><b>{v['name']}</b></td><td class=n>{p[-1][1].replace('-','/')}</td><td class=n>{m(now_spend(i))}</td></tr>"
 for v,p,i in sorted(web,key=lambda z:-now_spend(z[2])))
repeat_in="".join(f"<tr><td><b>{v['name']}</b></td><td class=n>{len(i)}</td><td class=n>{m(now_spend(i))}</td>"
 f"<td class=sub style='font-size:8.2pt'>"+" ".join(f"{d(h[1])} ${m(h[2])}" for h in i)+"</td></tr>"
 for v,i in sorted(inteam,key=lambda z:-now_spend(z[1])))
sp_loyal=sum(now_spend(i) for v,p,i in loyal); sp_web=sum(now_spend(i) for v,p,i in web)
sp_first=sum(now_spend(i) for v,i in firsttime)

owner=f"""<title>品馨團 成果報告</title>{CSS}
<div class=hdr><div class=brand>HEIWEI 何謂美 ｘ 品馨</div>
<h1>開團成果報告</h1>
<div class=lead>開團期間 2026/08/26–09/02（8 天）　資料截至 2026/09/03</div></div>
<div class=kpis>
<div class=kpi><div class=v>163</div><div class=l>訂單</div><div class=s>平均每天 20 單</div></div>
<div class=kpi><div class=v>142</div><div class=l>顧客</div><div class=s>不重複人數</div></div>
<div class=kpi><div class=v>{m(rev)}</div><div class=l>營收 NT$</div><div class=s>客單 ${m(rev/len(px))}</div></div>
<div class=kpi><div class=v>{len(loyal)}</div><div class=l>回頭客</div><div class=s>前兩檔也跟你買</div></div>
</div>

<h2>一、這次的顧客組成</h2>
<table>
<tr><th>分類</th><th class=n>人數</th><th class=n>佔比</th><th class=n>營收 NT$</th><th class=n>人均</th></tr>
<tr><td><b>首次跟你買</b><div class=sub>這次是第一次在你的團下單</div></td><td class=n>{len(firsttime)}</td>
 <td class=n>{len(firsttime)/142*100:.0f}%</td><td class=n>{m(sp_first)}</td><td class=n>{m(sp_first/len(firsttime))}</td></tr>
<tr><td><b>你的回頭客</b><div class=sub>2025/10 或 2026/02 那兩檔也跟你買過</div></td><td class=n>{len(loyal)}</td>
 <td class=n>{len(loyal)/142*100:.0f}%</td><td class=n>{m(sp_loyal)}</td><td class=n>{m(sp_loyal/len(loyal))}</td></tr>
<tr><td><b>何謂美品牌舊客</b><div class=sub>以前在官網買過，這次第一次跟你買</div></td><td class=n>{len(web)}</td>
 <td class=n>{len(web)/142*100:.0f}%</td><td class=n>{m(sp_web)}</td><td class=n>{m(sp_web/len(web))}</td></tr>
</table>
<div class=note><b>你的回頭客人均 ${m(sp_loyal/len(loyal))}，是首購客的 {sp_loyal/len(loyal)/(sp_first/len(firsttime)):.1f} 倍</b>
{len(loyal)} 位在你前兩檔買過的客人，這次又回來了，而且買得更多。
她們平均隔了 {sum((datetime.date.fromisoformat(i[0][1])-datetime.date.fromisoformat(p[-1][1])).days for v,p,i in loyal)//len(loyal)} 天再回購——
這代表你的客人會「等你開團」，是很健康的訊號。</div>

<h2>二、你的回頭客名單 <span>{len(loyal)} 位</span></h2>
<table><tr><th>顧客</th><th class=n>上次跟你買</th><th class=n>上次金額</th><th class=n>這次金額</th><th class=n>間隔(天)</th></tr>
{loyalrows}</table>

<div class=pb></div>
<h2>三、何謂美品牌舊客 <span>{len(web)} 位，以前在官網買過，這次第一次跟你買</span></h2>
<table><tr><th>顧客</th><th class=n>上次在官網購買</th><th class=n>這次金額</th></tr>{webrows}</table>

<h2>四、同一檔買兩次以上的客人 <span>{len(inteam)} 位</span></h2>
<div class=lead>這些人在開團期間下了第二單，多半是先買主商品、之後回頭補加購品。人均 ${m(sp_in/len(inteam))}，是整體客單的 {(sp_in/len(inteam))/(rev/len(px)):.1f} 倍。</div>
<table><tr><th>顧客</th><th class=n>單數</th><th class=n>合計</th><th>下單日與金額</th></tr>{repeat_in}</table>

<div class=pb></div>
<h2>五、每日單量</h2>
<table><tr><th>日期</th><th class=n>訂單</th><th></th><th class=n>營收 NT$</th></tr>{dayrows}</table>
<div class=note><b>尾盤衝刺明顯</b>最後一天 9/02 收 32 單，是全期最高；8/30（週日）只有 9 單是低點。
下次開團建議在收團前 24 小時再提醒一次，效果最直接。</div>

<h2>六、熱賣商品</h2>
<table><tr><th>商品</th><th class=n>件數</th><th class=n>營收 NT$</th></tr>{prodrows}</table>

<h2>七、下一檔的建議</h2>
<ol>
<li><b>回頭客先開預購</b>：{len(loyal)} 位回頭客可在開團前一天先發連結，衝首日聲量。</li>
<li><b>加購品提前曝光</b>：同檔買兩次的 {len(inteam)} 位人均 ${m(sp_in/len(inteam))}，把加購品放在第一屏可減少二次下單的麻煩。</li>
<li><b>收團前 24 小時提醒</b>：最後一天貢獻 {byday[max(byday,key=byday.get)]/len(px)*100:.0f}% 的單量。</li>
<li><b>首購客追蹤</b>：{len(firsttime)} 位第一次跟你買的客人，是下一檔回頭客的來源。</li>
</ol>
<div class=foot>HEIWEI 何謂美 ｘ 品馨　開團成果報告　產出 2026/09/03</div>
"""
open(sp+"/owner.html","w").write(owner)
print("wrote crm.html / owner.html")
print("團主視角: 首次",len(firsttime),"回頭",len(loyal),"官網舊客",len(web))
