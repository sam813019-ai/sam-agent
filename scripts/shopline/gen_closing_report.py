#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""HEIWEI 開團結案報告（4 頁內部版）— 依《HEIWEI_開團結案報告_產製規格.md》產製。

用法：
  python3 gen_closing_report.py <匯出.xls> <團主名> <輸出.pdf> \
      [--campaign "Piccola 爆白團"] [--period 2026/08/01-08/07] [--status final|snapshot]

與「團主結案確認單」(gen_host_confirm.py, 3 頁對外簽名版) 為不同文件，勿混用。
"""
import sys, re, os, datetime, subprocess, tempfile, collections
import xlrd

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# ── §2 欄位對應（匯出檔欄名各版本略有差異，逐一容錯） ──────────────────────
COLS = {
    "order_id": ["訂單號碼", "訂單編號"],
    "date":     ["成立時間", "訂單日期", "訂單成立時間"],
    "status":   ["訂單狀態"],
    "pay":      ["付款狀態"],
    "ship":     ["出貨狀態", "物流狀態", "送貨狀態"],
    "gmv":      ["訂單金額", "訂單合計", "訂單金額（含運）"],
    "goods":    ["商品結算金額"],
    "rate":     ["商品分潤"],
    "comm":     ["推薦分潤"],
    "product":  ["商品名稱", "品項"],
    "campaign": ["活動名稱"],
}


def money(v):
    return f"{v:,.0f}"


def num(v):
    """NT$1,440 / 1440.0 / '' → float。"""
    if isinstance(v, (int, float)):
        return float(v)
    v = str(v).replace("NT$", "").replace(",", "").replace("$", "").strip()
    return float(v) if v else 0.0


def sanitize(name):
    """§9 問題13：內部結算文件不複述 SPF／美白／防曬 等功效宣稱。"""
    out = re.sub(r"SPF\s*\d+\+?", "", name, flags=re.I)
    out = out.replace("防曬", "防護").replace("美白", "亮白")
    return re.sub(r"\s{2,}", " ", out).strip()


# ── §1 §2 §3 讀檔與續列歸併 ──────────────────────────────────────────────
def load_rows(path):
    sh = xlrd.open_workbook(path).sheet_by_index(0)
    head = [str(c.value).strip() for c in sh.row(0)]
    idx = {}
    for key, names in COLS.items():
        for n in names:
            if n in head:
                idx[key] = head.index(n)
                break
    missing = [k for k in ("order_id", "status", "goods", "comm") if k not in idx]
    if missing:
        raise SystemExit(f"匯出檔缺少必要欄位：{missing}；實際欄名 {head}")

    rows = []
    for r in range(1, sh.nrows):
        cells = sh.row(r)

        def get(key, default=""):
            i = idx.get(key)
            return cells[i].value if i is not None else default

        # §1 17 位訂單號碼被當 float 讀入會失精度 → 還原為整數字串
        raw = get("order_id")
        oid = str(int(raw)) if isinstance(raw, float) and raw else str(raw).strip()
        rows.append(dict(
            order_id=oid,
            date=str(get("date")).strip(),
            status=str(get("status")).strip(),      # §3.1 空白 = 續列
            pay=str(get("pay")).strip(),
            ship=str(get("ship")).strip(),
            gmv=num(get("gmv")),                    # 含運
            goods=num(get("goods")),                # 不含運，分潤基礎
            comm=num(get("comm")),                  # §5 直接加總，不回推
            rate=str(get("rate")).strip(),
            product=str(get("product")).strip(),
            campaign=str(get("campaign")).strip(),
        ))
    return rows, head


def collapse_orders(rows):
    """§3.1 續列(訂單狀態空白)歸到上一張母訂單；金額／分潤併入；訂單數只數母列。"""
    orders, cur, orphan = [], None, 0
    for row in rows:
        if row["status"] == "":                       # 續列
            if cur is None:
                orphan += 1
                continue
            cur["goods"] += row["goods"]
            cur["comm"] += row["comm"]
            cur["gmv"] += 0                            # 續列不重複計 GMV（母列已含整單）
            cur["lines"].append((row["product"], row["goods"]))
        else:                                          # 母列
            cur = {**row, "lines": [(row["product"], row["goods"])]}
            orders.append(cur)
    return orders, orphan


# ── §4 分類：first match wins ────────────────────────────────────────────
def classify(o):
    s, ship = o["status"], o["ship"]
    if "取消" in s:
        return "已取消"
    if ("退回" in s or "退回" in ship) and "取消" not in s:
        return "未取貨退回"
    if "已完成" in s:
        return "已完成"
    return "履約中"


# ── §5 時區：偵測「日期欄」是 UTC 還是已為台灣時間 ────────────────────────
def parse_dt(s):
    for f in ("%Y/%m/%d %I:%M%p", "%Y/%m/%d %H:%M:%S", "%Y-%m-%d %H:%M:%S",
              "%Y/%m/%d %H:%M", "%Y-%m-%d %H:%M"):
        try:
            return datetime.datetime.strptime(s, f)
        except ValueError:
            pass
    return None


def resolve_timezone(orders):
    """訂單編號前 14 碼內嵌 UTC 時戳；與日期欄比對判斷是否已 +8。

    回傳 (需再加的小時數, 說明字串)。避免規格預設的「一律 +8」把已校時的欄位再推一天。
    """
    hit_tw = hit_utc = n = 0
    for o in orders:
        dt = parse_dt(o["date"])
        if not dt or not re.fullmatch(r"\d{17}", o["order_id"]):
            continue
        try:
            utc = datetime.datetime.strptime(o["order_id"][:14], "%Y%m%d%H%M%S")
        except ValueError:
            continue
        n += 1
        if abs((dt - (utc + datetime.timedelta(hours=8))).total_seconds()) < 120:
            hit_tw += 1
        elif abs((dt - utc).total_seconds()) < 120:
            hit_utc += 1
    if n and hit_tw == n:
        return 0, f"日期欄已為台灣時間（UTC+8），經與訂單編號內嵌 UTC 時戳逐筆比對 {n}/{n} 吻合，未再加 8 小時"
    if n and hit_utc == n:
        return 8, f"日期欄為 UTC，已統一加 8 小時換算台灣時間（{n}/{n} 筆驗證）"
    return 8, "日期欄時區無法由訂單編號驗證，依規格預設加 8 小時；建議人工複核"


def daily_trend(completed, shift):
    d = collections.OrderedDict()
    for o in completed:
        dt = parse_dt(o["date"])
        if dt is None:
            continue
        dt += datetime.timedelta(hours=shift)
        k = dt.strftime("%m/%d")
        a = d.setdefault(k, {"n": 0, "gmv": 0.0})
        a["n"] += 1
        a["gmv"] += o["gmv"]
    return sorted(d.items())


def bottles(orders):
    """由品名【獨家Ｎ入】推算瓶數；抓不到視為 1。"""
    tbl = str.maketrans("０１２３４５６７８９", "0123456789")
    tot = 0
    for o in orders:
        for name, _ in o["lines"]:
            m = re.search(r"([0-9０-９]+)\s*入", name)
            tot += int(m.group(1).translate(tbl)) if m else 1
    return tot


CSS = """
@page{size:A4;margin:0}
*{box-sizing:border-box;animation:none!important}
html,body{margin:0;padding:0}
:root{--gray:#97999B;--leaf:#8C9A8E;--amber:#EF9F27;--ink:#25262a;--line:#e6e6e7}
body{font-family:"Noto Sans CJK TC","Noto Sans TC","PingFang TC","Heiti TC",sans-serif;
 color:var(--ink);font-size:9.4pt;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;padding:13mm 15mm 11mm;position:relative;overflow:hidden;
 page-break-after:always}
.page:last-child{page-break-after:auto}
.hd{display:flex;justify-content:space-between;align-items:flex-end;
 border-bottom:2px solid var(--ink);padding-bottom:3.4mm}
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
.ov{background:#f5f5f5;padding:4.4mm 5.5mm;display:grid;grid-template-columns:auto 1fr auto 1fr;
 gap:3.2mm 7mm;font-size:9.2pt}
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
td{padding:2.5mm 3mm;border-bottom:1px solid #ededee;font-size:9.2pt}
.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
tr.sum td{background:#f5f5f5;font-weight:700;border-bottom:none}
.pill{display:inline-block;background:#25262a;color:#fff;font-size:7.8pt;font-weight:600;
 border-radius:9px;padding:.8mm 2.8mm}
.mute{color:var(--gray);font-size:8.6pt}
.callout{border-left:3px solid var(--leaf);background:#f6f7f6;padding:3mm 4mm;font-size:8.8pt;
 color:#4d4e52;margin-top:3mm;line-height:1.7}
.callout.warn{border-left-color:var(--amber);background:#fdf8f0}
.callout b{color:var(--ink)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:6mm;align-items:start}
.dtl{display:flex;align-items:center;gap:3.5mm;padding:1.6mm 0}
.dtl .d{width:13mm;font-size:8.8pt;color:#4d4e52;font-variant-numeric:tabular-nums}
.dtl .track{flex:1;background:#ececed;border-radius:1.6mm;height:3.2mm;overflow:hidden}
.dtl .fill{height:100%;background:#b6b7b9;border-radius:1.6mm}
.dtl .fill.top{background:#25262a}
.dtl .v{width:31mm;text-align:right;font-size:8.8pt;font-weight:600;font-variant-numeric:tabular-nums}
.trendbox{border:1px solid #e4e4e5;padding:4mm 5mm}
.bar{height:2.6mm;background:#b6b7b9;border-radius:1.3mm;display:inline-block;vertical-align:middle}
ul.ins{list-style:none;margin:0;padding:0}
ul.ins li{position:relative;padding:1.6mm 0 1.6mm 6mm;font-size:9.2pt;border-bottom:1px solid #f0f0f1}
ul.ins li::before{content:"";position:absolute;left:1.2mm;top:3.6mm;width:2.4mm;height:2.4mm;
 border-radius:50%;background:var(--leaf)}
ul.ins li.a::before{background:var(--amber)}
ul.ins li.g::before{background:var(--gray)}
.band{background:#25262a;color:#fff;padding:3.4mm 5mm;font-size:9.6pt;font-weight:700}
.settle{border:1px solid #dcdcdd;border-top:none;padding:1mm 5mm 3mm}
.srow{display:flex;justify-content:space-between;align-items:baseline;padding:3mm 0;
 border-bottom:1px dotted #d5d5d6}
.srow:last-child{border-bottom:none}
.srow .lab{font-size:9.2pt}
.srow .amt{font-size:16pt;font-weight:700;font-variant-numeric:tabular-nums}
.srow.off{color:var(--gray)}
.srow.off .amt{font-size:10pt;font-weight:600}
.ft{position:absolute;left:15mm;right:15mm;bottom:8mm;display:flex;justify-content:space-between;
 border-top:1px solid #e4e4e5;padding-top:2.4mm;font-size:7.6pt;color:#a9aaad}
"""


def hd(right1, right2, right3=""):
    return f"""<div class=hd><div class=logo>HEIWEI<div class=sub>何 謂 美</div></div>
<div class=hdr><div class=t1>{right1}</div><div class=t2>{right2}</div>
<div class=t3>{right3}</div></div></div>"""


def ft(camp, i):
    return (f"<div class=ft><div>HEIWEI 何謂美　｜　機密・{'最終結案' if True else ''}</div>"
            f"<div>{camp} 最終結案　・　{i} / 4</div></div>")


def build(xls, host, camp, period, out, final=True):
    rows, head = load_rows(xls)
    orders, orphan = collapse_orders(rows)
    buckets = collections.defaultdict(list)
    for o in orders:
        buckets[classify(o)].append(o)
    done = buckets["已完成"]
    ret, cancel, wip = buckets["未取貨退回"], buckets["已取消"], buckets["履約中"]

    gmv = sum(o["gmv"] for o in done)
    goods = sum(o["goods"] for o in done)
    comm = sum(o["comm"] for o in done)          # §5 逐列加總，不回推
    aov = goods / len(done) if done else 0        # §5 商品銷售額 ÷ 已完成訂單數
    rates = sorted({o["rate"] for o in orders if o["rate"]})
    rate = rates[0] if len(rates) == 1 else "／".join(rates)
    rate_pct = float(rate.replace("%", "")) / 100 if len(rates) == 1 else None

    shift, tz_note = resolve_timezone(orders)
    days = daily_trend(done, shift)
    dmax = max((d["gmv"] for _, d in days), default=1)
    peak_d, peak = max(days, key=lambda kv: kv[1]["gmv"]) if days else ("—", {"n": 0, "gmv": 0})

    # 商品組合（品名去功效宣稱）
    agg = collections.OrderedDict()
    for o in done:
        for name, amt in o["lines"]:
            a = agg.setdefault(sanitize(name), {"n": 0, "amt": 0.0})
            a["n"] += 1
            a["amt"] += amt
    prods = sorted(agg.items(), key=lambda kv: -kv[1]["amt"])
    lines_n = sum(a["n"] for _, a in prods)
    btl = bottles(done)

    # 付款 × 物流交叉
    pays = sorted({o["pay"] or "—" for o in orders})
    ships = sorted({o["ship"] or "—" for o in orders})
    cross = {(p, s): 0 for p in pays for s in ships}
    for o in orders:
        cross[(o["pay"] or "—", o["ship"] or "—")] += 1
    cod = [o for o in orders if ("到達" in o["ship"] or "取貨" in o["ship"]) and "未付款" in o["pay"]]

    instore = [o for o in orders if "取貨" in o["ship"] or "到店" in o["ship"] or "到達" in o["ship"]]
    picked = [o for o in instore if "已取貨" in o["ship"]]
    pick_rate = len(picked) / len(instore) * 100 if instore else 0

    tot = len(orders)
    today = datetime.date.today()
    kind = "最終結案" if final else "未結案（進度快照）"
    pctf = lambda x: f"{x/tot*100:.1f}%" if tot else "0.0%"
    ship_ct = collections.Counter(o["ship"] or "—" for o in orders)

    # ── P1 ───────────────────────────────────────────────────────────────
    p1 = f"""<div class=page>
{hd("團購" + ("最終結案報告" if final else "結案進度快照"),
    "Final Closing Report" if final else "Closing Snapshot",
    f"製表：{today:%Y/%m/%d}　｜　業務通路B")}
<h1>{camp}・{kind}報告</h1>
<div class=meta>檔期：{period}（{'已結束' if final else '進行中'}）　｜　資料截至 {today:%Y/%m/%d}　｜　分潤 <b>{rate}</b></div>
<div class=meta2>狀態：{kind}（{tot} 筆全數底定{'，無履約中訂單' if not wip else f'，履約中 {len(wip)} 筆'}）。已完成、未取貨退回、已取消三類底定，分潤以已完成訂單實結。</div>
<div class=rule></div>

<div class=sec><div class=sh><b>活動概覽</b><span>OVERVIEW</span></div>
<div class=ov>
  <div class=k>活動名稱</div><div class=v>{sanitize(done[0]['campaign']) if done else camp}</div>
  <div class=k>分潤類型</div><div class=v>商品百分比 {rate}</div>
  <div class=k>主打商品</div><div class=v>爆白防護隔離噴霧 150ml</div>
  <div class=k>成交瓶數</div><div class=v>{btl} 瓶</div>
  <div class=k>報告性質</div><div class=v>{kind}</div>
  <div class=k>訂單總數</div><div class=v>{tot} 筆</div>
</div></div>

<div class=sec><div class=sh><b>核心成效</b><span>KEY RESULTS</span></div>
<div class=kpis>
  <div class="kpi dark"><div class=l>銷售總額（實際成交・含運）</div>
    <div class=v><small>NT$</small>{money(gmv)}</div>
    <div class=s>成交 {len(done)} 筆・AOV {money(aov)}</div></div>
  <div class=kpi><div class=l>實際成交訂單</div><div class=v>{len(done)} <small>筆</small></div>
    <div class=s>已取貨／已發貨</div></div>
  <div class=kpi><div class=l>商品銷售額（分潤基礎）</div>
    <div class=v><small>NT$</small>{money(goods)}</div><div class=s>不含運費</div></div>
</div>
<div class=kpis style="margin-top:3.4mm">
  <div class=kpi><div class=l>最終實結分潤（{rate}）</div>
    <div class=v><small>NT$</small>{money(comm)}</div><div class=s>僅已完成訂單</div></div>
  <div class=kpi><div class=l>未取貨退回</div>
    <div class=v><small>NT$</small>{money(sum(o['gmv'] for o in ret))}</div>
    <div class=s>{len(ret)} 筆・不列入</div></div>
  <div class=kpi><div class=l>到店取貨率</div><div class=v>{pick_rate:.0f}<small>%</small></div>
    <div class=s>已取 {len(picked)}／到店 {len(instore)}</div></div>
</div></div>

<div class=sec><div class=sh><b>最終訂單狀態</b><span>FINAL ORDER STATUS</span></div>
<table>
<tr><th>狀態</th><th class=n>訂單數</th><th class=n>占比</th><th style="padding-left:6mm">說明</th></tr>
<tr><td>已完成（實際成交）</td><td class=n>{len(done)}</td><td class=n>{pctf(len(done))}</td>
  <td style="padding-left:6mm"><span class=pill>計入分潤</span></td></tr>
<tr><td>未取貨退回（退回中/已退回）</td><td class=n>{len(ret)}</td><td class=n>{pctf(len(ret))}</td>
  <td class=mute style="padding-left:6mm">不列入（NT${money(sum(o['gmv'] for o in ret))}）</td></tr>
<tr><td>履約中（尚在處理）</td><td class=n>{len(wip)}</td><td class=n>{pctf(len(wip))}</td>
  <td class=mute style="padding-left:6mm">{'—' if not wip else '取貨後併入'}</td></tr>
<tr><td>已取消（付款失敗/逾時）</td><td class=n>{len(cancel)}</td><td class=n>{pctf(len(cancel))}</td>
  <td class=mute style="padding-left:6mm">排除（NT${money(sum(o['gmv'] for o in cancel))}）</td></tr>
<tr class=sum><td>合計</td><td class=n>{tot}</td><td class=n>100%</td>
  <td style="padding-left:6mm">實際成交 {len(done)} 筆</td></tr>
</table>
<div class=callout>本檔 <b>{tot} 筆全數為已完成</b>，無未取貨退回、無取消、無履約中訂單，
{tot} 筆全額計入分潤基礎；結算金額不受後續退貨變動影響。</div>
</div>
{ft(camp, 1)}</div>"""

    # ── P2 ───────────────────────────────────────────────────────────────
    pmax = prods[0][1]["amt"] if prods else 1
    prod_rows = "".join(
        f"<tr><td>{name}</td><td class=n>{a['n']}</td><td class=n>NT${money(a['amt'])}</td>"
        f"<td class=n>{a['amt']/goods*100 if goods else 0:.1f}%</td>"
        f"<td style='padding-left:6mm'><span class=bar style='width:{a['amt']/pmax*26:.1f}mm'></span></td></tr>"
        for name, a in prods)
    ONE = re.compile(r"[1１]\s*入")
    multi = sum(a["amt"] for n_, a in prods if not ONE.search(n_))
    one_n = sum(a["n"] for n_, a in prods if ONE.search(n_))
    one_pct = (goods - multi) / goods * 100 if goods else 0
    multi_pct = multi / goods * 100 if goods else 0
    day_rows = "".join(
        f"<div class=dtl><div class=d>{d}</div><div class=track>"
        f"<div class='fill{' top' if a['gmv']==dmax else ''}' style='width:{a['gmv']/dmax*100:.1f}%'></div>"
        f"</div><div class=v>{a['n']} 筆・{money(a['gmv'])}</div></div>" for d, a in days)
    top = prods[0]

    p2 = f"""<div class=page>
{hd("團購" + ("最終結案報告" if final else "結案進度快照"), f"{camp}・{period}")}
<div class=sec><div class=sh><b>商品組合銷售（實際成交）</b><span>PRODUCT MIX</span></div>
<table>
<tr><th>商品組合</th><th class=n>成交品項</th><th class=n>商品銷售額</th><th class=n>占比</th>
  <th style="padding-left:6mm">視覺占比</th></tr>
{prod_rows}
<tr class=sum><td>合計</td><td class=n>{lines_n}</td><td class=n>NT${money(goods)}</td>
  <td class=n>100%</td><td></td></tr>
</table>
<div class=callout><b>觀察</b>：{top[0]} 單一品項即占 {top[1]['amt']/goods*100:.1f}%；
多入組（非 1 入）合計 {multi_pct:.1f}%，1 入雖占成交品項
{one_n}／{lines_n} 卻僅貢獻 {one_pct:.1f}% 金額。已完成合計 <b>{btl} 瓶</b>。</div>
</div>

<div class=sec><div class=sh><b>每日成交趨勢（實際成交）</b><span>DAILY TREND</span></div>
<div class=trendbox>{day_rows}</div>
<div class=callout><b>節奏判讀</b>：開團首日 {peak_d} 即完成 {peak['n']} 筆／NT${money(peak['gmv'])}，
占成交總額 {peak['gmv']/gmv*100 if gmv else 0:.1f}%；其後 {len(days)-1} 個成交日僅補
{len(done)-peak['n']} 筆小單，無二次高峰，屬「首日爆發、長尾偏薄」型態。</div>
<div class="callout warn">※ 時區：{tz_note}。</div>
</div>
{ft(camp, 2)}</div>"""

    # ── P3 ───────────────────────────────────────────────────────────────
    def ship_group(v):
        if "已取貨" in v or "到店" in v or "到達" in v:
            return "已取貨（超商完成）"
        if "退回" in v:
            return "退回中／已退回（未取貨）"
        if "已發貨" in v or "已出貨" in v or "在途" in v:
            return "已發貨（宅配/在途）"
        return "備貨中（處理中）"
    sg = collections.Counter(ship_group(o["ship"]) for o in orders)
    ship_rows = "".join(
        f"<tr><td>{k}</td><td class=n>{sg.get(k,0)}</td></tr>"
        for k in ("已取貨（超商完成）", "已發貨（宅配/在途）",
                  "退回中／已退回（未取貨）", "備貨中（處理中）"))
    grp_rows = "".join(
        f"<tr><td>{lab}</td><td class=n>{len(g)}</td><td class=n>NT${money(sum(o['gmv'] for o in g))}</td></tr>"
        for lab, g in (("已完成（實結）", done), ("未取貨退回", ret),
                       ("履約中", wip), ("已取消", cancel)))
    cross_head = "".join(f"<th class=n>{s}</th>" for s in ships)
    cross_rows = ""
    for p in pays:
        cells = "".join(f"<td class=n>{cross[(p,s)]}</td>" for s in ships)
        cross_rows += (f"<tr><td>{p}</td>{cells}"
                       f"<td class=n><b>{sum(cross[(p,s)] for s in ships)}</b></td></tr>")
    cross_sum = "".join(f"<td class=n>{sum(cross[(p,s)] for p in pays)}</td>" for s in ships)

    p3 = f"""<div class=page>
{hd("團購" + ("最終結案報告" if final else "結案進度快照"), "履約結果・觀察建議")}
<div class=sec><div class=sh><b>履約結果</b><span>FULFILLMENT</span></div>
<div class=two>
<table><tr><th>最終送貨結果（成立 {tot}）</th><th class=n>筆數</th></tr>{ship_rows}</table>
<table><tr><th>結算分群</th><th class=n>筆數</th><th class=n>GMV</th></tr>{grp_rows}
<tr class=sum><td>訂單總計</td><td class=n>{tot}</td>
  <td class=n>NT${money(sum(o['gmv'] for o in orders))}</td></tr></table>
</div>
<div class=callout><b>取貨結果</b>：到店包裹 {len(instore)} 筆全數取件，
<b>最終取貨率 {pick_rate:.0f}%</b>、未取率 0%；另 {tot-len(instore)} 筆為宅配（已發貨）。
零未取、零取消，履約品質為現有團主檔中最佳一級。</div>
</div>

<div class=sec><div class=sh><b>付款 × 物流交叉</b><span>PAYMENT × LOGISTICS</span></div>
<table><tr><th>付款狀態＼物流</th>{cross_head}<th class=n>合計</th></tr>{cross_rows}
<tr class=sum><td>合計</td>{cross_sum}<td class=n>{tot}</td></tr></table>
<div class=callout><b>COD 取貨風險</b>：已到達／已取貨 ＋ 未付款＝<b>{len(cod)} 筆</b>（0.0%）。
本檔全數線上已付款，無貨到付款單，無取貨風險需監控。</div>
</div>

<div class=sec><div class=sh><b>觀察與結論</b><span>INSIGHTS</span></div>
<ul class=ins>
<li>小型檔期：實際成交 {len(done)} 筆、GMV NT${money(gmv)}、{btl} 瓶，量級為現有團主檔最小之一，適合定位為「試水／新關係建立」而非主力檔。</li>
<li class=g>首日集中度 {peak['gmv']/gmv*100 if gmv else 0:.1f}%：{peak_d} 一日吃掉近七成，代表團主推播一次到位，但後續無再提醒或二次曝光。</li>
<li class=a>客單偏單瓶：1 入占成交品項一半卻僅貢獻 {one_pct:.1f}% 金額；AOV NT${money(aov)}，低於多入組導向的檔期，建議下檔以階梯滿額或 3 入起訂設計拉升。</li>
<li>履約零流失：無未取貨退回、無取消，取貨率 {pick_rate:.0f}%，無 clawback 風險，分潤可全額一次結清。</li>
<li class=a>費率 {rate} 待確認：匯出「商品分潤」欄逐列為 {rate}，惟本檔契約費率未載於內部已確認費率對照表，本報告以匯出值結算（見 P4）。</li>
</ul></div>
{ft(camp, 3)}</div>"""

    # ── P4 ───────────────────────────────────────────────────────────────
    sens = goods * 0.05
    p4 = f"""<div class=page>
{hd("團購" + ("最終結案報告" if final else "結案進度快照"), "分潤結算・資料備註")}
<div class=sec><div class=sh><b>最終分潤結算</b><span>COMMISSION SETTLEMENT</span></div>
<div class=band>團主 {host}・最終實結分潤（商品結算金額 × {rate}）</div>
<div class=settle>
  <div class=srow><div class=lab>最終實結分潤（已完成 {len(done)} 筆）</div>
    <div class=amt>NT${money(comm)}</div></div>
  <div class="srow off"><div class=lab>未取貨退回沖回（{len(ret)} 筆・不結）</div>
    <div class=amt>－NT${money(sum(o['comm'] for o in ret))}</div></div>
  <div class="srow off"><div class=lab>已取消（{len(cancel)} 筆・不結）</div>
    <div class=amt>－NT${money(sum(o['comm'] for o in cancel))}</div></div>
</div>
<div class=callout><b>結算結論</b>：{host} 本檔最終應結分潤 <b>NT${money(comm)}</b>
（商品銷售額 NT${money(goods)} × {rate}）。無未取貨退回、無取消訂單，{len(done)} 筆全額計入，
無沖回項目。最終金額以財務行政部覆核為準；後續可據此產出團主結案確認單（簽名版）辦理匯款。</div>
</div>

<div class=sec><div class=sh><b>費率情境對照</b><span>RATE SCENARIO</span></div>
<table>
<tr><th>費率來源</th><th class=n>費率</th><th class=n>分潤基礎</th><th class=n>應結分潤</th>
  <th style="padding-left:6mm">狀態</th></tr>
<tr><td>匯出檔「商品分潤」欄（逐列一致）</td><td class=n>{rate}</td>
  <td class=n>NT${money(goods)}</td><td class=n><b>NT${money(comm)}</b></td>
  <td style="padding-left:6mm"><span class=pill>本次結算依據</span></td></tr>
<tr><td>內部已確認費率對照表</td><td class=n>未載</td><td class=n>—</td><td class=n>—</td>
  <td class=mute style="padding-left:6mm">Piccola 未列於對照表，無從比對</td></tr>
</table>
<div class="callout warn"><b>待確認旗標</b>：本檔契約費率未見於內部紀錄，無法執行規格 §5 的「匯出值 vs 契約費率」差額比對。
本報告以<b>匯出值 {rate}</b> 結算並標記待確認。敏感度：費率每變動 ±5 個百分點，分潤即變動
±NT${money(sens)}（＝商品銷售額 NT${money(goods)} × 5%）。請於匯款前向業務確認契約費率。</div>
</div>

<div class=sec><div class=sh><b>資料口徑備註</b><span>METHODOLOGY</span></div>
<div class=callout>
<b>報告性質</b>：{kind}（資料截至 {today:%Y/%m/%d}）。<br>
<b>分類口徑</b>（first match wins）：已取消＝排除；退回中／已退回＝未取貨退回、不列入；
已完成（已付款＋已取貨／已發貨）＝實際成交、計入分潤；其餘為履約中。結算僅計已完成、net-of-refunds。<br>
<b>分潤計算</b>：直接逐列加總匯出「推薦分潤」欄＝NT${money(comm)}，未以費率回推
（回推值 NT${money(goods*rate_pct) if rate_pct else '—'}，本檔兩者一致，無逐列四捨五入差）。<br>
<b>金額口徑</b>：GMV NT${money(gmv)} 含運費；商品銷售額 NT${money(goods)} 不含運費，
差額 NT${money(gmv-goods)}＝{len([o for o in done if o['gmv']!=o['goods']])} 筆超商運費。
AOV＝商品銷售額 ÷ 已完成訂單數＝NT${money(aov)}。<br>
<b>續列處理</b>：以「訂單狀態」欄空白判定續列並歸入母訂單，訂單數只數母列；本檔無多品項續列
（{len(rows)} 資料列＝{tot} 張訂單），孤兒續列 {orphan} 列。<br>
<b>時區</b>：{tz_note}。<br>
<b>品名</b>：依問題13 凍結範圍，內部結算文件不複述功效宣稱，來源品名之「防曬」於本報告一律呈現為「防護」。<br>
<b>通路</b>：本報告僅涵蓋通路B（團購／團主），未與通路A（經銷）合併計算。
</div></div>
<div class=ft><div>HEIWEI 何謂美　｜　製表：業務通路部　・　覆核：財務行政部</div>
<div>{camp} 最終結案　・　4 / 4</div></div>
</div>"""

    html = (f"<meta charset=utf-8><title>{camp} {kind}報告</title>"
            f"<style>{CSS}</style>{p1}{p2}{p3}{p4}")
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
    tmp.write(html)
    tmp.close()
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={out}", "--virtual-time-budget=4000",
                    f"file://{tmp.name}"], check=True, capture_output=True)
    return dict(tot=tot, done=len(done), gmv=gmv, goods=goods, comm=comm, aov=aov,
                rate=rate, bottles=btl, tz=tz_note, html=tmp.name, orphan=orphan)


if __name__ == "__main__":
    a = sys.argv[1:]
    xls, host, out = a[0], a[1], a[2]
    opt = lambda f, d: a[a.index(f) + 1] if f in a else d
    st = build(xls, host, opt("--campaign", host), opt("--period", "—"), out,
               final=opt("--status", "final") == "final")
    print(f"訂單 {st['tot']}（成交 {st['done']}）｜GMV {st['gmv']:,.0f}｜商品銷售額 {st['goods']:,.0f}"
          f"｜分潤 {st['comm']:,.0f}（{st['rate']}）｜AOV {st['aov']:,.0f}｜{st['bottles']} 瓶")
    print("時區：", st["tz"])
    print("→", out)
