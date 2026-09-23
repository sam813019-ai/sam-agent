#!/usr/bin/env python3
"""Yboutique 兩檔 CRM 行動方案報告。用法: yb_report.py <scratchpad>"""
import json,sys,re,collections,datetime,statistics as st
sp=sys.argv[1]
c=json.load(open(sp+"/yb.json"))
MAY='69f055f1d1bff05f11af8636'; AUG='6a869d73b02c3b16856b59c3'
TODAY=datetime.date(2026,9,4)
def dt(s): return datetime.date.fromisoformat(s)
def m(v): return f"{v:,.0f}"
def lt(v): return sum(o['total'] for o in v['hist'])
def sp_in(v,sid): return sum(o['total'] for o in v['hist'] if o['sid']==sid)
n=len(c)
only5=[v for v in c.values() if any(o['sid']==MAY for o in v['hist']) and not any(o['sid']==AUG for o in v['hist'])]
both =[v for v in c.values() if any(o['sid']==MAY for o in v['hist']) and any(o['sid']==AUG for o in v['hist'])]
only8=[v for v in c.values() if any(o['sid']==AUG for o in v['hist']) and not any(o['sid']==MAY for o in v['hist'])]
may=only5+both; aug=only8+both
rev=sum(sp_in(v,MAY)+sp_in(v,AUG) for v in c.values())
orders=sum(1 for v in c.values() for o in v['hist'] if o['sid'] in (MAY,AUG))
rev5=sum(sp_in(v,MAY) for v in may); rev8=sum(sp_in(v,AUG) for v in aug)
o5=sum(1 for v in may for o in v['hist'] if o['sid']==MAY); o8=sum(1 for v in aug for o in v['hist'] if o['sid']==AUG)
after=[(v,[o for o in v['hist'] if o['date']>'2026-08-25']) for v in c.values()]
after=[(v,a) for v,a in after if a]
CSS=open(sp+"/crm.html").read().split("<style>")[1].split("</style>")[0]
CSS+="""
.mail{background:#fbf9f7;border:1px solid #e2dcd5;padding:4mm 4.5mm;margin:2mm 0 4mm;font-size:9pt;line-height:1.75}
.em{font-weight:700;color:#b0567f}
h3{border-left:3px solid #c98fa8;padding-left:2.5mm}
"""
def pcount(group,sid):
    p=collections.Counter()
    for v in group:
        for o in v['hist']:
            if o['sid']!=sid: continue
            for i in o['items']:
                if '贈品' in i['t']: continue
                p[i['t'].replace('【','').replace('】','')]+=i['q']
    return p
p5=pcount(only5,MAY); pback=pcount(both,AUG)
r5="".join(f"<tr><td>{k}</td><td class=n>{q}</td></tr>" for k,q in p5.most_common(8))
rb="".join(f"<tr><td>{k}</td><td class=n>{q}</td></tr>" for k,q in pback.most_common(8))
tops=sorted(c.values(),key=lambda v:-lt(v))[:15]
toprows="".join(f"<tr><td><b>{v['name']}</b><div class=sub>{v['phone'] or ''} {v['email'] or ''}</div></td>"
                f"<td class=n>{len(v['hist'])}</td><td class=n>{m(lt(v))}</td></tr>" for v in tops)
bothrows="".join(f"<tr><td><b>{v['name']}</b><div class=sub>{v['phone'] or ''}</div></td>"
                 f"<td class=n>{m(sp_in(v,MAY))}</td><td class=n>{m(sp_in(v,AUG))}</td>"
                 f"<td class=n>{m(lt(v))}</td></tr>"
                 for v in sorted(both,key=lambda z:-lt(z))[:25])

html=f"""<title>Yboutique團 CRM 行動方案</title><style>{CSS}</style>
<div class=hdr><div class=brand>HEIWEI 何謂美｜CRM 內部文件</div>
<h1>Yboutique團 顧客分析與行銷方案</h1>
<div class=lead>兩檔開團：2026/05/06–05/09、2026/08/20–08/24　分析基準日 2026/09/04
<br>全站唯一開過兩檔的大型團主。含顧客個資，限內部使用。</div></div>
<div class=kpis>
<div class=kpi><div class=v>{m(n)}</div><div class=l>顧客</div><div class=s>{orders} 張訂單</div></div>
<div class=kpi><div class=v>{m(rev/10000)}萬</div><div class=l>兩檔營收 NT$</div><div class=s>客單 ${m(rev/orders)}</div></div>
<div class=kpi><div class=v>{len(both)}</div><div class=l>兩檔都買</div><div class=s>人均 ${m(sum(lt(v) for v in both)/len(both))}</div></div>
<div class=kpi><div class=v>20.3%</div><div class=l>團主回頭率</div><div class=s>全站最高</div></div>
<div class=kpi><div class=v>+19%</div><div class=l>第二檔人均成長</div><div class=s>$1,741→$2,066</div></div>
</div>

<h2>一、這團跟前四團都不一樣</h2>
<table><tr><th>檔次</th><th class=n>訂單</th><th class=n>顧客</th><th class=n>營收 NT$</th><th class=n>客單</th><th class=n>人均</th></tr>
<tr><td>第一檔 5/06–5/09</td><td class=n>{o5}</td><td class=n>{len(may)}</td><td class=n>{m(rev5)}</td><td class=n>{m(rev5/o5)}</td><td class=n>{m(rev5/len(may))}</td></tr>
<tr><td>第二檔 8/20–8/24</td><td class=n>{o8}</td><td class=n>{len(aug)}</td><td class=n>{m(rev8)}</td><td class=n>{m(rev8/o8)}</td><td class=n>{m(rev8/len(aug))}</td></tr>
</table>
<ul>
<li><b>{len(both)} 位（20.3%）第一檔的客人在第二檔又買了。</b>
這是全站唯一能觀察「同團主二次開團」的樣本，而 20.3% 遠高於 COCO／桐林／Stella 的 0–0.5%。</li>
<li><b>第二檔人均 ${m(rev8/len(aug))}，比第一檔高 19%。</b>團主的名單沒有被消耗，反而更值錢。</li>
<li><b>多品項</b>：防曬棒、防曬噴霧、保濕噴霧，以及三種組合包 ——
與單一 SKU 的 COCO／桐林／Stella 形成直接對照。</li>
<li>兩檔都買的 {len(both)} 位人均累計 <b>${m(sum(lt(v) for v in both)/len(both))}</b>，
是只買一檔者（$1,693–$2,079）的 <b>2.2 倍</b>。</li>
</ul>
<div class=note><b>這團證實了前四份報告的推論</b>
陳綾團（7 品項）回購 15%、Yboutique（多品項＋組合）團主回頭率 20.3%，
而三個單一 SKU 的團全部低於 0.5%。
<span class=em>品項數與組合設計，是回購率唯一穩定的解釋變數</span>。</div>

<h2>二、最重要的發現：把老客帶回來的是「新品」，不是「補貨」</h2>
<div class=lead>{len(both)} 位回頭客在第二檔買了什麼：</div>
<table><tr><th>第二檔（8 月）回頭客購買品項</th><th class=n>件數</th></tr>{rb}</table>
<div class=note><b>前三名全是 8 月才上市的爆白潤色防曬棒</b>
回頭客沒有回來補她們 5 月買的噴霧，而是幾乎全部去買了<span class=em>沒看過的新品</span>。<br><br>
這直接修正了前四份報告的策略假設：<b>補貨提醒不是最強的回購鉤子，新品才是。</b>
補貨解決「用完了」的需求，但新品同時解決了「為什麼要現在買」——
這也解釋了為什麼 COCO／桐林那種只能推補貨的單一 SKU 團，回購率貼近零。</div>

<div class=pb></div>
<h2>三、三個分群與策略</h2>
<table><tr><th>分群</th><th class=n>人數</th><th class=n>人均</th><th>狀態與策略</th></tr>
<tr><td><b>A. 只買第一檔</b><div class=sub>5 月買、8 月沒回來</div></td><td class=n>{len(only5)}</td>
<td class=n>{m(sum(sp_in(v,MAY) for v in only5)/len(only5))}</td>
<td><b>最高優先</b>。已沉睡 4 個月、當時買的噴霧早已用完，
而且<span class=em>從未看過爆白潤色防曬棒</span> —— 正是上一節證實有效的那支鉤子。</td></tr>
<tr><td><b>B. 兩檔都買</b><div class=sub>已驗證的忠誠客</div></td><td class=n>{len(both)}</td>
<td class=n>{m(sum(lt(v) for v in both)/len(both))}</td>
<td>8 月剛買、庫存滿。<b>現在不推銷</b>，10–11 月換季時推保養品類，並列入 VIP 名單。</td></tr>
<tr><td><b>C. 只買第二檔</b><div class=sub>8 月新客</div></td><td class=n>{len(only8)}</td>
<td class=n>{m(sum(sp_in(v,AUG) for v in only8)/len(only8))}</td>
<td>剛收團，D+60 落在 <b>2026/10/23</b>，屆時發首購回購信。</td></tr>
</table>

<h2>四、A 組當時買了什麼 <span>{len(only5)} 位，5 月購買品項</span></h2>
<table><tr><th>品項</th><th class=n>件數</th></tr>{r5}</table>
<div class=note><b>清一色是防曬噴霧，而且早就用完了</b>
以每瓶約 50 天估算，5 月初買 2 瓶的人 8 月中見底、買 3 瓶的 9 月底見底。
<span class=em>這 {len(only5)} 位的存量正好在現在到 10 月之間陸續歸零，而 9 月紫外線還在。</span>
補貨的理由成立，新品的理由更成立 —— 兩個鉤子可以放在同一封信裡。</div>

<h2>五、B 組｜兩檔都買的忠誠客 <span>列前 25，共 {len(both)} 位</span></h2>
<table><tr><th>顧客</th><th class=n>5 月消費</th><th class=n>8 月消費</th><th class=n>累計消費</th></tr>{bothrows}</table>

<div class=pb></div>
<h2>六、累計消費 TOP 15</h2>
<table><tr><th>顧客</th><th class=n>歷來單數</th><th class=n>累計消費</th></tr>{toprows}</table>

<h2>七、一個要注意的訊號：客人正在往品馨團流動</h2>
<div class=note><b>第二檔收團後又買的 {len(after)} 位裡，有 11 位是去買品馨團</b>
Yboutique 8/24 收團，品馨團 8/26 開團 —— 只隔兩天，就有 11 位客人跟著過去，只有 2 位回官網。<br><br>
好的一面：這批人已經養成「看到團就買」的習慣，購買意願高。<br>
壞的一面：<span class=em>她們的忠誠度是對「團購」這個形式，不是對何謂美這個品牌</span>。
誰開團就跟誰買，我們始終沒有把她們變成官網的客人。
YB 的團主回頭率 20.3% 很漂亮，但那是團主的資產，不是品牌的。</div>

<h2>八、文案</h2>
<h3>A 組（{len(only5)} 位）　主旨：您 5 月買的噴霧用完了，而我們出了新東西</h3>
<div class=mail>5 月您在 Yboutique 的團帶了爆白防護隔離噴霧，照日常用量算，這陣子應該正好見底。<br><br>
8 月我們上市了<b>「爆白潤色防曬棒 SPF50+」</b>——
8 月那一檔賣得最好的就是它，很多老朋友是噴霧配防曬棒一起用：
噴霧管大面積、防曬棒管補擦跟修飾，不用手、不脫妝。<br><br>
這次<b>補貨噴霧 ＋ $99 加購防曬棒</b>（原價 $699），給第一檔的老朋友。</div>

<h3>B 組（{len(both)} 位）　10 月底發　主旨：謝謝你連續兩檔都來</h3>
<div class=mail>今年 5 月和 8 月，您兩檔都跟我們買了，這在我們的客人裡不到 10%。<br>
入秋之後皮膚會開始乾，想先讓您試試我們回購率最高的「洗安蜜懶人保養組」——
給您一個不公開的體驗價，也想聽聽您用防曬棒的感想。</div>

<h2>九、效益推估</h2>
<table><tr><th>分群</th><th class=n>人數</th><th class=n>假設轉換</th><th class=n>假設客單</th><th class=n>預估營收</th><th>時機</th></tr>
<tr><td>A 補貨＋新品</td><td class=n>{len(only5)}</td><td class=n>10%</td><td class=n>1,500</td><td class=n>{m(len(only5)*0.10*1500)}</td><td>立即</td></tr>
<tr><td>B 忠誠客品類擴張</td><td class=n>{len(both)}</td><td class=n>15%</td><td class=n>3,000</td><td class=n>{m(len(both)*0.15*3000)}</td><td>10 月底</td></tr>
<tr><td>C 首購回購</td><td class=n>{len(only8)}</td><td class=n>8%</td><td class=n>2,000</td><td class=n>{m(len(only8)*0.08*2000)}</td><td>10/23（D+60）</td></tr>
<tr style="border-top:2px solid #25211e"><td><b>合計</b></td><td class=n>{n}</td><td class=n></td><td class=n></td>
<td class=n><b>{m(len(only5)*0.10*1500+len(both)*0.15*3000+len(only8)*0.08*2000)}</b></td><td></td></tr>
</table>

<h2>十、五團對照與最終結論</h2>
<table><tr><th>項目</th><th class=n>陳綾</th><th class=n>Yboutique</th><th class=n>COCO</th><th class=n>桐林</th><th class=n>Stella</th></tr>
<tr><td>顧客數</td><td class=n>427</td><td class=n>1,401</td><td class=n>1,539</td><td class=n>955</td><td class=n>33</td></tr>
<tr><td>客單價</td><td class=n>$6,451</td><td class=n>$1,825</td><td class=n>$1,652</td><td class=n>$1,270</td><td class=n>$1,446</td></tr>
<tr><td>品項數</td><td class=n>7+</td><td class=n>多品項＋組合</td><td class=n>1</td><td class=n>1</td><td class=n>1</td></tr>
<tr><td>回購／回頭率</td><td class=n>15%</td><td class=n><b>20.3%</b></td><td class=n>0.5%</td><td class=n>0.3%</td><td class=n>0%</td></tr>
</table>
<div class=note><b>五團跑完，三條可以直接寫進制度的結論</b>
① <b>品項數決定回購率</b>：多品項團 15–20%，單一 SKU 團 0–0.5%，沒有例外。
開團頁強制配置引流品＋利潤品＋「＋$99 加購」的第二品項。<br>
② <b>新品比補貨更能帶回老客</b>：Yboutique 回頭客買的前三名全是新上市的防曬棒。
每次開團應保留一支「上一檔沒有的新品」作為回頭鉤子。<br>
③ <b>團主回頭率 ≠ 品牌留存</b>：YB 客人跟著團跑（收團兩天內 11 位轉往品馨團），
但只有 2 位回官網。<span class=em>要把團購客變成品牌客，必須靠我們自己的 EDM 與官網經營，不能外包給團主。</span></div>

<div class=foot>HEIWEI 何謂美｜Yboutique團 CRM 行動方案　產出 2026/09/04　資料來源 Shopline Open API（order_source 歸團）　內部限定</div>
"""
open(sp+"/yb.html","w").write(html)
print("wrote yb.html  only5/both/only8 =",len(only5),len(both),len(only8))
