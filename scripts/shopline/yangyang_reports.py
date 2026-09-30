#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""楊楊生日慶團（YB 第二團）兩份報告：
  A. CRM V1 成效報告（3 頁）—— V1 標籤名單在本團的回購表現
  B. 開團結案報告・進度快照（4 頁）—— 尚未結算，退貨期未過

資料來源：data/yangyang/orders.json（Open API 撈的本團訂單）
          data/yangyang/tagmap.json（各標籤的會員 id 集合）
視覺沿用 gen_closing_report.py 的版式。

用法：python3 scripts/shopline/yangyang_reports.py
"""
import json, re, collections, datetime, subprocess, pathlib, os

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "data/yangyang"
DOCS = ROOT / "docs"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TODAY = datetime.date(2026, 9, 27)
CAMP = "楊楊生日慶ｘ何謂美"
PERIOD = "2026/09/20–09/27"
RATE = "35%"

CSS = """
@page{size:A4;margin:0}
*{box-sizing:border-box;animation:none!important}
html,body{margin:0;padding:0}
:root{--gray:#97999B;--leaf:#8C9A8E;--amber:#EF9F27;--ink:#25262a;--gold:#C9A15C}
body{font-family:"Noto Sans CJK TC","Noto Sans TC","PingFang TC","Heiti TC",sans-serif;
 color:var(--ink);font-size:9.4pt;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;padding:13mm 15mm 11mm;position:relative;overflow:hidden;page-break-after:always}
.page:last-child{page-break-after:auto}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid var(--ink);padding-bottom:3.4mm}
.logo{font-size:18.5pt;font-weight:700;letter-spacing:.34em;line-height:1}
.logo .sub{font-size:8pt;font-weight:400;letter-spacing:.62em;color:var(--gray);margin-top:2.2mm}
.hdr{text-align:right;line-height:1.55}
.hdr .t1{font-size:9.2pt;font-weight:700}
.hdr .t2{font-size:8.4pt;color:var(--gray)}
.hdr .t3{font-size:8.2pt;color:#5f6064}
h1{font-size:20pt;font-weight:700;margin:8mm 0 2.2mm}
.meta{font-size:9.2pt;color:#4d4e52}
.meta2{font-size:8.6pt;color:var(--gray);margin-top:1.2mm}
.rule{width:26mm;height:2.4px;background:var(--ink);margin:3.4mm 0 0}
.sec{margin-top:6mm}
.sh{display:flex;align-items:center;gap:3mm;margin-bottom:2.8mm}
.sh::before{content:"";width:1.6mm;height:4.4mm;background:var(--ink);display:block}
.sh b{font-size:11pt;letter-spacing:.04em}
.sh span{font-size:7.8pt;color:var(--gray);letter-spacing:.2em}
.ov{background:#f5f5f5;padding:4.4mm 5.5mm;display:grid;grid-template-columns:auto 1fr auto 1fr;gap:3.2mm 7mm;font-size:9.2pt}
.ov .k{color:#5f6064;white-space:nowrap}
.ov .v{font-weight:700;text-align:right;white-space:nowrap}
.kpis{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3.4mm}
.kpi{border:1px solid #dcdcdd;padding:3.6mm 4.2mm 4mm}
.kpi.dark{background:#25262a;border-color:#25262a;color:#fff}
.kpi .l{font-size:8.2pt;color:#63646a}
.kpi.dark .l{color:#c6c7ca}
.kpi .v{font-size:19.5pt;font-weight:700;letter-spacing:-.012em;line-height:1.28;margin-top:.8mm}
.kpi .v small{font-size:9pt;font-weight:700}
.kpi .s{font-size:7.8pt;color:var(--gray);margin-top:1mm}
.kpi.dark .s{color:#9b9ca0}
table{width:100%;border-collapse:collapse}
th{font-size:8.4pt;color:#4d4e52;font-weight:600;text-align:left;background:#efefef;padding:2.4mm 3mm}
td{padding:2.4mm 3mm;border-bottom:1px solid #ededee;font-size:9.2pt}
.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
tr.sum td{background:#f5f5f5;font-weight:700;border-bottom:none}
tr.dim td{color:var(--gray)}
.pill{display:inline-block;background:#25262a;color:#fff;font-size:7.8pt;font-weight:600;border-radius:9px;padding:.8mm 2.8mm}
.pill.g{background:var(--leaf)}
.pill.a{background:var(--amber)}
.pill.o{background:#fff;color:var(--gray);border:1px solid #dcdcdd}
.mute{color:var(--gray);font-size:8.6pt}
.callout{border-left:3px solid var(--leaf);background:#f6f7f6;padding:3mm 4mm;font-size:8.8pt;color:#4d4e52;margin-top:3mm;line-height:1.7}
.callout.warn{border-left-color:var(--amber);background:#fdf8f0}
.callout.dark{border-left-color:var(--ink);background:#f1f1f2}
.callout b{color:var(--ink)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:6mm;align-items:start}
.dtl{display:flex;align-items:center;gap:3.5mm;padding:1.5mm 0}
.dtl .d{width:13mm;font-size:8.8pt;color:#4d4e52;font-variant-numeric:tabular-nums}
.dtl .track{flex:1;background:#ececed;border-radius:1.6mm;height:3.2mm;overflow:hidden}
.dtl .fill{height:100%;background:#b6b7b9;border-radius:1.6mm}
.dtl .fill.top{background:#25262a}
.dtl .v{width:34mm;text-align:right;font-size:8.8pt;font-weight:600;font-variant-numeric:tabular-nums}
.trendbox{border:1px solid #e4e4e5;padding:4mm 5mm}
.bar{height:2.6mm;background:#b6b7b9;border-radius:1.3mm;display:inline-block;vertical-align:middle}
.bar.g{background:var(--leaf)}
.bar.a{background:var(--amber)}
ul.ins{list-style:none;margin:0;padding:0}
ul.ins li{position:relative;padding:1.8mm 0 1.8mm 6mm;font-size:9.2pt;border-bottom:1px solid #f0f0f1}
ul.ins li::before{content:"";position:absolute;left:1.2mm;top:3.8mm;width:2.4mm;height:2.4mm;border-radius:50%;background:var(--leaf)}
ul.ins li.a::before{background:var(--amber)}
ul.ins li.g::before{background:var(--gray)}
ul.ins b{font-weight:700}
.band{background:#25262a;color:#fff;padding:3.4mm 5mm;font-size:9.6pt;font-weight:700}
.settle{border:1px solid #dcdcdd;border-top:none;padding:1mm 5mm 3mm}
.srow{display:flex;justify-content:space-between;align-items:baseline;padding:2.8mm 0;border-bottom:1px dotted #d5d5d6}
.srow:last-child{border-bottom:none}
.srow .lab{font-size:9.2pt}
.srow .amt{font-size:15pt;font-weight:700;font-variant-numeric:tabular-nums}
.srow.off{color:var(--gray)}
.srow.off .amt{font-size:10pt;font-weight:600}
.ft{position:absolute;left:15mm;right:15mm;bottom:8mm;display:flex;justify-content:space-between;
 border-top:1px solid #e4e4e5;padding-top:2.4mm;font-size:7.6pt;color:#a9aaad}
.big{font-size:34pt;font-weight:700;letter-spacing:-.02em;line-height:1}
.big small{font-size:11pt}
.seg{display:flex;align-items:center;gap:3mm;padding:2mm 0;border-bottom:1px solid #f0f0f1}
.seg .nm{width:34mm;font-size:8.8pt}
.seg .track{flex:1;background:#ececed;height:4mm;border-radius:2mm;overflow:hidden}
.seg .fill{height:100%;border-radius:2mm;background:var(--leaf)}
.seg .fill.dim{background:#cfd0d1}
.seg .v{width:30mm;text-align:right;font-size:8.8pt;font-weight:600;font-variant-numeric:tabular-nums}
"""


def hd(t1, t2, t3=""):
    return (f"<div class=hd><div class=logo>HEIWEI<div class=sub>何 謂 美</div></div>"
            f"<div class=hdr><div class=t1>{t1}</div><div class=t2>{t2}</div><div class=t3>{t3}</div></div></div>")


def ft(label, i, n):
    return (f"<div class=ft><div>HEIWEI 何謂美　｜　機密・內部文件</div>"
            f"<div>{label}　・　{i} / {n}</div></div>")


def m(v):
    return f"{v:,.0f}"


def sanitize(name):
    """內部結算文件不複述 SPF／美白／防曬 等功效宣稱（沿用結案報告規格 §9）。"""
    out = re.sub(r"SPF\s*\d+\+?", "", name, flags=re.I)
    out = out.replace("防曬", "防護").replace("美白", "亮白")
    return re.sub(r"\s{2,}", " ", out).strip()


# ── 讀資料 ────────────────────────────────────────────────────────────────
orders = json.load(open(DATA / "orders.json"))
tagmap = {k: set(v) for k, v in json.load(open(DATA / "tagmap.json")).items()}

CANC = ("cancelled", "removed")
valid = [o for o in orders if o.get("status") not in CANC]
canc = [o for o in orders if o.get("status") in CANC]
paid = [o for o in valid if o.get("status") in ("confirmed", "completed")]
pend = [o for o in valid if o.get("status") == "pending"]


def money(o):
    return float((o.get("total") or {}).get("dollars") or 0)


def tw(o):
    return datetime.datetime.strptime(o["created_at"][:19], "%Y-%m-%dT%H:%M:%S") + datetime.timedelta(hours=8)


def titles(o):
    """回傳 [(品名, 數量, 小計)]"""
    out = []
    for s in o.get("subtotal_items", []):
        raw = json.dumps(s, ensure_ascii=False)
        mm = re.findall(r'"zh-hant": "([^"]{4,60})"', raw)
        t = mm[0] if mm else "?"
        q = s.get("quantity") or 0
        pr = float(((s.get("item_price") or {}).get("dollars")) or 0)
        out.append((t, q, pr * q))
    return out


def sticks(o):
    n = 0
    for t, q, _ in titles(o):
        if "防曬棒" not in t:
            continue
        n += 2 * q if ("2入】爆白防曬棒" in t or "防曬棒*2" in t) else q
    return n


def payname(o):
    return ((o.get("order_payment") or {}).get("name_translations") or {}).get("zh-hant") or "—"


def shipped(o):
    return (o.get("order_delivery") or {}).get("status") in ("shipped", "arrived", "collected")


GMV = sum(money(o) for o in valid)
GMV_PAID = sum(money(o) for o in paid)
AOV = GMV / len(valid)
cust = collections.defaultdict(lambda: {"n": 0, "rev": 0.0})
for o in valid:
    c = o.get("customer_id")
    if c:
        cust[c]["n"] += 1
        cust[c]["rev"] += money(o)
buyers = set(cust)

# ── A. CRM V1 成效 ────────────────────────────────────────────────────────
V1 = ["V1-YB回購", "V1-YB忠誠客", "V1-補貨加新品", "V1-純新品",
      "V1-新品優先", "V1-保養線", "V1-VIP人工", "V1-品馨回購"]
seg = []
for t in V1:
    pool = tagmap[t]
    hit = pool & buyers
    rev = sum(cust[c]["rev"] for c in hit)
    seg.append({"tag": t, "pool": len(pool), "hit": len(hit),
                "rate": len(hit) / len(pool) * 100 if pool else 0,
                "orders": sum(cust[c]["n"] for c in hit), "rev": rev,
                "aov": rev / len(hit) if hit else 0})
seg.sort(key=lambda s: -s["rate"])
all_v1 = set().union(*[tagmap[t] for t in V1])
hit_v1 = all_v1 & buyers
rev_v1 = sum(cust[c]["rev"] for c in hit_v1)
non_v1 = buyers - hit_v1
rev_non = sum(cust[c]["rev"] for c in non_v1)
aov_v1 = rev_v1 / len(hit_v1)
aov_non = rev_non / len(non_v1)

STATE = []
for t in ["VIP-高價值", "回頭客", "大量採購"]:
    hit = tagmap[t] & buyers
    rev = sum(cust[c]["rev"] for c in hit)
    STATE.append({"tag": t, "pool": len(tagmap[t]), "hit": len(hit),
                  "rate": len(hit) / len(tagmap[t]) * 100, "rev": rev,
                  "aov": rev / len(hit) if hit else 0})

yb_old = (tagmap["V1-YB回購"] | tagmap["V1-YB忠誠客"]) & buyers
rev_old = sum(cust[c]["rev"] for c in yb_old)
brand_new = buyers - hit_v1 - tagmap["VIP-高價值"] - tagmap["回頭客"] - tagmap["大量採購"]
rev_new = sum(cust[c]["rev"] for c in brand_new)

LBL_A = f"{CAMP}・CRM V1 成效"
segmax = max(s["rate"] for s in seg) or 1
seg_rows = "".join(
    f"<tr{' class=dim' if s['hit']==0 else ''}><td>{s['tag']}</td><td class=n>{s['pool']:,}</td>"
    f"<td class=n>{s['hit']}</td><td class=n><b>{s['rate']:.1f}%</b></td>"
    f"<td class=n>{s['orders']}</td><td class=n>NT${m(s['rev'])}</td>"
    f"<td class=n>{'NT$'+m(s['aov']) if s['hit'] else '—'}</td>"
    f"<td style='padding-left:5mm'><span class='bar{' g' if s['rate']>=10 else ''}' "
    f"style='width:{s['rate']/segmax*24:.1f}mm'></span></td></tr>" for s in seg)

state_rows = "".join(
    f"<tr><td>{s['tag']}</td><td class=n>{s['pool']:,}</td><td class=n>{s['hit']}</td>"
    f"<td class=n>{s['rate']:.1f}%</td><td class=n>NT${m(s['rev'])}</td>"
    f"<td class=n>{'NT$'+m(s['aov']) if s['hit'] else '—'}</td></tr>" for s in STATE)

a1 = f"""<div class=page>
{hd("CRM V1 成效報告", "CRM WAVE-1 PERFORMANCE", f"製表：{TODAY:%Y/%m/%d}　｜　品牌行銷")}
<h1>V1 標籤名單・回購成效驗證</h1>
<div class=meta>驗證場域：{CAMP}（{PERIOD}）　｜　V1 標籤上線：2026/09/04</div>
<div class=meta2>⚠ 歸因限制：V1 七波 Email 已陸續發送，但<b>發送波次、時間與寄出量尚未回報</b>。以下為「標籤分群整體成效」，<b>不等於 Email 成效</b>；要分離 Email 增量需補齊發送紀錄。</div>
<div class=rule></div>

<div class=sec><div class=sh><b>一句話結論</b><span>BOTTOM LINE</span></div>
<div class=callout dark style="border-left-color:#25262a;background:#f1f1f2;font-size:9.6pt">
V1 名單 <b>4,247 位</b>中有 <b>{len(hit_v1)} 位</b>（{len(hit_v1)/len(all_v1)*100:.1f}%）在本團回購，
貢獻 <b>NT${m(rev_v1)}</b>，占全團營業額 <b>{rev_v1/GMV*100:.1f}%</b>；
其客單價 <b>NT${m(aov_v1)}</b>，比非名單客戶高 <b>{(aov_v1/aov_non-1)*100:.0f}%</b>。
但回購幾乎全部集中在<b>同一位團主的舊客</b>，跨團名單接近於零。
</div></div>

<div class=sec><div class=sh><b>核心數字</b><span>KEY RESULTS</span></div>
<div class=kpis>
  <div class="kpi dark"><div class=l>V1 名單回購貢獻</div>
    <div class=v><small>NT$</small>{m(rev_v1)}</div>
    <div class=s>占全團 {rev_v1/GMV*100:.1f}%・{len(hit_v1)} 位客戶</div></div>
  <div class=kpi><div class=l>名單整體回購率</div><div class=v>{len(hit_v1)/len(all_v1)*100:.1f}<small>%</small></div>
    <div class=s>4,247 位名單 → {len(hit_v1)} 位回購</div></div>
  <div class=kpi><div class=l>客單價落差</div><div class=v>+{(aov_v1/aov_non-1)*100:.0f}<small>%</small></div>
    <div class=s>NT${m(aov_v1)} vs NT${m(aov_non)}</div></div>
</div></div>

<div class=sec><div class=sh><b>名單客 vs 非名單客</b><span>SEGMENT SPLIT</span></div>
<table>
<tr><th>客群</th><th class=n>人數</th><th class=n>占比</th><th class=n>營業額</th><th class=n>占營收</th><th class=n>客單價</th></tr>
<tr><td>V1 名單客（帶任一 V1 標籤）</td><td class=n>{len(hit_v1)}</td>
  <td class=n>{len(hit_v1)/len(buyers)*100:.1f}%</td><td class=n>NT${m(rev_v1)}</td>
  <td class=n>{rev_v1/GMV*100:.1f}%</td><td class=n><b>NT${m(aov_v1)}</b></td></tr>
<tr><td>非名單客</td><td class=n>{len(non_v1)}</td>
  <td class=n>{len(non_v1)/len(buyers)*100:.1f}%</td><td class=n>NT${m(rev_non)}</td>
  <td class=n>{rev_non/GMV*100:.1f}%</td><td class=n>NT${m(aov_non)}</td></tr>
<tr class=sum><td>本團合計</td><td class=n>{len(buyers)}</td><td class=n>100%</td>
  <td class=n>NT${m(GMV)}</td><td class=n>100%</td><td class=n>NT${m(GMV/len(buyers))}</td></tr>
</table>
<div class=callout>名單客只占人數 {len(hit_v1)/len(buyers)*100:.0f}%，卻貢獻 {rev_v1/GMV*100:.0f}% 營收——
<b>標籤分群本身就有價值</b>，即使一封信都還沒發。</div>
</div>
<div class=sec><div class=sh><b>舊客與新客結構</b><span>OLD vs NEW</span></div>
<div class=kpis>
  <div class=kpi><div class=l>YB 系舊客回購</div><div class=v>{len(yb_old)} <small>位</small></div>
    <div class=s>NT${m(rev_old)}・客單 NT${m(rev_old/len(yb_old))}</div></div>
  <div class=kpi><div class=l>全新客（無任何既有標籤）</div><div class=v>{len(brand_new)} <small>位</small></div>
    <div class=s>NT${m(rev_new)}・客單 NT${m(rev_new/len(brand_new))}</div></div>
  <div class="kpi dark"><div class=l>本團新增名單</div><div class=v>{len(brand_new)} <small>位</small></div>
    <div class=s>已標 團購-Yboutique，可進 V2</div></div>
</div>
<div class=callout>本團 <b>{len(brand_new)/len(buyers)*100:.0f}%</b> 是全新客，客單 NT${m(rev_new/len(brand_new))}；
舊客雖只 {len(yb_old)} 位，客單高出 <b>{(rev_old/len(yb_old))/(rev_new/len(brand_new))*100-100:.0f}%</b>。
新客進得來、舊客買得多，兩邊要用不同的下一步。</div>
</div>
{ft(LBL_A, 1, 3)}</div>"""

a2 = f"""<div class=page>
{hd("CRM V1 成效報告", f"{CAMP}・{PERIOD}")}
<div class=sec><div class=sh><b>八個 V1 波次標籤・逐條成效</b><span>BY WAVE TAG</span></div>
<table>
<tr><th>V1 標籤</th><th class=n>名單數</th><th class=n>回購人數</th><th class=n>回購率</th>
  <th class=n>訂單</th><th class=n>營業額</th><th class=n>客單價</th><th style="padding-left:5mm">回購率</th></tr>
{seg_rows}
<tr class=sum><td>合計（去重）</td><td class=n>{len(all_v1):,}</td><td class=n>{len(hit_v1)}</td>
  <td class=n>{len(hit_v1)/len(all_v1)*100:.1f}%</td><td class=n>{sum(s['orders'] for s in seg)}</td>
  <td class=n>NT${m(rev_v1)}</td><td class=n>NT${m(aov_v1)}</td><td></td></tr>
</table>
<div class=callout warn><b>斷層非常明顯</b>：前兩名（V1-YB忠誠客 {seg[0]['rate']:.1f}%、V1-YB回購 {seg[1]['rate']:.1f}%）
都是<b>這位團主自己的舊客</b>；其餘六個標籤合計 {sum(s['hit'] for s in seg[2:])} 位回購，
其中 V1-保養線、V1-VIP人工、V1-品馨回購 <b>掛零</b>。名單大小與回購率無關——
V1-純新品有 1,440 人卻只回來 2 位（0.1%）。</div>
</div>

<div class=sec><div class=sh><b>狀態標籤表現</b><span>STATUS TAGS</span></div>
<table>
<tr><th>狀態標籤</th><th class=n>名單數</th><th class=n>回購人數</th><th class=n>回購率</th>
  <th class=n>營業額</th><th class=n>客單價</th></tr>
{state_rows}
</table>
<div class=callout>「回頭客」名單回購率 {STATE[1]['rate']:.1f}%、客單 NT${m(STATE[1]['aov'])}，
明顯優於整團平均 NT${m(GMV/len(buyers))}——<b>有回購史的人最值得投放</b>。
反觀「VIP-高價值」79 位只回來 1 位，高價值客與團購檔期的商品結構不合，應走一對一而非團購推播。</div>
</div>

{ft(LBL_A, 2, 3)}</div>"""

a3 = f"""<div class=page>
{hd("CRM V1 成效報告", f"{CAMP}・{PERIOD}")}
<div class=sec><div class=sh><b>三條結論</b><span>FINDINGS</span></div>
<ul class=ins>
<li><b>① 團主名單有效，品牌名單無效。</b>
YB 系標籤回購率 13.7–18.3%，跨團名單（純新品 0.1%、保養線 0%、品馨回購 0%）幾近於零。
這再次驗證 V1 總方案的結論③「團主回頭率 ≠ 品牌留存」——
<b>顧客記得的是團主，不是 HEIWEI</b>。V2 的名單切分應以「團主」為第一維度，而非波次主題。</li>
<li class=a><b>② 標籤分群有效，但 Email 的功勞目前算不出來。</b>
名單客貢獻 NT${m(rev_v1)}（全團 {rev_v1/GMV*100:.0f}%），然而七波 Email 的
<b>發送波次、時間與寄出量尚未回報</b>，無法分離「標籤本身」與「Email 推播」各自的貢獻。
補齊發送紀錄後即可比對；下一檔起建議直接對 V1-YB回購（830 位、本團已證實 13.7% 會回購）
做<b>寄信組 vs 對照組 A/B 測試</b>，一次量出 Email 的真實增量。</li>
<li class=g><b>③ 名單大小不等於價值，該砍的要砍。</b>
V1-純新品 1,440 人回購 2 位、V1-保養線 322 人掛零、V1-VIP人工 41 人掛零。
這三個標籤合計 1,803 人、貢獻 NT$5,100。V2 不應繼續對這批人發團購訊息，
改走「新品體驗包」或一對一，否則只是消耗品牌信任與發信額度。</li>
</ul></div>

<div class=sec><div class=sh><b>V2 建議動作</b><span>NEXT ACTIONS</span></div>
<table>
<tr><th>優先</th><th>對象</th><th class=n>人數</th><th style="padding-left:4mm">動作</th></tr>
<tr><td><span class=pill>最高</span></td><td>補齊 V1 Email 發送紀錄</td><td class=n>—</td>
  <td style="padding-left:4mm">波次／日期／寄出量，沒有這個無法算 Email 增量</td></tr>
<tr><td><span class=pill>最高</span></td><td>V1-YB回購 ÷ 對照組</td><td class=n>830</td>
  <td style="padding-left:4mm">A/B 測 Email 增量，是唯一已證實會回購的大名單</td></tr>
<tr><td><span class="pill g">高</span></td><td>本團全新客</td><td class=n>{len(brand_new)}</td>
  <td style="padding-left:4mm">下一檔 YB 團開團前 3 天預告；趁團主記憶還新</td></tr>
<tr><td><span class="pill g">高</span></td><td>回頭客（客單 NT${m(STATE[1]['aov'])}）</td><td class=n>563</td>
  <td style="padding-left:4mm">跨團主推薦：有回購史，對品牌本身的接受度較高</td></tr>
<tr><td><span class="pill a">中</span></td><td>VIP-高價值</td><td class=n>79</td>
  <td style="padding-left:4mm">退出團購推播，改一對一；團購商品結構不符其消費習慣</td></tr>
<tr class=dim><td><span class="pill o">暫停</span></td><td>V1-純新品／保養線／品馨回購</td><td class=n>1,803</td>
  <td style="padding-left:4mm">停止團購訊息，避免消耗信任；改以新品體驗切入</td></tr>
</table></div>

<div class=sec><div class=sh><b>量測方式（給 V2 的規格）</b><span>MEASUREMENT</span></div>
<div class=callout>本報告的算法可重複執行：以 <code>order_source.source_id</code> 圈出單一團的訂單 →
取其 <code>customer_id</code> 集合 → 與各標籤的會員集合取交集 → 得回購人數、營業額與客單價。
腳本：<b>scripts/shopline/yangyang_reports.py</b>，資料快照在 <b>data/yangyang/</b>。
下一團只需換 source_id 即可產出同格式報告，兩團之間可直接比較。</div>
</div>
{ft(LBL_A, 3, 3)}</div>"""

# ── B. 開團結案報告（快照） ───────────────────────────────────────────────
day = collections.OrderedDict()
for o in valid:
    k = tw(o).strftime("%m/%d")
    a = day.setdefault(k, {"n": 0, "gmv": 0.0})
    a["n"] += 1
    a["gmv"] += money(o)
days = sorted(day.items())
dmax = max(d["gmv"] for _, d in days)
peak = max(days, key=lambda kv: kv[1]["gmv"])

prod = collections.Counter()
prodrev = collections.Counter()
for o in valid:
    for t, q, amt in titles(o):
        prod[sanitize(t)[:34]] += q
        prodrev[sanitize(t)[:34]] += amt
gift = {k: v for k, v in prod.items() if prodrev[k] == 0}
sold = [(k, v) for k, v in prod.items() if prodrev[k] > 0]
sold.sort(key=lambda kv: -prodrev[kv[0]])
goods = sum(prodrev.values())
pmax = prodrev[sold[0][0]]
prod_rows = "".join(
    f"<tr><td>{k}</td><td class=n>{v}</td><td class=n>NT${m(prodrev[k])}</td>"
    f"<td class=n>{prodrev[k]/goods*100:.1f}%</td>"
    f"<td style='padding-left:5mm'><span class=bar style='width:{prodrev[k]/pmax*24:.1f}mm'></span></td></tr>"
    for k, v in sold[:8])

paycnt = collections.Counter(payname(o) for o in valid)
payrev = collections.Counter()
for o in valid:
    payrev[payname(o)] += money(o)
unpaid_prepay = [o for o in pend if "取貨付款" not in payname(o)]
unpaid_cod = [o for o in pend if "取貨付款" in payname(o)]
up_rev = sum(money(o) for o in unpaid_prepay)
up_stick = sum(sticks(o) for o in unpaid_prepay)
old24 = sum(1 for o in unpaid_prepay
            if (datetime.datetime(2026, 9, 27, 17, 0) - tw(o)).total_seconds() > 86400)

ship_orders = [o for o in orders if shipped(o)]
st_all = sum(sticks(o) for o in valid)
st_ship = sum(sticks(o) for o in ship_orders)
st_paid_unship = sum(sticks(o) for o in paid if not shipped(o))
st_pend = sum(sticks(o) for o in pend)
PREORDER = 138 + 138 + 27  # 主商品 -138 / 2入 -69 組 / 1入 -27（9/27 讀數）

pay_rows = "".join(
    f"<tr><td>{k}</td><td class=n>{v}</td><td class=n>{v/len(valid)*100:.1f}%</td>"
    f"<td class=n>NT${m(payrev[k])}</td></tr>" for k, v in paycnt.most_common())

LBL_B = f"{CAMP}・結案快照"
pctf = lambda x: f"{x/len(orders)*100:.1f}%"

b1 = f"""<div class=page>
{hd("開團結案報告・進度快照", "CLOSING SNAPSHOT", f"製表：{TODAY:%Y/%m/%d}　｜　業務通路B")}
<h1>{CAMP}・結案進度快照</h1>
<div class=meta>檔期：{PERIOD}（已結束）　｜　資料截至 {TODAY:%Y/%m/%d} 17:00　｜　分潤 <b>{RATE}</b></div>
<div class=meta2>狀態：<b>未結算</b>。退貨期未過、未付款訂單尚有變動空間，本表數字非最終值，不得作為分潤結算依據。</div>
<div class=rule></div>

<div class=sec><div class=sh><b>活動概覽</b><span>OVERVIEW</span></div>
<div class=ov>
  <div class=k>活動名稱</div><div class=v>{CAMP}</div>
  <div class=k>團主</div><div class=v>楊楊（Yboutique）</div>
  <div class=k>分潤類型</div><div class=v>商品百分比 {RATE}</div>
  <div class=k>主打商品</div><div class=v>爆白潤色防護棒・活氧B群保濕噴霧</div>
  <div class=k>訂單總數</div><div class=v>{len(orders)} 筆</div>
  <div class=k>報告性質</div><div class=v>進度快照（未結算）</div>
</div></div>

<div class=sec><div class=sh><b>核心成效</b><span>KEY RESULTS</span></div>
<div class=kpis>
  <div class="kpi dark"><div class=l>銷售總額（有效訂單・含運）</div>
    <div class=v><small>NT$</small>{m(GMV)}</div>
    <div class=s>{len(valid)} 筆・AOV NT${m(AOV)}</div></div>
  <div class=kpi><div class=l>已確認訂單金額</div><div class=v><small>NT$</small>{m(GMV_PAID)}</div>
    <div class=s>{len(paid)} 筆・已付款或取貨付款成立</div></div>
  <div class=kpi><div class=l>不重複客戶</div><div class=v>{len(buyers)} <small>位</small></div>
    <div class=s>人均 NT${m(GMV/len(buyers))}</div></div>
</div>
<div class=kpis style="margin-top:3.4mm">
  <div class=kpi><div class=l>單日最高</div><div class=v><small>NT$</small>{m(peak[1]['gmv'])}</div>
    <div class=s>{peak[0]}・{peak[1]['n']} 筆（首日）</div></div>
  <div class=kpi><div class=l>已取消</div><div class=v>{len(canc)} <small>筆</small></div>
    <div class=s>NT${m(sum(money(o) for o in canc))}・不列入</div></div>
  <div class=kpi><div class=l>分潤估算（{RATE}・未結算）</div>
    <div class=v><small>NT$</small>{m(GMV*0.35)}</div>
    <div class=s>以有效訂單估，非實結</div></div>
</div></div>

<div class=sec><div class=sh><b>訂單狀態分布</b><span>ORDER STATUS</span></div>
<table>
<tr><th>狀態</th><th class=n>訂單數</th><th class=n>占比</th><th class=n>金額</th><th style="padding-left:5mm">說明</th></tr>
<tr><td>已確認（含取貨付款成立）</td><td class=n>{len(paid)}</td><td class=n>{pctf(len(paid))}</td>
  <td class=n>NT${m(GMV_PAID)}</td><td style="padding-left:5mm"><span class=pill>計入</span></td></tr>
<tr><td>未付款（待付款／待取貨付款）</td><td class=n>{len(pend)}</td><td class=n>{pctf(len(pend))}</td>
  <td class=n>NT${m(sum(money(o) for o in pend))}</td>
  <td class=mute style="padding-left:5mm">變動中，見第 3 頁</td></tr>
<tr class=dim><td>已取消</td><td class=n>{len(canc)}</td><td class=n>{pctf(len(canc))}</td>
  <td class=n>NT${m(sum(money(o) for o in canc))}</td>
  <td class=mute style="padding-left:5mm">排除</td></tr>
<tr class=sum><td>合計</td><td class=n>{len(orders)}</td><td class=n>100%</td>
  <td class=n>NT${m(sum(money(o) for o in orders))}</td>
  <td style="padding-left:5mm">有效 {len(valid)} 筆</td></tr>
</table>
<div class=callout warn>未付款占 <b>{len(pend)/len(orders)*100:.0f}%</b>，其中 {len(unpaid_cod)} 筆為超商取貨付款（屬正常，取貨時才付），
另 <b>{len(unpaid_prepay)} 筆為預付款方式卻逾時未付</b>——這批是真正的流失風險，詳見第 3 頁。</div>
</div>
{ft(LBL_B, 1, 4)}</div>"""

day_rows = "".join(
    f"<div class=dtl><div class=d>{d}</div><div class=track>"
    f"<div class='fill{' top' if a['gmv']==dmax else ''}' style='width:{a['gmv']/dmax*100:.1f}%'></div>"
    f"</div><div class=v>{a['n']} 筆・NT${m(a['gmv'])}</div></div>" for d, a in days)

b2 = f"""<div class=page>
{hd("開團結案報告・進度快照", f"{CAMP}・{PERIOD}")}
<div class=sec><div class=sh><b>商品組合銷售</b><span>PRODUCT MIX</span></div>
<table>
<tr><th>商品組合</th><th class=n>件數</th><th class=n>銷售額</th><th class=n>占比</th>
  <th style="padding-left:5mm">視覺占比</th></tr>
{prod_rows}
<tr class=sum><td>全品項合計（{len(sold)} 項，上表列前 8 大）</td><td class=n>{sum(v for _,v in sold)}</td>
  <td class=n>NT${m(goods)}</td><td class=n>100%</td><td></td></tr>
</table>
<div class=callout><b>觀察</b>：活氧B群保濕噴霧各規格合計 NT${m(sum(prodrev[k] for k in prodrev if 'B群' in k))}，
是本團金額冠軍；爆白潤色防護棒合計 <b>{st_all} 支</b>、NT${m(sum(prodrev[k] for k in prodrev if '防護棒' in k or '防曬棒' in k))}，
負責帶量。新品高端精華水安瓶首度進團，合計 NT${m(sum(prodrev[k] for k in prodrev if '水安瓶' in k))}，
首戰表現可接受，可列入下一團常設品項。</div>
</div>

<div class=sec><div class=sh><b>每日成交趨勢</b><span>DAILY TREND</span></div>
<div class=trendbox>{day_rows}</div>
<div class=callout>首日 {days[0][1]['n']} 筆、NT${m(days[0][1]['gmv'])}，占全團 <b>{days[0][1]['gmv']/GMV*100:.0f}%</b>；
第 2 日起回落至日均約 NT${m(sum(a['gmv'] for _,a in days[1:])/ (len(days)-1))}，
最後一日（09/27）回升至 NT${m(days[-1][1]['gmv'])}，收團效應明顯。
<b>結論：首日與末日是兩個高峰，中段可安排一次加碼或限時活動補上凹陷。</b></div>
</div>

{ft(LBL_B, 2, 4)}</div>"""

b3 = f"""<div class=page>
{hd("開團結案報告・進度快照", f"{CAMP}・{PERIOD}")}
<div class=sec><div class=sh><b>贈品發放</b><span>GIFTS</span></div>
<table>
<tr><th>贈品</th><th class=n>已發放</th><th style="padding-left:5mm">設定</th></tr>
<tr><td>下單禮｜經典旅行組（洗面乳＋水安瓶 各15ml）</td>
  <td class=n>{prod.get('下單禮｜經典旅行組',0)}</td>
  <td style="padding-left:5mm">後台設定 150 份，<b>已全數送完</b>；團購頁文案寫「前 200 名」</td></tr>
<tr><td>妝前智能5GF柔敏膠囊（滿 $4,000）</td>
  <td class=n>{prod.get('妝前智能5GF柔敏膠囊',0)}</td>
  <td style="padding-left:5mm">未設上限</td></tr>
</table>
<div class=callout warn><b>待處理落差</b>：贈品實際只設 150 份且已送完，但頁面與團主確認書寫「前 200 名」。
第 151–200 名下單者依文案應得而未得，結團後若有客訴需備妥說法或補寄。</div>
</div>
<div class=sec><div class=sh><b>付款方式分布</b><span>PAYMENT</span></div>
<table>
<tr><th>付款方式</th><th class=n>訂單數</th><th class=n>占比</th><th class=n>金額</th></tr>
{pay_rows}
</table></div>

<div class=sec><div class=sh><b>⚠ 逾時未付款（預付款方式）</b><span>ABANDONED PAYMENT</span></div>
<div class=kpis>
  <div class="kpi dark"><div class=l>逾時未付金額</div><div class=v><small>NT$</small>{m(up_rev)}</div>
    <div class=s>{len(unpaid_prepay)} 筆・占全團 {up_rev/GMV*100:.1f}%</div></div>
  <div class=kpi><div class=l>超過 24 小時</div><div class=v>{old24} <small>筆</small></div>
    <div class=s>救回機率低</div></div>
  <div class=kpi><div class=l>卡住的防護棒</div><div class=v>{up_stick} <small>支</small></div>
    <div class=s>影響補貨量估算</div></div>
</div>
<div class=callout warn>信用卡／LINE Pay／Apple Pay 應於 15 分鐘內完成付款，這 {len(unpaid_prepay)} 筆卻仍為未付款，
等同<b>結帳流程中斷</b>。建議立即做一次付款提醒（LINE 或簡訊），並檢查 LINE Pay 導轉是否有失敗情形——
{len([o for o in unpaid_prepay if 'LINE' in payname(o)])} 筆集中在 LINE Pay，比例偏高，可能不是單純客戶放棄。</div>
</div>

{ft(LBL_B, 3, 4)}</div>"""

b4 = f"""<div class=page>
{hd("開團結案報告・進度快照", f"{CAMP}・{PERIOD}")}
<div class=sec><div class=sh><b>爆白潤色防護棒・庫存與履約</b><span>FULFILMENT</span></div>
<table>
<tr><th>項目</th><th class=n>支數</th><th style="padding-left:5mm">說明</th></tr>
<tr><td>本團成交總量（有效訂單）</td><td class=n>{st_all}</td>
  <td style="padding-left:5mm">開團前庫存 330 支</td></tr>
<tr><td>已出貨</td><td class=n>{st_ship}</td>
  <td style="padding-left:5mm">{len(ship_orders)} 筆訂單已發貨／送達／取貨</td></tr>
<tr><td>已確認未出貨</td><td class=n>{st_paid_unship}</td>
  <td style="padding-left:5mm">倉庫有貨，待出</td></tr>
<tr><td>未付款訂單占用</td><td class=n>{st_pend}</td>
  <td class=mute style="padding-left:5mm">含上述逾時未付 {up_stick} 支，可能不成立</td></tr>
<tr class=sum><td>目前預購欠貨（系統負庫存）</td><td class=n>{PREORDER}</td>
  <td style="padding-left:5mm">主商品 138／2入 138／1入 27，承諾 <b>10/05 起出貨</b></td></tr>
</table>
<div class=callout><b>補貨建議</b>：帳面欠 {PREORDER} 支，但其中 {up_stick} 支卡在逾時未付訂單。
若催款救回率以五成估，10/05 實際需出 <b>約 {PREORDER - up_stick//2} 支</b>。
建議備 <b>250 支</b>（含損耗緩衝），不要照帳面 {st_all} 支全備。</div>
</div>
<div class=sec><div class=sh><b>客戶結構</b><span>CUSTOMER MIX</span></div>
<div class=seg><div class=nm>全新客（無既有標籤）</div><div class=track>
  <div class=fill style="width:{len(brand_new)/len(buyers)*100:.0f}%"></div></div>
  <div class=v>{len(brand_new)} 位・{len(brand_new)/len(buyers)*100:.0f}%</div></div>
<div class=seg><div class=nm>YB 系舊客</div><div class=track>
  <div class=fill style="width:{len(yb_old)/len(buyers)*100:.0f}%"></div></div>
  <div class=v>{len(yb_old)} 位・{len(yb_old)/len(buyers)*100:.0f}%</div></div>
<div class=seg><div class=nm>其他既有標籤客</div><div class=track>
  <div class="fill dim" style="width:{(len(buyers)-len(brand_new)-len(yb_old))/len(buyers)*100:.0f}%"></div></div>
  <div class=v>{len(buyers)-len(brand_new)-len(yb_old)} 位・{(len(buyers)-len(brand_new)-len(yb_old))/len(buyers)*100:.0f}%</div></div>
<div class=callout>本團為品牌新增 <b>{len(brand_new)} 位</b>可再行銷名單，全數已標 <code>團購-Yboutique</code>。
YB 系舊客 {len(yb_old)} 位客單 NT${m(rev_old/len(yb_old))}，高於新客 NT${m(rev_new/len(brand_new))}。
完整分析見同日《CRM V1 成效報告》。</div>
</div>

<div class=callout warn><b>與前一檔比較</b>：YB 首團（08/20–24，5 天、3 品項）1,016 筆／946 客；
本檔 8 天、4 品項卻為 {len(orders)} 筆／{len(buyers)} 客，單量 −35%、客戶 −37%。
檔期更長、品項更多而單量下滑，需確認是否為<b>同一批受眾疲乏</b>（兩檔僅隔一個月），
下一檔建議拉長間隔或改以新品為主軸。分潤亦由 30% 跳階至 {RATE}。</div>
<div class=sec><div class=sh><b>結案前待辦</b><span>OPEN ITEMS</span></div>
<ul class=ins>
<li class=a><b>催收逾時未付款</b> {len(unpaid_prepay)} 筆、NT${m(up_rev)}——越快越好，並查 LINE Pay 導轉是否異常。</li>
<li class=a><b>贈品文案落差</b>——150 份已送完 vs 文案「前 200 名」，需決定補送或公告。</li>
<li><b>10/05 預購出貨</b>——備貨約 250 支，出貨前重跑一次欠貨清單。</li>
<li class=g><b>退貨期結束後產出最終結案報告</b>——屆時以已完成訂單實結分潤 {RATE}，本快照作廢。</li>
<li class=g><b>確認書修正</b>——團主確認書記載分潤 30%，實際為 {RATE}（營業額達標跳階），需補簽或註記。</li>
</ul></div>
{ft(LBL_B, 4, 4)}</div>"""


def render(pages, out):
    html = f"<!DOCTYPE html><html lang=zh-Hant><head><meta charset=utf-8><style>{CSS}</style></head><body>{''.join(pages)}</body></html>"
    tmp = DATA / (out.stem + ".html")
    tmp.write_text(html, encoding="utf-8")
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={out}", "--virtual-time-budget=6000", f"file://{tmp}"],
                   capture_output=True)
    print(f"  → {out.name}  ({out.stat().st_size//1024} KB)")


DOCS.mkdir(exist_ok=True)
print("產製報告：")
render([a1, a2, a3], DOCS / "HEIWEI_楊楊團_CRM_V1成效報告_20260927.pdf")
render([b1, b2, b3, b4], DOCS / "HEIWEI_楊楊團_開團結案快照_20260927.pdf")
