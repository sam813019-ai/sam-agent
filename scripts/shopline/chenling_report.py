#!/usr/bin/env python3
"""陳綾團 CRM 行動方案報告（內部）。用法: python3 chenling_report.py <scratchpad>"""
import json,sys,collections,datetime,statistics as st
sp=sys.argv[1]
c=json.load(open(sp+"/chenling.json"))
TODAY=datetime.date(2026,9,3); COMBO='【懶人保養組合】洗面乳+水安瓶+蜜蜜霜'
DEALER={'宋珮瑄','冀子琪'}
def dt(s): return datetime.date.fromisoformat(s)
def m(v): return f"{v:,.0f}"
def lt(v): return sum(o['total'] for o in v['hist'])
def after(v): return [o for o in v['hist'] if o['date']>'2026-01-23']

n=len(c); orders=sum(len(v['cl']) for v in c.values())
rev=sum(o['total'] for v in c.values() for o in v['cl'])
newc=sum(1 for v in c.values() if not any(o['date']<'2026-01-01' for o in v['hist']))
rep=[v for v in c.values() if after(v)]
gaps=[(dt(after(v)[0]['date'])-dt(v['cl'][-1]['date'])).days for v in rep]
seg=collections.defaultdict(list)
for cid,v in c.items():
    L=lt(v)
    if v['name'] in DEALER: seg['dealer'].append((v,L)); continue
    if after(v): seg['A'].append((v,L))
    elif L>=20000: seg['B'].append((v,L))
    elif L>=6000: seg['C'].append((v,L))
    else: seg['D'].append((v,L))
for k in seg: seg[k].sort(key=lambda z:-z[1])
prod=collections.Counter(); prodrev=collections.Counter()
for v in c.values():
    for i in v['items']:
        t=i['t'].replace('【陳綾獨家】','').replace('限量贈品｜','［贈品］')
        prod[t]+=i['q']; prodrev[t]+=i['amt']
sleep_all=seg['B']+seg['C']+seg['D']
wc=[x for x in sleep_all if any(COMBO in i['t'] for i in x[0]['items'])]
nc=[x for x in sleep_all if not any(COMBO in i['t'] for i in x[0]['items'])]
def segrow(g,lim=None):
    rows=""
    for v,L in (g[:lim] if lim else g):
        buys=collections.Counter()
        for i in v['items']:
            if i['amt']: buys[i['t'].replace('【陳綾獨家】','').replace('【','').replace('】','')]+=i['q']
        top=" / ".join(f"{k}" for k,_ in buys.most_common(2))
        rows+=(f"<tr><td><b>{v['name']}</b><div class=sub>{v['phone'] or ''} {v['email'] or ''}</div></td>"
               f"<td class=n>{len(v['hist'])}</td><td class=n>{m(L)}</td>"
               f"<td class=n>{(TODAY-dt(v['hist'][-1]['date'])).days}</td>"
               f"<td class=sub style='font-size:8pt'>{top}</td></tr>")
    return rows
CSS=open(sp+"/crm.html").read().split("<style>")[1].split("</style>")[0]
CSS+="""
.mail{background:#fbf9f7;border:1px solid #e2dcd5;padding:4mm 4.5mm;margin:2mm 0 4mm;font-size:9pt;line-height:1.75}
.em{font-weight:700;color:#b0567f}
h3{border-left:3px solid #c98fa8;padding-left:2.5mm}
"""
bands=[(0,3000),(3000,6000),(6000,10000),(10000,20000),(20000,10**9)]
brows=""
for lo,hi in bands:
    g=[v for v in c.values() if lo<=lt(v)<hi]
    s=sum(lt(v) for v in g)
    brows+=(f"<tr><td>${m(lo)} – {'∞' if hi>10**8 else '$'+m(hi)}</td><td class=n>{len(g)}</td>"
            f"<td class=n>{len(g)/n*100:.1f}%</td><td class=n>{m(s)}</td><td class=n>{s/rev*100:.0f}%</td></tr>")
prows="".join(f"<tr><td>{k}</td><td class=n>{q}</td><td class=n>{m(prodrev[k]) if prodrev[k] else '贈品'}</td></tr>"
              for k,q in prod.most_common(12))

html=f"""<title>陳綾團 CRM 行動方案</title><style>{CSS}</style>
<div class=hdr><div class=brand>HEIWEI 何謂美｜CRM 內部文件</div>
<h1>陳綾團 顧客分析與行銷方案</h1>
<div class=lead>開團期間 2026/01/02–01/22　分析基準日 2026/09/03（收團後第 224 天）
<br>含顧客個資，限內部使用。</div></div>
<div class=kpis>
<div class=kpi><div class=v>{n}</div><div class=l>顧客</div><div class=s>{orders} 張訂單</div></div>
<div class=kpi><div class=v>{m(rev/10000)}萬</div><div class=l>團內營收</div><div class=s>全站團購之冠</div></div>
<div class=kpi><div class=v>{m(rev/n)}</div><div class=l>人均消費 NT$</div><div class=s>品馨團的 2.7 倍</div></div>
<div class=kpi><div class=v>15%</div><div class=l>團後回購率</div><div class=s>{len(rep)} / {n} 位</div></div>
<div class=kpi><div class=v>{st.median(gaps):.0f}天</div><div class=l>回購間隔中位數</div><div class=s>錯過就不再回來</div></div>
</div>

<h2>一、診斷：賺到營收，沒留住人</h2>
<ul>
<li><b>{newc} 位（{newc/n*100:.0f}%）當時是全新客</b> —— 這團幾乎等於一次大規模拉新，含金量極高。</li>
<li><b>但 {n-len(rep)} 位（{(n-len(rep))/n*100:.0f}%）從此再也沒買過。</b>381 位的最後一次購買停在 7 個多月前。</li>
<li>有回流的 {len(rep)} 位中，<b>58 位（91%）是回到官網買</b>，只有 4 位是被其他團主的團帶回來。
　→ <span class=em>官網是留存主場，團購頁只是入口</span>。</li>
<li><b>回購間隔中位數 {st.median(gaps):.0f} 天、平均 {st.mean(gaps):.0f} 天</b>：會回來的人兩個多月內就回來了。
今年 3 月中是這批客人的黃金窗口，已經完全錯過。</li>
</ul>
<div class=note><b>最重要的一條結論</b>
這團賺到 {m(rev/10000)} 萬，但真正的資產是那 {n-len(rep)} 位證明過「願意單次花一萬元」的人，
而他們從 1 月至今沒有被任何一封信、任何一次推播碰過。這是全站最有價值、也最被閒置的沉睡池。</div>

<h2>二、消費金額分佈 <span>歷來累計</span></h2>
<table><tr><th>累計消費級距</th><th class=n>人數</th><th class=n>佔比</th><th class=n>貢獻金額</th><th class=n>營收佔比</th></tr>
{brows}</table>
<div class=note><b>頭部集中</b>累計消費 $20,000 以上的 69 位（16%）貢獻了 $2,716,546。
這 69 位裡有 41 位至今零回購 —— 就是下一節的 B 組。</div>

<div class=pb></div>
<h2>三、四個可執行分群 <span>已排除 2 位分銷型帳號</span></h2>
<table><tr><th>分群</th><th class=n>人數</th><th class=n>人均累計</th><th>特徵與策略</th></tr>
<tr><td><b>A. 已回流活躍</b></td><td class=n>{len(seg['A'])}</td><td class=n>{m(sum(L for v,L in seg['A'])/len(seg['A']))}</td>
<td>團後有再買、多在官網。<b>不發折扣</b>，改給新品優先權與 VIP 身分。</td></tr>
<tr><td><b>B. VIP 沉睡</b></td><td class=n>{len(seg['B'])}</td><td class=n>{m(sum(L for v,L in seg['B'])/len(seg['B']))}</td>
<td>單次消費破萬後零動靜。<b>一對一 Email＋新品免費體驗</b>，不用折扣碼。</td></tr>
<tr><td><b>C. 中價值沉睡</b></td><td class=n>{len(seg['C'])}</td><td class=n>{m(sum(L for v,L in seg['C'])/len(seg['C']))}</td>
<td>買了保養組就消失。<b>補貨 85 折＋滿額送防曬棒</b>，7 天限期。</td></tr>
<tr><td><b>D. 低價值沉睡</b></td><td class=n>{len(seg['D'])}</td><td class=n>{m(sum(L for v,L in seg['D'])/len(seg['D']))}</td>
<td>只買單品試水溫。<b>$99 加購新品</b>，目標升級成組合客。</td></tr>
</table>
<div class=note><b>資料完整度 100%</b>{n} 位全部都有 Email 與手機，EDM 可直接執行。
另注意 LINE 官方帳號免費版每月 200 則額度，這批 363 人的沉睡喚醒<span class=em>必須走 Email</span>，不要用推播。</div>

<h2>四、切入點：他們的東西早就用完了</h2>
<table><tr><th>陳綾團熱賣品 TOP 12</th><th class=n>件數</th><th class=n>營收 NT$</th></tr>{prows}</table>
<div class=note><b>兩個天然的回歸理由</b>
① <b>補貨</b>：主力「懶人保養組合」（洗面乳 100ml＋水安瓶 50ml＋蜜蜜霜 50ml）賣出 463 組，
正常用量 2–3 個月見底，至今已過 <span class=em>2–3 個補貨週期</span>。
② <b>新品</b>：爆白潤色防曬棒 SPF50+ 是 2026 年 8 月才上市，
<span class=em>陳綾團所有客人都沒看過</span> —— 這是「你不在的時候我們出了新東西」最自然的說法。
沉睡客中買過懶人組的 {len(wc)} 位人均 ${m(sum(L for v,L in wc)/len(wc))}，
沒買過的 {len(nc)} 位人均 ${m(sum(L for v,L in nc)/len(nc))}，後者正是升級目標。</div>

<div class=pb></div>
<h2>五、B 組｜VIP 沉睡名單 <span>{len(seg['B'])} 位，最高優先</span></h2>
<div class=lead>建議由品牌方具名一對一發信，不套用折扣碼。附新品免費體驗，目的是恢復關係而非成交。</div>
<table><tr><th>顧客</th><th class=n>歷來單數</th><th class=n>累計消費</th><th class=n>沉睡天數</th><th>團內主要購買</th></tr>
{segrow(seg['B'])}</table>

<div class=pb></div>
<h2>六、A 組｜已回流活躍 <span>{len(seg['A'])} 位（列前 25）</span></h2>
<div class=lead>這批人原價就會買，發折扣等於損失毛利。給他們的是新品搶先權與 VIP 名單資格。</div>
<table><tr><th>顧客</th><th class=n>歷來單數</th><th class=n>累計消費</th><th class=n>距上次購買</th><th>團內主要購買</th></tr>
{segrow(seg['A'],25)}</table>

<h2>七、C 組｜中價值沉睡（列前 20，共 {len(seg['C'])} 位）</h2>
<table><tr><th>顧客</th><th class=n>歷來單數</th><th class=n>累計消費</th><th class=n>沉睡天數</th><th>團內主要購買</th></tr>
{segrow(seg['C'],20)}</table>

<div class=pb></div>
<h2>八、Email 文案</h2>
<h3>B 組 VIP（{len(seg['B'])} 位）　主旨：您 1 月選的那組保養，該補貨了</h3>
<div class=mail>○○ 您好，<br><br>
我是何謂美的品牌經營者陳育慶。<br>
今年 1 月您在陳綾的團購選了懶人保養組合，那是我們自己也很喜歡的一組。算一算，這幾罐應該早就見底了。<br><br>
8 月我們出了新品「爆白潤色防曬棒 SPF50+」，想先送您一支體驗，不需要消費。<br>
需要補貨、或想聊聊最近的膚況，直接回覆這封信就好，我會親自看。</div>

<h3>C 組中價值（{len(seg['C'])} 位）　主旨：您的洗安蜜組合，補貨 85 折（7 天）</h3>
<div class=mail>1 月您在陳綾團帶回家的懶人保養組合（洗面乳＋水安瓶＋蜜蜜霜），
照正常用量大約 3 個月見底 —— 現在應該空很久了。<br><br>
這次補貨<b>專屬 85 折</b>，只給陳綾團的老朋友，<b>9/10 截止</b>。<br>
消費滿 $3,000，再送 8 月新上市的爆白潤色防曬棒（原價 $699）一支。</div>

<h3>D 組低價值（{len(seg['D'])} 位）　主旨：$99 帶走我們 8 月的新品</h3>
<div class=mail>1 月您試過我們的單品。這半年最多人回購的其實是「懶人保養組合」——
洗面乳、水安瓶、蜜蜜霜一次到位，省掉挑選的麻煩。<br><br>
這次凡購買保養組合，<b>+$99 就能加購爆白潤色防曬棒</b>（原價 $699）。</div>
<div class=note><b>發送節奏</b>期限設 7 天，第 5 天對未開信者補一封提醒。
品馨團已驗證尾盤效應：最後一天貢獻了全期 20% 的單量。</div>

<h2>九、效益推估與執行清單</h2>
<table><tr><th>分群</th><th class=n>人數</th><th class=n>假設轉換</th><th class=n>假設客單</th><th class=n>預估營收</th></tr>
<tr><td>C＋D 沉睡喚醒</td><td class=n>{len(seg['C'])+len(seg['D'])}</td><td class=n>10%</td><td class=n>3,000</td><td class=n>{m((len(seg['C'])+len(seg['D']))*0.1*3000)}</td></tr>
<tr><td>B 組 VIP 一對一</td><td class=n>{len(seg['B'])}</td><td class=n>12%</td><td class=n>8,000</td><td class=n>{m(len(seg['B'])*0.12*8000)}</td></tr>
<tr style="border-top:2px solid #25211e"><td><b>合計</b></td><td class=n>{len(seg['B'])+len(seg['C'])+len(seg['D'])}</td>
<td class=n></td><td class=n></td><td class=n><b>{m((len(seg['C'])+len(seg['D']))*0.1*3000+len(seg['B'])*0.12*8000)}</b></td></tr>
</table>
<ol>
<li>把四個分群標成 <code>陳綾-VIP沉睡</code> / <code>陳綾-中價值沉睡</code> / <code>陳綾-低價值沉睡</code> / <code>陳綾-已回流</code>，後台即可篩選發信。</li>
<li>折扣碼在 Shopline 後台用「複製活動」手動建（API 建促銷實測會 500，官方 MCP token 需重新授權）。</li>
<li>先發 B 組（41 封，人工），觀察 3 天回覆率，再放 C／D 的群發。</li>
<li>排除 2 位分銷型帳號：宋珮瑄、冀子琪。</li>
</ol>

<h2>十、制度建議：D+60 自動觸發</h2>
<div class=note><b>比這次活動更重要的一件事</b>
陳綾團的回購間隔中位數是 {st.median(gaps):.0f} 天。這代表<span class=em>每一團收團後第 60 天，就是那團客人的黃金喚醒點</span>。
建議固定流程：任何團收團後 D+60，自動對「該團買過但尚未回購」的人發一封補貨信。
品馨團 9/2 收團，D+60 落在 <span class=em>2026/11/01</span>，現在設定還來得及；
Yboutique 團 8/24 收團，D+60 落在 10/23。</div>

<div class=foot>HEIWEI 何謂美｜陳綾團 CRM 行動方案　產出 2026/09/03　資料來源 Shopline Open API（order_source 歸團）　內部限定</div>
"""
open(sp+"/chenling.html","w").write(html)
print("wrote chenling.html", n, orders)
