#!/usr/bin/env python3
"""Stella 團 CRM 行動方案報告。用法: stella_report.py <scratchpad>"""
import json,sys,re,collections,datetime,statistics as st
sp=sys.argv[1]
c=json.load(open(sp+"/stella.json"))
TODAY=datetime.date(2026,9,3)
def dt(s): return datetime.date.fromisoformat(s)
def m(v): return f"{v:,.0f}"
def lt(v): return sum(o['total'] for o in v['hist'])
def bottles(v):
    b=0
    for i in v['items']:
        mm=re.search(r'([１２３５1235])入',i['t'])
        if mm: b+={'１':1,'２':2,'３':3,'５':5,'1':1,'2':2,'3':3,'5':5}[mm.group(1)]*i['q']
    return b
def outdate(v): return dt(v['cl'][0]['date'])+datetime.timedelta(days=50*bottles(v))

n=len(c); orders=sum(len(v['cl']) for v in c.values())
rev=sum(o['total'] for v in c.values() for o in v['cl'])
rows=sorted(c.values(),key=lambda v:(outdate(v),-lt(v)))
BULK={'陳佳妤'}
soon=[v for v in rows if outdate(v)<=datetime.date(2026,9,30) and v['name'] not in BULK]
mid =[v for v in rows if datetime.date(2026,9,30)<outdate(v)<=datetime.date(2026,12,31) and v['name'] not in BULK]
late=[v for v in rows if outdate(v)>datetime.date(2026,12,31) and v['name'] not in BULK]
bulk=[v for v in rows if v['name'] in BULK]
def trow(v,act):
    o=outdate(v); done=o<TODAY
    return (f"<tr><td><b>{v['name']}</b><div class=sub>{v['phone'] or ''} {v['email'] or ''}</div></td>"
            f"<td class=n>{bottles(v)}</td><td class=n>{m(sum(x['total'] for x in v['cl']))}</td>"
            f"<td class=n>{v['cl'][0]['date'].replace('-','/')}</td>"
            f"<td class=n><span class='{'em' if done else ''}'>{o.strftime('%Y/%m/%d')}</span>"
            f"{'<div class=sub>已用完</div>' if done else ''}</td><td class=sub style='font-size:8pt'>{act}</td></tr>")
CSS=open(sp+"/crm.html").read().split("<style>")[1].split("</style>")[0]
CSS+="""
.mail{background:#fbf9f7;border:1px solid #e2dcd5;padding:4mm 4.5mm;margin:2mm 0 4mm;font-size:9pt;line-height:1.75}
.em{font-weight:700;color:#b0567f}
h3{border-left:3px solid #c98fa8;padding-left:2.5mm}
"""
prod=collections.Counter(); prodrev=collections.Counter()
for v in c.values():
    for i in v['items']:
        t=i['t'].replace('【','').replace('】','').replace('限量贈品｜','［贈品］')
        prod[t]+=i['q']; prodrev[t]+=i['amt']
prows="".join(f"<tr><td>{k}</td><td class=n>{q}</td><td class=n>{m(prodrev[k]) if prodrev[k] else '贈品'}</td></tr>"
              for k,q in prod.most_common())

html=f"""<title>Stella團 CRM 行動方案</title><style>{CSS}</style>
<div class=hdr><div class=brand>HEIWEI 何謂美｜CRM 內部文件</div>
<h1>Stella團 顧客分析與行銷方案</h1>
<div class=lead>開團期間 2026/06/01–06/11　分析基準日 2026/09/03（收團後第 84 天）
<br>含顧客個資，限內部使用。</div></div>
<div class=kpis>
<div class=kpi><div class=v>{n}</div><div class=l>顧客</div><div class=s>{orders} 張訂單</div></div>
<div class=kpi><div class=v>{m(rev)}</div><div class=l>團內營收 NT$</div><div class=s>客單 ${m(rev/orders)}</div></div>
<div class=kpi><div class=v>1</div><div class=l>品項</div><div class=s>只賣防曬噴霧</div></div>
<div class=kpi><div class=v>0%</div><div class=l>團後回購率</div><div class=s>33 位全數未回購</div></div>
<div class=kpi><div class=v>105</div><div class=l>總售出瓶數</div><div class=s>人均 3.2 瓶</div></div>
</div>

<h2>一、這團的體質：小、單一、但時機還在</h2>
<ul>
<li><b>只賣一個品項</b>：全團 36 張訂單、$52,070 營收，100% 來自「爆白防護隔離噴霧 150ml」的 1/2/3/5 入組合。
沒有任何交叉銷售，客人對何謂美的認識僅止於一瓶防曬噴霧。</li>
<li><b>客單 ${m(rev/orders)}</b>，是全站 20 個團裡最低的一檔（陳綾團 $6,451、品馨團 $3,284）。</li>
<li><b>32 位（97%）是全新客</b>，只有 1 位開團前買過官網。</li>
<li><b>團後 0% 回購</b> —— 33 位至今沒有任何一位再下單。</li>
</ul>
<div class=note><b>但這團跟陳綾團的處境完全不同</b>
陳綾團是「錯過黃金窗口 7 個月」的補救；Stella 團收團才 84 天，
<span class=em>而且 20 位客人的存量正好在 2026 年 9 月中前見底</span> ——
這是一個還沒錯過、甚至剛剛好的時間點。此案的關鍵不是折扣，是<span class=em>時機</span>與<span class=em>品類擴張</span>。</div>

<h2>二、團內品項</h2>
<table><tr><th>品項</th><th class=n>件數</th><th class=n>營收 NT$</th></tr>{prows}</table>
<div class=note><b>單一 SKU 的代價</b>
她們沒買過洗面乳、水安瓶、蜜蜜霜、化妝水，也沒看過 8 月上市的爆白潤色防曬棒。
好處是<span class=em>整團都是同一個需求（防曬）</span>，溝通不必分眾；
壞處是一旦這瓶用完沒有回購理由，關係就結束了 —— 現在正是那個節點。</div>

<div class=pb></div>
<h2>三、存量推算與逐一行動表 <span>全 33 位，以每瓶約 50 天用量估算</span></h2>
<div class=lead>依「預估用完日」排序。這是本方案的執行主表 —— 只有 33 位，建議人工逐一聯繫，不需群發系統。</div>
<table>
<tr><th>顧客</th><th class=n>買了幾瓶</th><th class=n>金額</th><th class=n>購買日</th><th class=n>預估用完</th><th>建議動作</th></tr>
{"".join(trow(v,"補貨＋防曬棒加購") for v in soon)}
{"".join(trow(v,"不推補貨，改推保養品類") for v in mid)}
{"".join(trow(v,"存量足，僅推新品體驗") for v in late)}
{"".join(trow(v,"個案處理，見第六節") for v in bulk)}
</table>

<h2>四、三個分群與策略</h2>
<table><tr><th>分群</th><th class=n>人數</th><th class=n>團內金額</th><th>策略</th></tr>
<tr><td><b>A. 即將見底</b><div class=sub>1–2 瓶，9 月底前用完</div></td><td class=n>{len(soon)}</td>
<td class=n>{m(sum(sum(x['total'] for x in v['cl']) for v in soon))}</td>
<td><b>現在就發</b>。補貨組合＋$99 加購爆白潤色防曬棒（同系列、8 月新品），把她們從「一瓶噴霧」帶到兩個品項。</td></tr>
<tr><td><b>B. 存量到年底</b><div class=sub>3–4 瓶，11–12 月用完</div></td><td class=n>{len(mid)}</td>
<td class=n>{m(sum(sum(x['total'] for x in v['cl']) for v in mid))}</td>
<td>推補貨沒有意義。改推<b>不同品類</b>：洗安蜜懶人保養組體驗價，秋冬轉保養的說法最自然。</td></tr>
<tr><td><b>C. 囤到明年</b><div class=sub>5–6 瓶，2027/02 才用完</div></td><td class=n>{len(late)}</td>
<td class=n>{m(sum(sum(x['total'] for x in v['cl']) for v in late))}</td>
<td>唯一該做的是<b>維持關係</b>：新品體驗裝、保養知識信，不談成交。11 月再評估。</td></tr>
</table>
<div class=note><b>為什麼不全部發同一封</b>
5 瓶囤貨的人收到「補貨 85 折」只會覺得你不認識她。
存量分群是這團唯一有意義的分眾方式 —— 因為金額分佈太集中（{n-1} 位落在 $585–$2,820），
用消費級距切沒有鑑別度。</div>

<div class=pb></div>
<h2>五、文案</h2>
<h3>A 組（{len(soon)} 位）　主旨：您的防曬噴霧，這幾天差不多見底了吧？</h3>
<div class=mail>○○ 您好，<br><br>
6 月您在 Stella 的團帶了 ○ 瓶爆白防護隔離噴霧（發信時依主表填入實際瓶數）。以每天用的量算，這幾天應該正好用完。<br><br>
補貨這次一樣有團購價。另外 8 月我們出了同系列的<b>「爆白潤色防曬棒 SPF50+」</b>——
噴霧負責大面積、防曬棒負責補擦跟修飾，很多人是兩支一起用。<br>
這次補貨<b>加 $99 就能帶一支</b>（原價 $699）。</div>

<h3>B 組（{len(mid)} 位）　主旨：天氣要轉了，防曬之外還有一件事</h3>
<div class=mail>6 月您帶的防曬噴霧，估計還能用到 11 月左右，這封信不是來推補貨的。<br><br>
入秋之後皮膚會開始乾，我們最多人回購的其實是「洗安蜜懶人保養組」——
洗面乳、水安瓶、蜜蜜霜一次到位。<br>
給 Stella 團的老朋友一個體驗價，想試再看看就好。</div>

<h3>C 組（{len(late)} 位）　LINE 或 Email 短訊，不談成交</h3>
<div class=mail>謝謝您 6 月在 Stella 團一次帶了 5 瓶 😊<br>
8 月我們出了同系列的防曬潤色棒，想寄一支體驗裝給您試用，不用付費也不用下單，
方便的話回覆我地址就好。</div>

<h2>六、個案：陳佳妤 <span>團內 3 單、15 瓶、$6,900</span></h2>
<div class=note><b>這不是一般消費者的購買形態</b>
陳佳妤（0911271453）在 6/03 前後連下 3 單、共 15 瓶噴霧，金額 $6,900，是全團的 13%。
一個人自用不會買 15 瓶 —— 這比較像<span class=em>分裝給朋友、或小型代購</span>。
建議由專人聯繫，探詢兩件事：① 是否有轉售需求 → 導入經銷方案（授權書流程已上線）；
② 是否有意願自己開一團 → 她本身就是現成的團主候選人。
這位客人的價值不在她買了多少，而在她背後那 15 個用過噴霧的人，目前完全不在我們的名單裡。</div>

<h2>七、效益推估</h2>
<table><tr><th>分群</th><th class=n>人數</th><th class=n>假設轉換</th><th class=n>假設客單</th><th class=n>預估營收</th></tr>
<tr><td>A 補貨＋加購</td><td class=n>{len(soon)}</td><td class=n>25%</td><td class=n>1,500</td><td class=n>{m(len(soon)*0.25*1500)}</td></tr>
<tr><td>B 品類擴張</td><td class=n>{len(mid)}</td><td class=n>15%</td><td class=n>3,000</td><td class=n>{m(len(mid)*0.15*3000)}</td></tr>
<tr><td>C 關係維持</td><td class=n>{len(late)}</td><td class=n>—</td><td class=n>—</td><td class=n>0</td></tr>
<tr style="border-top:2px solid #25211e"><td><b>合計</b></td><td class=n>{len(soon)+len(mid)+len(late)}</td>
<td class=n></td><td class=n></td><td class=n><b>{m(len(soon)*0.25*1500+len(mid)*0.15*3000)}</b></td></tr>
</table>
<div class=lead>A 組轉換率抓得比陳綾團高（25% vs 10%），因為時機精準、金額門檻低、且是已驗證用過的同一支產品。
金額規模不大，但這團的真正價值是<b>驗證「存量推算 → 精準時機」這套方法</b>，
之後可以直接套用到 1,500 人規模的 COCO 團與 Yboutique 團。</div>

<h2>八、從這團學到的兩件事</h2>
<ol>
<li><b>單一 SKU 的團不要再開了，或至少強制綁加購。</b>Stella 團 33 位客人只認識一支噴霧，
收團即斷線；品馨團同期有 5 組合＋11 單品＋4 加購，回頭客立刻出現 50 位。
開團頁至少要有一個「＋$99 加購」的第二品項，才有下一次對話的理由。</li>
<li><b>存量推算應該制度化。</b>防曬噴霧 150ml 約 50 天／瓶、洗面乳 100ml 約 60 天、
水安瓶 50ml 約 60 天 —— 用「購買日＋瓶數×天數」就能算出每個人的補貨日，
比統一的 D+60 更精準。建議把這個算法做進 CRM，每天跑一次，誰到期就發誰。</li>
</ol>

<div class=foot>HEIWEI 何謂美｜Stella團 CRM 行動方案　產出 2026/09/03　資料來源 Shopline Open API（order_source 歸團）　內部限定</div>
"""
open(sp+"/stella.html","w").write(html)
print("wrote stella.html  A/B/C/bulk =",len(soon),len(mid),len(late),len(bulk))
