#!/usr/bin/env python3
"""COCO 團 CRM 行動方案報告。用法: coco_report.py <scratchpad>"""
import json,sys,re,collections,datetime,statistics as st
sp=sys.argv[1]
c=json.load(open(sp+"/coco.json"))
TODAY=datetime.date(2026,9,3)
def dt(s): return datetime.date.fromisoformat(s)
def m(v): return f"{v:,.0f}"
def lt(v): return sum(o['total'] for o in v['hist'])
def tm(v): return sum(o['total'] for o in v['cl'])
def bottles(v):
    b=0
    for i in v['items']:
        if '贈品' in i['t']: continue
        mm=re.search(r'([１２３５1235])入',i['t'])
        if mm: b+={'１':1,'２':2,'３':3,'５':5,'1':1,'2':2,'3':3,'5':5}[mm.group(1)]*i['q']
    return b
def outd(v): return dt(v['cl'][0]['date'])+datetime.timedelta(days=50*bottles(v))
n=len(c); orders=sum(len(v['cl']) for v in c.values()); rev=sum(tm(v) for v in c.values())
A=[v for v in c.values() if bottles(v)<=2]
B=[v for v in c.values() if 3<=bottles(v)<=4]
C=[v for v in c.values() if 5<=bottles(v)<=6]
D=[v for v in c.values() if bottles(v)>=7]
rep=[(v,[o for o in v['hist'] if o['date']>'2026-06-25']) for v in c.values()]
rep=[(v,a) for v,a in rep if a]
stolen=[(v,a) for v,a in rep if a[0]['src'] not in ('官網','實體店','何謂美實體')]
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
bd=collections.Counter(bottles(v) for v in c.values())
brows="".join(f"<tr><td class=n>{k} 瓶</td><td class=n>{v}</td><td class=n>{v/n*100:.1f}%</td>"
              f"<td class=n>{(dt('2026-06-22')+datetime.timedelta(days=50*k)).strftime('%Y/%m')}</td></tr>"
              for k,v in sorted(bd.items()) if v>=8)
bigrows="".join(
 f"<tr><td><b>{v['name']}</b><div class=sub>{v['phone'] or ''} {v['email'] or ''}</div></td>"
 f"<td class=n>{bottles(v)}</td><td class=n>{m(tm(v))}</td><td class=n>{len(v['hist'])}</td>"
 f"<td class=n>{m(lt(v))}</td></tr>"
 for v in sorted(D,key=lambda z:-bottles(z))[:30])
reprows="".join(
 f"<tr><td><b>{v['name']}</b><div class=sub>{v['phone'] or ''}</div></td><td class=n>{m(tm(v))}</td>"
 f"<td class=n>{a[0]['date'].replace('-','/')}</td><td>{a[0]['src']}</td><td class=n>{m(sum(o['total'] for o in a))}</td></tr>"
 for v,a in sorted(rep,key=lambda z:z[1][0]['date']))

html=f"""<title>COCO團 CRM 行動方案</title><style>{CSS}</style>
<div class=hdr><div class=brand>HEIWEI 何謂美｜CRM 內部文件</div>
<h1>COCO團 顧客分析與行銷方案</h1>
<div class=lead>QUALｘCOCOｘ何謂美 爆白團　開團期間 2026/06/22–06/23（2 天）　分析基準日 2026/09/03
<br>含顧客個資，限內部使用。</div></div>
<div class=kpis>
<div class=kpi><div class=v>{m(n)}</div><div class=l>顧客</div><div class=s>全站單團最多</div></div>
<div class=kpi><div class=v>{m(rev/10000)}萬</div><div class=l>團內營收 NT$</div><div class=s>客單 ${m(rev/orders)}</div></div>
<div class=kpi><div class=v>{m(sum(bottles(v) for v in c.values()))}</div><div class=l>售出瓶數</div><div class=s>人均 3.6 瓶</div></div>
<div class=kpi><div class=v>0.5%</div><div class=l>團後回購率</div><div class=s>只有 {len(rep)} 位</div></div>
<div class=kpi><div class=v>99.7%</div><div class=l>當時全新客</div><div class=s>僅 5 位買過</div></div>
</div>

<h2>一、診斷：兩天做了 267 萬，然後 1,532 個人消失</h2>
<ul>
<li><b>兩天開團、1,615 張單、$2,667,414</b> —— 這是全站規模最大的一次拉新，一口氣進來 {m(n)} 位新客。</li>
<li><b>但團後只有 {len(rep)} 位（0.5%）再買過任何東西。</b>比 Stella 團的 0% 好不了多少，
遠低於陳綾團的 15%。</li>
<li><b>單一 SKU</b>：全團 100% 營收來自「爆白防護隔離噴霧 150ml」的 1/2/3/5 入組合，
賣出 {m(sum(bottles(v) for v in c.values()))} 瓶。她們對何謂美的認識只有這一瓶。</li>
<li><b>累計消費最高只有 $14,497</b>，沒有任何一位破 $15,000 —— 沒有頭部客群可經營，
和陳綾團（69 位破 $20,000、貢獻 62% 營收）是完全相反的結構。</li>
</ul>
<div class=note><b>最該警覺的一件事：名單正在被別的團主收割</b>
團後回購的 {len(rep)} 位裡，有 <span class=em>{len(stolen)} 位是被其他團主的團帶走的</span>
（Yboutique 2 位、蕾菈 1 位、Heidi 1 位），只有 3 位回到官網。
換句話說，我們自己沒有經營這 {m(n)} 人的名單，但別的團主已經開始從裡面撈客人了。
這批人不是不會再買，是<span class=em>我們沒有給她們再買的理由</span>。</div>

<h2>二、團內品項</h2>
<table><tr><th>品項</th><th class=n>件數</th><th class=n>營收 NT$</th></tr>{prows}</table>

<div class=pb></div>
<h2>三、存量推算：為什麼現在不能推補貨 <span>以每瓶約 50 天用量估算</span></h2>
<table><tr><th class=n>購買瓶數</th><th class=n>人數</th><th class=n>佔比</th><th class=n>預估用完</th></tr>{brows}</table>
<div class=note><b>73% 的人手上還有貨，而且撐過整個秋冬</b>
{m(len(B)+len(C)+len(D))} 位（{(len(B)+len(C)+len(D))/n*100:.0f}%）的存量要到 11 月甚至 2027 年才見底。
在這個時間點推「防曬噴霧補貨」，等於對三分之二的人推一個她們用不到的東西 ——
不但轉換低，還會消耗名單信任。<br><br>
<span class=em>而且 11 月之後是防曬淡季</span>：等她們真的用完，季節已經不對了。
這團的補貨紅利實質上已經錯過，<span class=em>唯一的出路是品類擴張，不是同品項回購</span>。</div>

<h2>四、四個分群與策略</h2>
<table><tr><th>分群</th><th class=n>人數</th><th class=n>團內營收</th><th>策略</th></tr>
<tr><td><b>A. 已用完／即將見底</b><div class=sub>1–2 瓶，8–9 月見底</div></td><td class=n>{len(A)}</td>
<td class=n>{m(sum(tm(v) for v in A))}</td>
<td><b>唯一能推補貨的一群</b>，且要趁 9 月還有紫外線。補貨組合＋$99 加購爆白潤色防曬棒。</td></tr>
<tr><td><b>B. 秋冬見底</b><div class=sub>3–4 瓶，11–12 月</div></td><td class=n>{len(B)}</td>
<td class=n>{m(sum(tm(v) for v in B))}</td>
<td>最大一群。<b>不推防曬</b>，改推洗安蜜懶人保養組 —— 入秋轉乾的說法最自然，也是唯一的品類擴張機會。</td></tr>
<tr><td><b>C. 囤到明年</b><div class=sub>5–6 瓶</div></td><td class=n>{len(C)}</td>
<td class=n>{m(sum(tm(v) for v in C))}</td>
<td>只維持關係：新品體驗裝、保養知識信，不談成交。</td></tr>
<tr><td><b>D. 疑似分裝／代購</b><div class=sub>7 瓶以上</div></td><td class=n>{len(D)}</td>
<td class=n>{m(sum(tm(v) for v in D))}</td>
<td>個別聯繫，探詢經銷或開團意願。見第六節。</td></tr>
</table>

<div class=pb></div>
<h2>五、團後回購的 {len(rep)} 位 <span>0.5% 的樣本，但方向很清楚</span></h2>
<table><tr><th>顧客</th><th class=n>團內消費</th><th class=n>回購日</th><th>回購管道</th><th class=n>回購金額</th></tr>{reprows}</table>
<div class=lead>回購間隔中位數僅 <b>23 天</b> —— 會回頭的人，7 月中就回頭了。
這代表 COCO 團客人的決策窗口極短，跟陳綾團的 66 天完全不同（她們買的是低價快消品，不是保養投資）。
<b>我們在 7 月完全沒有動作，那個窗口已經關上。</b></div>

<h2>六、D 組：{len(D)} 位疑似分裝／代購 <span>列前 30</span></h2>
<div class=lead>一個人不會自用 7 瓶以上防曬噴霧。這群人手上握著我們看不見的下游名單 ——
黃湲淳一人買 31 瓶、吳季軒 24 瓶、王湘湄 21 瓶。她們背後至少數百位使用者完全不在我們的資料庫裡。</div>
<table><tr><th>顧客</th><th class=n>瓶數</th><th class=n>團內消費</th><th class=n>歷來單數</th><th class=n>累計消費</th></tr>{bigrows}</table>
<div class=note><b>這是 COCO 團真正的資產</b>
與其對 1,539 位低單價客人做群發，不如把資源放在這 {len(D)} 位身上：
① 導入經銷方案（授權書流程已上線）；② 邀請成為團主。
一位手上有 20 位下游的分裝者，價值遠高於 20 封回購信。</div>

<h2>七、文案</h2>
<h3>A 組（{len(A)} 位）　主旨：噴霧用完了吧？順便認識一下我們的新品</h3>
<div class=mail>6 月您在 COCO 的團帶了爆白防護隔離噴霧，照日常用量算，這陣子應該正好見底。<br><br>
9 月紫外線還很強，補貨一樣給團購價。<br>
另外 8 月我們出了同系列的<b>「爆白潤色防曬棒 SPF50+」</b>——
噴霧管大面積、防曬棒管補擦與修飾，<b>補貨加 $99 就能帶一支</b>（原價 $699）。</div>

<h3>B 組（{len(B)} 位）　主旨：防曬還有存量，但皮膚要換季了</h3>
<div class=mail>6 月您帶的噴霧估計還能用到 11 月，這封信不是來推補貨的。<br><br>
入秋之後皮膚會開始乾，我們回購率最高的其實是「洗安蜜懶人保養組」——
洗面乳、水安瓶、蜜蜜霜一次到位。<br>
給 COCO 團的老朋友一個體驗價，試過再決定就好。</div>

<h3>D 組（{len(D)} 位）　個別聯繫，不群發</h3>
<div class=mail>○○ 您好，我是何謂美的品牌經營者陳育慶。<br>
看到您 6 月在 COCO 的團一次帶了 ○ 瓶，想跟您確認一下是自用還是分給朋友——<br>
如果是後者，我們有經銷方案（含正式授權書），價格會比團購價更好；
若您有興趣自己開一團，我們也可以協助出頁面與素材。</div>

<h2>八、效益推估</h2>
<table><tr><th>分群</th><th class=n>人數</th><th class=n>假設轉換</th><th class=n>假設客單</th><th class=n>預估營收</th></tr>
<tr><td>A 補貨＋加購</td><td class=n>{len(A)}</td><td class=n>8%</td><td class=n>1,500</td><td class=n>{m(len(A)*0.08*1500)}</td></tr>
<tr><td>B 品類擴張</td><td class=n>{len(B)}</td><td class=n>5%</td><td class=n>3,000</td><td class=n>{m(len(B)*0.05*3000)}</td></tr>
<tr><td>D 經銷／團主轉化</td><td class=n>{len(D)}</td><td class=n>5% 成為經銷</td><td class=n>—</td><td class=n>長期價值</td></tr>
<tr style="border-top:2px solid #25211e"><td><b>合計（不含 D）</b></td><td class=n>{len(A)+len(B)}</td>
<td class=n></td><td class=n></td><td class=n><b>{m(len(A)*0.08*1500+len(B)*0.05*3000)}</b></td></tr>
</table>
<div class=lead>轉換率抓得比 Stella 團保守（8% vs 25%），因為時機已過、且這批人從未展現過回購行為。
真正的槓桿在 D 組的 {len(D)} 位分裝者。</div>

<h2>九、三團對照與結論</h2>
<table><tr><th>項目</th><th class=n>陳綾團</th><th class=n>COCO團</th><th class=n>Stella團</th></tr>
<tr><td>顧客數</td><td class=n>427</td><td class=n>1,539</td><td class=n>33</td></tr>
<tr><td>客單價</td><td class=n>$6,451</td><td class=n>$1,652</td><td class=n>$1,446</td></tr>
<tr><td>品項數</td><td class=n>7+</td><td class=n>1</td><td class=n>1</td></tr>
<tr><td>團後回購率</td><td class=n>15%</td><td class=n>0.5%</td><td class=n>0%</td></tr>
<tr><td>回購間隔中位數</td><td class=n>66 天</td><td class=n>23 天</td><td class=n>—</td></tr>
</table>
<div class=note><b>三團比完，結論只有一句：品項數決定回購率</b>
賣 7 種以上組合的陳綾團回購 15%，只賣一支噴霧的 COCO 與 Stella 團是 0.5% 與 0%。
<span class=em>單一 SKU 的團可以創造漂亮的單場營收，但幾乎不留下任何顧客資產。</span><br><br>
制度上的建議：<b>任何開團頁至少要有兩個品類</b>（一個引流品、一個利潤品），
並強制配置「＋$99 加購」的第二品項。這件事的價值遠大於本次任何一封回購信。</div>

<div class=foot>HEIWEI 何謂美｜COCO團 CRM 行動方案　產出 2026/09/03　資料來源 Shopline Open API（order_source 歸團）　內部限定</div>
"""
open(sp+"/coco.html","w").write(html)
print("wrote coco.html  A/B/C/D =",len(A),len(B),len(C),len(D))
