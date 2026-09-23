#!/usr/bin/env python3
"""桐林團 CRM 行動方案報告。用法: tonglin_report.py <scratchpad>"""
import json,sys,re,collections,datetime,statistics as st
sp=sys.argv[1]
c=json.load(open(sp+"/tonglin.json")); co=json.load(open(sp+"/coco.json"))
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
A=[v for v in c.values() if bottles(v)<=1]
B=[v for v in c.values() if bottles(v)==2]
C=[v for v in c.values() if 3<=bottles(v)<=4]
D=[v for v in c.values() if 5<=bottles(v)<=6]
E=[v for v in c.values() if bottles(v)>=7]
rep=[(v,[o for o in v['hist'] if o['date']>'2026-06-22']) for v in c.values()]
rep=[(v,a) for v,a in rep if a]
ov=set(c)&set(co)
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
bigrows="".join(
 f"<tr><td><b>{v['name']}</b><div class=sub>{v['phone'] or ''} {v['email'] or ''}</div></td>"
 f"<td class=n>{bottles(v)}</td><td class=n>{m(tm(v))}</td><td class=n>{len(v['hist'])}</td><td class=n>{m(lt(v))}</td></tr>"
 for v in sorted(E,key=lambda z:-bottles(z)))
band=[("已用完（8 月前）",len(A),"1 瓶"),("9 月中–10 月中見底",len(B),"2 瓶"),
      ("11–12 月見底",len(C),"3–4 瓶"),("2027 年才用完",len(D)+len(E),"5 瓶以上")]
brows="".join(f"<tr><td>{lab}</td><td class=n>{cnt}</td><td class=n>{cnt/n*100:.0f}%</td><td class=sub>{note}</td></tr>"
              for lab,cnt,note in band)

html=f"""<title>桐林團 CRM 行動方案</title><style>{CSS}</style>
<div class=hdr><div class=brand>HEIWEI 何謂美｜CRM 內部文件</div>
<h1>桐林團 顧客分析與行銷方案</h1>
<div class=lead>開團期間 2026/06/11–06/19（9 天）　分析基準日 2026/09/03（收團後第 76 天）
<br>含顧客個資，限內部使用。</div></div>
<div class=kpis>
<div class=kpi><div class=v>{m(n)}</div><div class=l>顧客</div><div class=s>{orders} 張訂單</div></div>
<div class=kpi><div class=v>{m(rev/10000)}萬</div><div class=l>團內營收 NT$</div><div class=s>客單 ${m(rev/orders)}</div></div>
<div class=kpi><div class=v>{m(sum(bottles(v) for v in c.values()))}</div><div class=l>售出瓶數</div><div class=s>人均 2.7 瓶</div></div>
<div class=kpi><div class=v>0.3%</div><div class=l>團後回購率</div><div class=s>只有 {len(rep)} 位</div></div>
<div class=kpi><div class=v>50%</div><div class=l>10 月中前見底</div><div class=s>{len(A)+len(B)} 位可打</div></div>
</div>

<h2>一、診斷：全站客單最低，但時機最好</h2>
<ul>
<li><b>客單 ${m(rev/orders)}</b>，是全站 20 個團裡最低的一檔（COCO $1,652、陳綾 $6,451）。
人均只買 2.7 瓶，比 COCO 的 3.6 瓶還少。</li>
<li><b>單一 SKU</b>：100% 營收來自爆白防護隔離噴霧，賣出 {m(sum(bottles(v) for v in c.values()))} 瓶。</li>
<li><b>團後回購 {len(rep)} 位（0.3%）</b>，全站最低。累計消費 86.7% 的人不到 $1,500 —— 幾乎全部是一次性客人。</li>
<li><b>但 {len(A)+len(B)} 位（50%）的存量已經用完或即將見底</b> ——
這是三個防曬團裡<span class=em>唯一時機還完全站得住的一團</span>。</li>
</ul>
<div class=note><b>與 COCO 團最關鍵的差別：庫存結構</b>
COCO 團賣得太成功（人均 3.6 瓶、五入組合佔大宗），結果 73% 的客人囤到 11 月以後才用完，
現在推補貨等於白推。桐林團賣得「剛好」——
186 位買 1 瓶的<span class=em>8 月就用完了</span>，294 位買 2 瓶的<span class=em>9 月中到 10 月中陸續見底</span>。
<span class=em>這 480 位是目前全站最該立刻聯繫的一批人</span>，而且 9 月台灣紫外線還很強，季節站得住。</div>

<h2>二、團內品項</h2>
<table><tr><th>品項</th><th class=n>件數</th><th class=n>營收 NT$</th></tr>{prows}</table>

<div class=pb></div>
<h2>三、存量推算 <span>以每瓶約 50 天用量估算</span></h2>
<table><tr><th>存量狀態</th><th class=n>人數</th><th class=n>佔比</th><th>購買組合</th></tr>{brows}</table>

<h2>四、五個分群與策略</h2>
<table><tr><th>分群</th><th class=n>人數</th><th class=n>團內營收</th><th>策略與時機</th></tr>
<tr><td><b>A. 已用完</b><div class=sub>1 瓶，8 月初見底</div></td><td class=n>{len(A)}</td><td class=n>{m(sum(tm(v) for v in A))}</td>
<td><b>立刻發，最高優先</b>。已空窗一個月。補貨組合＋$99 加購爆白潤色防曬棒。</td></tr>
<tr><td><b>B. 正在見底</b><div class=sub>2 瓶，9 月中–10 月中</div></td><td class=n>{len(B)}</td><td class=n>{m(sum(tm(v) for v in B))}</td>
<td><b>9 月中發</b>，剛好卡在用完的那週。同樣主打補貨＋加購。</td></tr>
<tr><td><b>C. 秋冬見底</b><div class=sub>3–4 瓶，11–12 月</div></td><td class=n>{len(C)}</td><td class=n>{m(sum(tm(v) for v in C))}</td>
<td>不推防曬（用完時已是淡季）。改推洗安蜜懶人保養組，走換季保養的說法。</td></tr>
<tr><td><b>D. 囤到明年</b><div class=sub>5–6 瓶</div></td><td class=n>{len(D)}</td><td class=n>{m(sum(tm(v) for v in D))}</td>
<td>只維持關係，新品體驗裝，不談成交。</td></tr>
<tr><td><b>E. 疑似分裝／代購</b><div class=sub>7 瓶以上</div></td><td class=n>{len(E)}</td><td class=n>{m(sum(tm(v) for v in E))}</td>
<td>個別聯繫，探詢經銷或開團意願。名單見第六節。</td></tr>
</table>

<h2>五、一個意外發現：桐林與 COCO 的客群完全不重疊</h2>
<div class=note><b>兩團只差 3 天、賣同一支產品，卻只有 1 位客人重複</b>
桐林團（6/11–6/19）與 COCO 團（6/22–6/23）幾乎同期、品項完全相同，
{m(n)} 位與 {m(len(co))} 位客人裡<span class=em>只有 1 位（鄧羽萱）兩團都買</span>。<br><br>
這代表<span class=em>團主的受眾是各自獨立的池子，同期開團不會互相稀釋</span> ——
先前擔心的「同族群連續曝光」在這一組並不成立。<br>
但要注意這不是通則：品馨團 142 位裡有 11 位來自 Yboutique（7.7%），
<b>重疊程度取決於團主組合</b>，排檔期前應該逐對檢查，而不是一律拉開間隔。</div>

<div class=pb></div>
<h2>六、E 組：{len(E)} 位疑似分裝／代購</h2>
<table><tr><th>顧客</th><th class=n>瓶數</th><th class=n>團內消費</th><th class=n>歷來單數</th><th class=n>累計消費</th></tr>{bigrows}</table>
<div class=lead>規模比 COCO 團的 137 位小很多，但邏輯相同：導入經銷方案，或邀請成為團主。</div>

<h2>七、文案</h2>
<h3>A 組（{len(A)} 位）　主旨：您那瓶防曬，八月就用完了吧？</h3>
<div class=mail>6 月您在桐林的團帶了一瓶爆白防護隔離噴霧，照日常用量算，8 月初就見底了。<br><br>
9 月紫外線還很強，補貨一樣給團購價。<br>
另外 8 月我們出了同系列的<b>「爆白潤色防曬棒 SPF50+」</b>——
噴霧管大面積、防曬棒管補擦與修飾，<b>補貨加 $99 就能帶一支</b>（原價 $699）。</div>

<h3>B 組（{len(B)} 位）　9 月中發　主旨：兩瓶差不多見底了，要補嗎？</h3>
<div class=mail>6 月您帶了兩瓶爆白防護隔離噴霧，估算這幾天正好用完。<br>
補貨團購價不變，加 $99 可帶一支 8 月新上市的爆白潤色防曬棒。</div>

<h3>C 組（{len(C)} 位）　11 月發　主旨：防曬還有，但皮膚要換季了</h3>
<div class=mail>您手上的噴霧估計還能用到 11 月，這封信不是來推補貨的。<br>
入秋後皮膚開始乾，我們回購率最高的是「洗安蜜懶人保養組」——洗面乳、水安瓶、蜜蜜霜一次到位。
給桐林團的老朋友一個體驗價。</div>

<h2>八、效益推估</h2>
<table><tr><th>分群</th><th class=n>人數</th><th class=n>假設轉換</th><th class=n>假設客單</th><th class=n>預估營收</th><th>發送時機</th></tr>
<tr><td>A 補貨＋加購</td><td class=n>{len(A)}</td><td class=n>12%</td><td class=n>1,200</td><td class=n>{m(len(A)*0.12*1200)}</td><td>立即</td></tr>
<tr><td>B 補貨＋加購</td><td class=n>{len(B)}</td><td class=n>12%</td><td class=n>1,200</td><td class=n>{m(len(B)*0.12*1200)}</td><td>9 月中</td></tr>
<tr><td>C 品類擴張</td><td class=n>{len(C)}</td><td class=n>5%</td><td class=n>3,000</td><td class=n>{m(len(C)*0.05*3000)}</td><td>11 月</td></tr>
<tr style="border-top:2px solid #25211e"><td><b>合計</b></td><td class=n>{len(A)+len(B)+len(C)}</td><td class=n></td><td class=n></td>
<td class=n><b>{m((len(A)+len(B))*0.12*1200+len(C)*0.05*3000)}</b></td><td></td></tr>
</table>
<div class=lead>轉換率抓 12%（高於 COCO 的 8%），因為時機精準落在用完的那幾週、且季節仍在。
這團金額規模不大，但<b>它是驗證「存量推算 → 精準時機」最乾淨的樣本</b>：
分群明確、時間點清楚、季節條件成立。跑完這一輪就能知道這套方法的真實轉換率。</div>

<h2>九、四團對照</h2>
<table><tr><th>項目</th><th class=n>陳綾團</th><th class=n>COCO團</th><th class=n>桐林團</th><th class=n>Stella團</th></tr>
<tr><td>顧客數</td><td class=n>427</td><td class=n>1,539</td><td class=n>955</td><td class=n>33</td></tr>
<tr><td>客單價</td><td class=n>$6,451</td><td class=n>$1,652</td><td class=n>$1,270</td><td class=n>$1,446</td></tr>
<tr><td>品項數</td><td class=n>7+</td><td class=n>1</td><td class=n>1</td><td class=n>1</td></tr>
<tr><td>團後回購率</td><td class=n>15%</td><td class=n>0.5%</td><td class=n>0.3%</td><td class=n>0%</td></tr>
<tr><td>10 月中前見底比例</td><td class=n>—</td><td class=n>27%</td><td class=n><b>50%</b></td><td class=n>61%</td></tr>
</table>
<div class=note><b>結論不變，而且更確定了</b>
四團跑完，回購率與品項數的關係完全一致：賣 7 種以上的陳綾團 15%，
三個單一 SKU 的團全部低於 0.5%。<span class=em>單一 SKU 的團創造營收，但不留下顧客</span>。<br><br>
制度上唯一該改的事：<b>任何開團頁至少配兩個品類</b>，一個引流品、一個利潤品，
並強制放一個「＋$99 加購」的第二品項。</div>

<div class=foot>HEIWEI 何謂美｜桐林團 CRM 行動方案　產出 2026/09/03　資料來源 Shopline Open API（order_source 歸團）　內部限定</div>
"""
open(sp+"/tonglin.html","w").write(html)
print("wrote tonglin.html A/B/C/D/E =",len(A),len(B),len(C),len(D),len(E),"overlap",len(ov))
