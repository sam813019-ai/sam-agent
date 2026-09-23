#!/usr/bin/env python3
"""團購顧客 CRM 總行動方案（V1）。用法: master_crm_report.py <scratchpad>"""
import json,sys,re,collections,datetime
sp=sys.argv[1]
def D(f): return json.load(open(sp+"/"+f))
cl,co,tl,st,yb,px=D('chenling.json'),D('coco.json'),D('tonglin.json'),D('stella.json'),D('yb.json'),D('pinxin_repeat.json')
def m(v): return f"{v:,.0f}"
MAY='69f055f1d1bff05f11af8636'; AUG='6a869d73b02c3b16856b59c3'
def bottles(v):
    b=0
    for i in v.get('items',[]):
        if '贈品' in i['t']: continue
        mm=re.search(r'(10|[１２３５1235])入',i['t'])
        if mm: b+={'１':1,'２':2,'３':3,'５':5,'1':1,'2':2,'3':3,'5':5,'10':10}[mm.group(1)]*i['q']
    return b
CSS=open(sp+"/crm.html").read().split("<style>")[1].split("</style>")[0]
CSS+="""
.mail{background:#fbf9f7;border:1px solid #e2dcd5;padding:3.5mm 4mm;margin:2mm 0 3mm;font-size:8.8pt;line-height:1.7}
.em{font-weight:700;color:#b0567f}
h3{border-left:3px solid #c98fa8;padding-left:2.5mm;margin-top:5mm}
.tag{font-family:Menlo,monospace;font-size:8.2pt;background:#f2ede7;padding:.3mm 1.4mm;border-radius:2px;white-space:nowrap}
.gantt td{padding:1.4mm 1.6mm}
.wk{background:#c98fa8;color:#fff;text-align:center;font-size:7.6pt;border-radius:2px;padding:.8mm 0}
.wk2{background:#e6d3dc;color:#6f4356;text-align:center;font-size:7.6pt;border-radius:2px;padding:.8mm 0}
"""
html=f"""<title>團購顧客 CRM 總方案</title><style>{CSS}</style>
<div class=hdr><div class=brand>HEIWEI 何謂美｜CRM 內部文件</div>
<h1>團購顧客 CRM 行動方案 V1</h1>
<div class=lead>涵蓋 2025/08–2026/09 全部 26 場團購。深度分析六團、標籤 4,476 位、規劃 7 波行動。
<br>產出 2026/09/04　含顧客個資，限內部使用。</div></div>
<div class=kpis>
<div class=kpi><div class=v>26</div><div class=l>歷來開團場次</div><div class=s>20 位團主</div></div>
<div class=kpi><div class=v>4,934</div><div class=l>已標籤團購客</div><div class=s>全數上「團購-XXX」</div></div>
<div class=kpi><div class=v>1,322萬</div><div class=l>團購累計營收</div><div class=s>佔全站訂單 70%</div></div>
<div class=kpi><div class=v>4,476</div><div class=l>本方案涵蓋</div><div class=s>六團深度分析</div></div>
<div class=kpi><div class=v>44萬</div><div class=l>期望回收營收</div><div class=s>七波行動合計</div></div>
</div>

<h2>一、問題定義</h2>
<p>過去一年開了 26 場團，帶進 4,934 位客戶、1,322 萬營收，佔全站訂單的 70%。
但這些客人幾乎<b>沒有被經營過</b> —— 收團之後沒有任何一封信、任何一次分眾推播。
本方案把其中六個主要團（4,476 位）逐一拆解，建立可重複的標籤體系與行動時程。</p>

<h2>二、五團體質對照</h2>
<table>
<tr><th>項目</th><th class=n>陳綾</th><th class=n>Yboutique</th><th class=n>COCO</th><th class=n>桐林</th><th class=n>Stella</th></tr>
<tr><td>開團期間</td><td class=n>2026/01</td><td class=n>05＋08</td><td class=n>2026/06</td><td class=n>2026/06</td><td class=n>2026/06</td></tr>
<tr><td>顧客數</td><td class=n>427</td><td class=n>1,401</td><td class=n>1,539</td><td class=n>955</td><td class=n>33</td></tr>
<tr><td>團內營收</td><td class=n>439萬</td><td class=n>295萬</td><td class=n>267萬</td><td class=n>127萬</td><td class=n>5萬</td></tr>
<tr><td>客單價</td><td class=n>$6,451</td><td class=n>$1,825</td><td class=n>$1,652</td><td class=n>$1,270</td><td class=n>$1,446</td></tr>
<tr><td>品項數</td><td class=n>7＋</td><td class=n>多品項＋組合</td><td class=n>1</td><td class=n>1</td><td class=n>1</td></tr>
<tr><td><b>回購／回頭率</b></td><td class=n><b>15%</b></td><td class=n><b>20.3%</b></td><td class=n>0.5%</td><td class=n>0.3%</td><td class=n>0%</td></tr>
</table>
<div class=note><b>三條可以直接寫進制度的結論</b>
① <span class=em>品項數決定回購率</span>：多品項團 15–20%，單一 SKU 團 0–0.5%，五團無一例外。
開團頁必須配置引流品＋利潤品，並強制放一個「＋$99 加購」的第二品項。<br>
② <span class=em>新品比補貨更能帶回老客</span>：Yboutique 兩檔都買的 116 位，第二檔買的前三名全是 8 月新上市的防曬棒，
沒有人回來補原本的噴霧。每檔團應保留一支「上一檔沒有的新品」當回頭鉤子。<br>
③ <span class=em>團主回頭率 ≠ 品牌留存</span>：YB 8/24 收團、品馨 8/26 開團，兩天內 11 位客人跟著轉過去，
只有 2 位回官網。她們忠誠的是「團購」這個形式，不是品牌。留存只能自己做，不能外包給團主。</div>

<div class=pb></div>
<h2>三、標籤體系 <span>三個維度，互不干擾</span></h2>
<h3>維度 1｜團別（永久）</h3>
<p><span class=tag>團購-陳綾</span> <span class=tag>團購-COCO</span> <span class=tag>團購-桐林</span>
<span class=tag>團購-Yboutique</span> <span class=tag>團購-品馨</span> …共 20 個，涵蓋 4,934 位。
同一團主多次開團共用一個標籤，篩一個名字就能看到他歷來所有客人。</p>
<h3>維度 2｜顧客狀態（永久，隨行為更新）</h3>
<table><tr><th>標籤</th><th class=n>人數</th><th>定義</th><th>用途</th></tr>
<tr><td><span class=tag>VIP-高價值</span></td><td class=n>79</td><td>累計消費 ≥ $20,000</td><td>排除群發，改一對一經營</td></tr>
<tr><td><span class=tag>回頭客</span></td><td class=n>563</td><td>買過 2 次以上</td><td>與一次性客人分流，訊息與優惠不同</td></tr>
<tr><td><span class=tag>大量採購</span></td><td class=n>253</td><td>單一團購買 7 瓶以上</td><td>經銷／團主候選，個別接觸</td></tr>
</table>
<h3>維度 3｜行動波次（一次性，執行完可移除）</h3>
<p>每個 V1 標籤是由各團報告裡的分群組合而成。下表逐一列出<b>哪一團的哪一個分群被放進哪個標籤</b>，
對照各團報告的第三、四節即可找到該分群的完整名單與策略說明。</p>
<table>
<tr><th>V1 標籤</th><th class=n>總人數</th><th>涵蓋的團主分群（各團報告代號）</th><th class=n>小計</th></tr>

<tr><td rowspan=4><span class=tag>V1-補貨加新品</span><div class=sub>存量已見底</div></td>
<td class=n rowspan=4>1,374</td><td>Yboutique　<b>A 組</b>：只買第一檔（5 月）、8 月沒回來</td><td class=n>455</td></tr>
<tr><td>桐林　<b>A 組</b>（1 瓶）186＋<b>B 組</b>（2 瓶）294</td><td class=n>480</td></tr>
<tr><td>COCO　<b>A 組</b>（1–2 瓶）</td><td class=n>420</td></tr>
<tr><td>Stella　<b>A 組</b>（1–2 瓶）</td><td class=n>20</td></tr>

<tr><td rowspan=3><span class=tag>V1-純新品</span><div class=sub>手上還有貨</div></td>
<td class=n rowspan=3>1,439</td><td>COCO　<b>B 組</b>（3–4 瓶）656＋<b>C 組</b>（5–6 瓶）326</td><td class=n>982</td></tr>
<tr><td>桐林　<b>C 組</b>（3–4 瓶）364＋<b>D 組</b>（5–6 瓶）81</td><td class=n>445</td></tr>
<tr><td>Stella　<b>B 組</b>（3–4 瓶）5＋<b>C 組</b>（5–6 瓶）7</td><td class=n>12</td></tr>

<tr><td><span class=tag>V1-保養線</span></td><td class=n>322</td>
<td>陳綾　<b>C 組</b>（中價值沉睡）146＋<b>D 組</b>（低價值沉睡）176</td><td class=n>322</td></tr>
<tr><td><span class=tag>V1-新品優先</span></td><td class=n>62</td>
<td>陳綾　<b>A 組</b>（已回流活躍，不發折扣）</td><td class=n>62</td></tr>
<tr><td><span class=tag>V1-VIP人工</span></td><td class=n>41</td>
<td>陳綾　<b>B 組</b>（VIP 沉睡，人均 $31,773）</td><td class=n>41</td></tr>
<tr><td><span class=tag>V1-YB回購</span></td><td class=n>830</td>
<td>Yboutique　<b>C 組</b>：只買第二檔（8 月）的新客，D+60 落在 10/23</td><td class=n>830</td></tr>
<tr><td><span class=tag>V1-品馨回購</span></td><td class=n>92</td>
<td>品馨　全新客（團內首購且只下一單），D+60 落在 11/01</td><td class=n>92</td></tr>

<tr><td rowspan=4><span class=tag>大量採購</span><div class=sub>狀態標籤，不進波次</div></td>
<td class=n rowspan=4>253</td><td>COCO　<b>D 組</b>（7 瓶以上）</td><td class=n>137</td></tr>
<tr><td>Yboutique　單檔 7 瓶以上</td><td class=n>85</td></tr>
<tr><td>桐林　<b>E 組</b>（7 瓶以上）</td><td class=n>30</td></tr>
<tr><td>Stella　陳佳妤（15 瓶）</td><td class=n>1</td></tr>
</table>
<div class=note><b>兩群人刻意沒有給波次標籤</b>
① <b>Yboutique B 組（兩檔都買的 116 位）</b>：8 月剛買完、庫存滿，這一輪不推銷。
10 月底要聯繫時用 <span class=tag>團購-Yboutique</span>＋<span class=tag>回頭客</span> 篩，或在 V2 時給正式標籤。<br>
② <b>品馨團的 50 位回頭客</b>：9/02 才收團，尚在蜜月期，11/01 的 D+60 只針對 92 位全新客。<br><br>
另外，<span class=tag>V1-補貨加新品</span> 各團小計加總是 1,375，實際標籤是 1,374 ——
有 1 位客人同時出現在 Yboutique 第一檔與另一團，去重後只算一次。</div>
<div class=note><b>為什麼是三個維度，而不是 80 個標籤</b>
20 個團 × 4 種分群 = 80 個標籤，後台會爆炸且無法維護。
維度分離後，篩選就是交集：<span class=tag>團購-桐林</span>＋<span class=tag>V1-補貨加新品</span> 就是桐林要發的那批；
只篩 <span class=tag>V1-補貨加新品</span> 就是整個第一波。<br><br>
<b>波次標籤的生命週期</b>：每個 V1 標籤直接對應一份寄送名單，單一標籤即可匯出，
不必依賴後台的多條件 AND/OR。活動結束後可用 API（<span class=tag>update_mode=remove</span>，已實測可用）整批清除，
下一輪改用 <span class=tag>V2-</span> 開頭，不會互相污染。</div>

<div class=pb></div>
<h2>四、優先順序與排序原則</h2>
<p><b>唯一的排序原則：這件事拖一個月會不會失去機會。</b>
防曬補貨有季節性，過了 10 月就作廢；沉睡喚醒沒有季節性，已經睡了 7 個月，再等兩週不會更糟。
所以<b>季節性的先做，價值密度高的緊接著，時機未到的排進行事曆</b>。</p>
<table><tr><th class=n>順位</th><th>行動</th><th class=n>人數</th><th>為什麼是這個順位</th></tr>
<tr><td class=n>1</td><td><b>V1-補貨加新品</b></td><td class=n>1,374</td>
<td>季節倒數。防曬已見底且 9 月紫外線仍強，10 月後這封信就沒有意義</td></tr>
<tr><td class=n>2</td><td><b>V1-純新品</b></td><td class=n>1,439</td>
<td>新品訊息不受存量限制，手上有貨的人照樣會被打動；與第 1 波同一批素材，一起發最省力</td></tr>
<tr><td class=n>3</td><td><b>V1-VIP人工</b></td><td class=n>41</td>
<td><span class=em>價值密度最高</span>：41 封信期望 $39,360，一封信值 $960（群發只值 $120）</td></tr>
<tr><td class=n>4</td><td><b>V1-保養線</b>＋<b>V1-新品優先</b></td><td class=n>384</td>
<td>無季節性，單筆期望金額最大，可等前三波跑完再做</td></tr>
<tr><td class=n>5</td><td><b>V1-YB回購</b></td><td class=n>830</td><td>8/24 才收團，D+60 落在 10/23</td></tr>
<tr><td class=n>6</td><td><b>V1-品馨回購</b></td><td class=n>92</td><td>9/02 收團，D+60 落在 11/01</td></tr>
<tr><td class=n>—</td><td><b>大量採購</b>（平行進行）</td><td class=n>253</td>
<td>無季節性但長期價值最高，與第 1 波平行由專人聯繫</td></tr>
</table>
<div class=note><b>如果只能做一件事</b>
做第 3 順位的 <span class=tag>V1-VIP人工</span> 41 位。人均累計消費 $31,773，
是全站唯一一群「證明過願意單次花三萬」的人，而且從 2026 年 1 月至今沒有被任何一封信碰過。
41 封人工信、一天 10 封四天做完，這是投報率差最多的一件事。</div>

<h2>五、執行時程</h2>
<table class=gantt>
<tr><th>行動</th><th class=n>人數</th><th class=n>9月上</th><th class=n>9月中</th><th class=n>9月下</th><th class=n>10/23</th><th class=n>11/01</th></tr>
<tr><td>V1-補貨加新品</td><td class=n>1,374</td><td><div class=wk>發送</div></td><td><div class=wk2>提醒</div></td><td></td><td></td><td></td></tr>
<tr><td>V1-純新品</td><td class=n>1,439</td><td><div class=wk>發送</div></td><td><div class=wk2>提醒</div></td><td></td><td></td><td></td></tr>
<tr><td>大量採購（人工）</td><td class=n>253</td><td><div class=wk>開始</div></td><td><div class=wk>持續</div></td><td><div class=wk>持續</div></td><td></td><td></td></tr>
<tr><td>V1-VIP人工</td><td class=n>41</td><td></td><td><div class=wk>一對一</div></td><td></td><td></td><td></td></tr>
<tr><td>V1-保養線</td><td class=n>322</td><td></td><td></td><td><div class=wk>發送</div></td><td></td><td></td></tr>
<tr><td>V1-新品優先</td><td class=n>62</td><td></td><td></td><td><div class=wk>發送</div></td><td></td><td></td></tr>
<tr><td>V1-YB回購</td><td class=n>830</td><td></td><td></td><td></td><td><div class=wk>D+60</div></td><td></td></tr>
<tr><td>V1-品馨回購</td><td class=n>92</td><td></td><td></td><td></td><td></td><td><div class=wk>D+60</div></td></tr>
</table>
<div class=lead>所有群發一律設 <b>7 天效期</b>，第 5 天對未開信者補一封提醒 ——
品馨團已驗證尾盤效應：最後一天貢獻全期 20% 的單量。</div>

<div class=pb></div>
<h2>六、各波方案</h2>

<h3>第 1 波｜V1-補貨加新品（1,374 位）</h3>
<p><b>訊息主軸</b>：你的防曬用完了，而且我們出了新東西。<b>優惠</b>：補貨團購價 ＋ $99 加購爆白潤色防曬棒（原價 $699）。</p>
<div class=mail>○ 月您在 ○○ 的團帶了爆白防護隔離噴霧，照日常用量算，這陣子應該正好見底。<br>
9 月紫外線還很強，補貨一樣給團購價。<br>
8 月我們上市了「爆白潤色防曬棒 SPF50+」—— 噴霧管大面積、防曬棒管補擦與修飾，
很多老朋友是兩支一起用。<b>補貨加 $99 就能帶一支。</b></div>

<h3>第 2 波｜V1-純新品（1,439 位）</h3>
<p><b>訊息主軸</b>：不提補貨，只講新品。這批人手上還有 3–6 瓶，推補貨會顯得不認識她們。</p>
<div class=mail>您 6 月帶的噴霧估計還能用到 11 月，這封信不是來推補貨的。<br>
8 月我們出了同系列的「爆白潤色防曬棒 SPF50+」，是 8 月那一檔賣最好的品項 ——
不用手、不脫妝，補擦很方便。想先讓您知道，需要再說。</div>

<h3>第 3 波｜V1-VIP人工（41 位）</h3>
<p><b>不發折扣碼、不群發。</b>由品牌方具名一對一，附新品免費體驗，目的是恢復關係而非成交。</p>
<div class=mail>○○ 您好，我是何謂美的品牌經營者陳育慶。<br>
今年 1 月您在陳綾的團購選了懶人保養組合，算一算這幾罐應該早就見底了。<br>
8 月我們出了新品「爆白潤色防曬棒 SPF50+」，想先送您一支體驗，不需要消費。<br>
需要補貨或想聊聊膚況，直接回覆這封信就好，我會親自看。</div>

<h3>第 4 波｜V1-保養線（322 位）＋ V1-新品優先（62 位）</h3>
<p>保養線：懶人保養組補貨 <b>85 折</b>＋滿 $3,000 送防曬棒，7 天限期。
新品優先：<b>不發折扣</b>，給新品搶先購與 VIP 名單資格 —— 這 62 位原價就會買。</p>

<h3>第 5–6 波｜D+60 首購回購（YB 830 位 10/23、品馨 92 位 11/01）</h3>
<p>陳綾團的回購間隔中位數是 66 天，代表<b>每團收團後第 60 天是該團客人的黃金喚醒點</b>。
訊息以「第一次購買後的關心＋補貨提醒＋當期新品」三段式組成。</p>

<h3>平行進行｜大量採購（253 位）</h3>
<p>單團買 7 瓶以上，明顯是分裝或小型代購。<b>不群發</b>，由專人個別聯繫，探詢兩件事：
① 是否有轉售需求 → 導入經銷方案（授權書流程已上線）；② 是否願意自己開一團。
一位手上有 20 位下游的分裝者，價值遠高於 20 封回購信。</p>

<div class=pb></div>
<h2>七、效益推估</h2>
<table><tr><th>波次</th><th class=n>人數</th><th class=n>假設轉換</th><th class=n>假設客單</th><th class=n>預估營收</th></tr>
<tr><td>V1-補貨加新品</td><td class=n>1,374</td><td class=n>10%</td><td class=n>1,400</td><td class=n>192,360</td></tr>
<tr><td>V1-純新品</td><td class=n>1,439</td><td class=n>5%</td><td class=n>1,500</td><td class=n>107,925</td></tr>
<tr><td>V1-VIP人工</td><td class=n>41</td><td class=n>12%</td><td class=n>8,000</td><td class=n>39,360</td></tr>
<tr><td>V1-保養線</td><td class=n>322</td><td class=n>10%</td><td class=n>3,000</td><td class=n>96,600</td></tr>
<tr><td>V1-新品優先</td><td class=n>62</td><td class=n>20%</td><td class=n>2,500</td><td class=n>31,000</td></tr>
<tr><td>V1-YB回購</td><td class=n>830</td><td class=n>8%</td><td class=n>2,000</td><td class=n>132,800</td></tr>
<tr><td>V1-品馨回購</td><td class=n>92</td><td class=n>10%</td><td class=n>2,500</td><td class=n>23,000</td></tr>
<tr style="border-top:2px solid #25211e"><td><b>合計</b></td><td class=n><b>4,160</b></td><td class=n></td><td class=n></td>
<td class=n><b>623,045</b></td></tr>
</table>
<div class=lead>轉換率為假設值，非預測。第 1 波跑完後應以實際數字回推修正後續各波的假設。
<b>大量採購 253 位的經銷轉化未計入</b>，其長期價值可能高於上表任何一列。</div>

<h2>八、執行檢查清單</h2>
<ol>
<li><b>折扣碼在後台手動建</b>：API 建促銷實測回 500，官方 MCP token 需重新授權。用「複製活動」最快。</li>
<li><b>一律走 Email，不要用 LINE 推播</b>：@heiwei 免費版每月 200 則，這批 4,160 人會直接爆量。四團客戶 Email 完整度 100%。</li>
<li><b>排除名單</b>：宋珮瑄、冀子琪（分銷型帳號）已排除在所有 V1 波次外；使用者本人帳號亦已排除。</li>
<li><b>先發小的、再發大的</b>：先跑 V1-VIP人工 41 封觀察回覆率，再放 1,374 與 1,439 的群發。</li>
<li><b>活動結束後清除 V1 標籤</b>：<span class=tag>update_mode=remove</span> 批次清除，下一輪用 V2。</li>
</ol>

<h2>九、V2 的觸發規則：把這次的手工變成制度</h2>
<div class=note><b>三條應該自動化的規則</b>
① <b>D+60 自動觸發</b>：任何團收團後第 60 天，自動對「該團買過但尚未回購」的人發補貨信。
依據是陳綾團回購間隔中位數 66 天。<br>
② <b>存量推算取代統一週期</b>：防曬噴霧 150ml 約 50 天／瓶、洗面乳 100ml 約 60 天、水安瓶 50ml 約 60 天。
用「購買日＋瓶數×天數」算出每個人的補貨日，比統一的 D+60 更精準 ——
桐林團就是靠這個算法找出 50% 的人正好在 9–10 月見底。<br>
③ <b>新品上市即回頭鉤子</b>：每次新品上市，自動對「所有沉睡團購客且未買過此品項」的人發一封介紹信。
Yboutique 的數據證明這比補貨提醒更有效。</div>
<div class=note><b>但最重要的一件事在開團之前</b>
本方案的 62 萬是在補救已經漏掉的水。真正該做的是把桶子補起來：
<span class=em>開團頁強制配置兩個品類（引流品＋利潤品）＋一個「＋$99 加購」的第二品項</span>。
陳綾團（7 品項）回購 15%、YB（多品項）20.3%，三個單一 SKU 團全部低於 0.5% ——
這條規則的長期價值，大於本方案七波加總。</div>

<div class=foot>HEIWEI 何謂美｜團購顧客 CRM 行動方案 V1　產出 2026/09/04　
資料來源 Shopline Open API（order_source 歸團）　配套文件：六份團別報告　內部限定</div>
"""
open(sp+"/master.html","w").write(html)
print("wrote master.html")
