#!/usr/bin/env python3
"""團主結案確認單（3 頁 A4 PDF）。

用法：
  python3 gen_host_confirm.py <affiliate.xls> <團主稱呼> <活動顯示名> <輸出.pdf> [--period 2026/08/01-08/07]

讀 Shopline「合作夥伴推薦」匯出的使用紀錄，統計實際成交（已完成＋已付款），
輸出對外的團主版結案確認單：總覽 / 核心成效 / 訂單狀態 / 商品銷售 / 每日趨勢 /
分潤確認 / 憑證勾選 / 簽署欄。內部資料（履約明細、clawback、觀察）一律不放。
"""
import sys, re, subprocess, tempfile, os, datetime, collections
import xlrd

CN_NUM = "零壹貳參肆伍陸柒捌玖"
CN_UNIT = ["", "拾", "佰", "仟"]
CN_SEC = ["", "萬", "億"]


def cn_amount(n):
    """整數金額轉中文大寫，如 2260 -> 貳仟貳佰陸拾元整。"""
    n = int(round(n))
    if n == 0:
        return "零元整"
    secs, x = [], n
    while x:
        secs.append(x % 10000)
        x //= 10000
    out, zero_pending = "", False
    for i in range(len(secs) - 1, -1, -1):
        sec, s = secs[i], ""
        digits = [(sec // 10 ** p) % 10 for p in (3, 2, 1, 0)]
        started = False
        for p, d in zip((3, 2, 1, 0), digits):
            if d:
                if zero_pending or (started is False and s == "" and out and sec < 1000):
                    if out or s:
                        s += "零"
                s += CN_NUM[d] + CN_UNIT[p]
                started, zero_pending = True, False
            else:
                if started:
                    zero_pending = True
        if sec:
            out += s + CN_SEC[i]
        else:
            zero_pending = bool(out)
    out = out.replace("佰", "佰").replace("拾", "拾")
    return out + "元整"


def money(v):
    return f"{v:,.0f}"


def parse(path):
    b = xlrd.open_workbook(path)
    s = b.sheet_by_index(0)
    head = [str(c.value).strip() for c in s.row(0)]
    idx = {h: i for i, h in enumerate(head)}

    def num(v):
        v = str(v).replace("NT$", "").replace(",", "").strip()
        return float(v) if v else 0.0

    orders, cur = [], None
    for r in range(1, s.nrows):
        row = [str(c.value).strip() for c in s.row(r)]
        oid = row[idx["訂單號碼"]]
        prod = row[idx["商品名稱"]]
        settle = num(row[idx["商品結算金額"]])
        if oid:  # 新訂單
            cur = dict(
                oid=oid,
                date=row[idx["訂單日期"]],
                status=row[idx["訂單狀態"]],
                pay=row[idx["付款狀態"]],
                ship=row[idx["送貨狀態"]],
                gmv=num(row[idx["訂單合計"]]),
                rate=row[idx["商品分潤"]],
                comm=num(row[idx["推薦分潤"]]),
                lines=[],
                campaign=row[idx["活動名稱"]],
            )
            orders.append(cur)
        if prod and cur is not None:  # 續列同屬前一張訂單
            cur["lines"].append((prod, settle))
    return orders


def bucket_products(orders):
    agg = collections.OrderedDict()
    for o in orders:
        for prod, amt in o["lines"]:
            a = agg.setdefault(prod, {"n": 0, "amt": 0.0})
            a["n"] += 1
            a["amt"] += amt
    return sorted(agg.items(), key=lambda kv: -kv[1]["amt"])


def daily(orders):
    d = collections.OrderedDict()
    for o in orders:
        key = o["date"][5:10].replace("-", "/")
        a = d.setdefault(key, {"n": 0, "gmv": 0.0})
        a["n"] += 1
        a["gmv"] += o["gmv"]
    return sorted(d.items())


CSS = """
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:"Noto Sans TC","PingFang TC","Heiti TC","Hiragino Sans",sans-serif;
 color:#1c1c1c;font-size:9.6pt;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;padding:14mm 15mm 11mm;position:relative;overflow:hidden;
 page-break-after:always;display:flex;flex-direction:column}
.page:last-child{page-break-after:auto}
.hd{display:flex;justify-content:space-between;align-items:flex-end;
 border-bottom:2px solid #1c1c1c;padding-bottom:3.5mm}
.logo{font-size:19pt;font-weight:700;letter-spacing:.34em;line-height:1}
.logo .sub{font-size:8.2pt;font-weight:400;letter-spacing:.62em;color:#8d8d8d;margin-top:2.2mm}
.hdr{text-align:right;line-height:1.55}
.hdr .t1{font-size:9.4pt;font-weight:700}
.hdr .t2{font-size:8.6pt;color:#8d8d8d;letter-spacing:.01em}
.hdr .t3{font-size:8.4pt;color:#5b5b5b}
h1{font-size:21pt;font-weight:700;letter-spacing:.01em;margin:9mm 0 2.5mm}
.lead{font-size:9.4pt;color:#5b5b5b;margin:0 0 7mm}
.sec{margin-top:6.5mm}
.p3{padding-top:11mm}
.p3 .sec{margin-top:4mm}
.p3 .sec:first-of-type{margin-top:4mm}
.sec:first-of-type{margin-top:7mm}
.sh{display:flex;align-items:baseline;gap:3mm;margin-bottom:3mm}
.sh::before{content:"";width:1.6mm;height:4.6mm;background:#1c1c1c;display:block;
 align-self:center;margin-right:.4mm}
.sh b{font-size:11.4pt;letter-spacing:.05em}
.sh span{font-size:8pt;color:#9a9a9a;letter-spacing:.22em}
.ov{background:#f4f4f4;padding:5mm 6mm;display:grid;grid-template-columns:auto 1fr auto 1fr;
 gap:3.6mm 7mm;font-size:9.4pt}
.ov .k{color:#5b5b5b;white-space:nowrap}
.ov .v{font-weight:700;text-align:right;white-space:nowrap}
.kpis{display:flex;gap:3.5mm;flex-wrap:wrap}
.kpi{flex:1;min-width:52mm;border:1px solid #dcdcdc;padding:4mm 4.5mm 4.5mm}
.kpi.dark{background:#1c1c1c;border-color:#1c1c1c;color:#fff}
.kpi .l{font-size:8.4pt;color:#6b6b6b}
.kpi.dark .l{color:#c9c9c9}
.kpi .v{font-size:21pt;font-weight:700;letter-spacing:-.012em;line-height:1.25;margin-top:1mm}
.kpi .v small{font-size:9.4pt;font-weight:700;letter-spacing:0}
.kpi .s{font-size:8pt;color:#9a9a9a;margin-top:1.2mm}
.kpi.dark .s{color:#9d9d9d}
table{width:100%;border-collapse:collapse}
th{font-size:8.6pt;color:#4a4a4a;font-weight:600;text-align:left;background:#efefef;
 padding:2.6mm 3mm}
td{padding:2.8mm 3mm;border-bottom:1px solid #ececec;font-size:9.4pt}
.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
tr.sum td{background:#f4f4f4;font-weight:700;border-bottom:none}
.pill{display:inline-block;background:#1c1c1c;color:#fff;font-size:8pt;font-weight:600;
 border-radius:9px;padding:.9mm 3mm}
.mute{color:#9a9a9a;font-size:8.8pt}
.note{background:#f6f6f6;padding:2.6mm 4mm;font-size:8.6pt;color:#5b5b5b;margin-top:2.4mm}
.bar{height:2.6mm;background:#b4b4b4;border-radius:1.3mm;display:inline-block;vertical-align:middle}
.dtl{display:flex;align-items:center;gap:3.5mm;padding:1.8mm 0}
.dtl .d{width:13mm;font-size:9pt;color:#4a4a4a;font-variant-numeric:tabular-nums}
.dtl .track{flex:1;background:#ededed;border-radius:1.6mm;height:3.2mm;overflow:hidden}
.dtl .fill{height:100%;background:#b4b4b4;border-radius:1.6mm}
.dtl .fill.top{background:#1c1c1c}
.dtl .v{width:30mm;text-align:right;font-size:9pt;font-variant-numeric:tabular-nums}
.trendbox{border:1px solid #e4e4e4;padding:4.5mm 5mm}
.calc{background:#1c1c1c;color:#fff;display:flex;justify-content:space-between;align-items:center;
 padding:3.8mm 7mm;gap:6mm}
.calc .f{font-size:10.4pt}
.calc .f b{font-weight:700}
.calc .amt{font-size:21pt;font-weight:700;letter-spacing:-.015em;white-space:nowrap}
.calc .amt small{font-size:10.5pt;font-weight:700}
.opt{border:1px solid #dcdcdc;padding:3mm 5mm;margin-top:2.2mm}
.opt .oh{display:flex;align-items:center;gap:3mm}
.box{width:4.2mm;height:4.2mm;border:1.3px solid #4a4a4a;flex:none}
.opt .ot{font-size:10pt;font-weight:700}
.opt .oa{font-size:8.4pt;color:#8d8d8d}
.opt p{margin:1.8mm 0 0;font-size:8.8pt;color:#4a4a4a;line-height:1.5}
.fields{display:flex;gap:6mm;margin-top:2.8mm}
.fld{flex:1}
.fld .line{border-bottom:1px solid #b4b4b4;height:5mm}
.fld .lb{font-size:8.2pt;color:#8d8d8d;margin-top:1mm}
.buyer{background:#f4f4f4;padding:3mm 4mm;margin-top:2.6mm;font-size:9pt}
.buyer .cap{font-size:8.2pt;color:#8d8d8d;margin-bottom:1.4mm}
.sign{border:1px solid #dcdcdc;padding:3.5mm 5.5mm}
.sign .decl{font-size:9.2pt;line-height:1.7}
.sub-h{display:flex;align-items:center;gap:2.4mm;margin:3.4mm 0 0}
.sub-h::before{content:"";width:1.2mm;height:3.4mm;background:#1c1c1c;display:block}
.sub-h b{font-size:9.4pt}
.sub-h span{font-size:7.8pt;color:#9a9a9a;letter-spacing:.16em}
.ft{position:absolute;left:15mm;right:15mm;bottom:7.5mm;display:flex;justify-content:space-between;
 border-top:1px solid #e0e0e0;padding-top:2.6mm;font-size:7.8pt;color:#a5a5a5}
"""


def head_block(host, made, line1, line2):
    return f"""<div class=hd>
  <div><div class=logo>HEIWEI<div class=sub>何 謂 美</div></div></div>
  <div class=hdr><div class=t1>{line1}</div><div class=t2>{line2}</div>
    <div class=t3>{made}</div></div>
</div>"""


def build(orders, host, camp, period, outfile):
    done = [o for o in orders if o["status"] == "已完成" and o["pay"] == "已付款"]
    ret = [o for o in orders if "退" in o["status"] or "退" in o["ship"]]
    cancel = [o for o in orders if "取消" in o["status"]]
    gmv = sum(o["gmv"] for o in done)
    settle = sum(a for o in done for _, a in o["lines"])
    comm = sum(o["comm"] for o in done)
    aov = gmv / len(done) if done else 0
    rate = done[0]["rate"] if done else ""
    prods = bucket_products(done)
    lines_n = sum(len(o["lines"]) for o in done)
    days = daily(done)
    dmax = max(d["gmv"] for _, d in days) if days else 1
    today = datetime.date.today().strftime("%Y/%m/%d")
    dates = sorted(o["date"][:10] for o in done)
    span = f"{dates[0][5:].replace('-','/')} – {dates[-1][5:].replace('-','/')}" if dates else "—"

    prod_rows = ""
    pmax = prods[0][1]["amt"] if prods else 1
    for name, a in prods:
        pct = a["amt"] / settle * 100 if settle else 0
        w = a["amt"] / pmax * 26
        prod_rows += (f"<tr><td>{name}</td><td class=n>{a['n']}</td>"
                      f"<td class=n>NT${money(a['amt'])}</td><td class=n>{pct:.1f}%</td>"
                      f"<td><span class=bar style='width:{w:.1f}mm'></span></td></tr>")

    day_rows = ""
    for d, a in days:
        w = a["gmv"] / dmax * 100
        top = " top" if a["gmv"] == dmax else ""
        day_rows += (f"<div class=dtl><div class=d>{d}</div><div class=track>"
                     f"<div class='fill{top}' style='width:{w:.1f}%'></div></div>"
                     f"<div class=v>{a['n']} 筆・{money(a['gmv'])}</div></div>")

    peak_d, peak = max(days, key=lambda kv: kv[1]["gmv"])
    peak_pct = peak["gmv"] / gmv * 100 if gmv else 0

    n = len(done)
    tot = len(orders)
    pct = lambda x: f"{x/tot*100:.1f}%" if tot else "0.0%"

    p1 = f"""<div class=page>
{head_block(host, f"致：團主 {host}　｜　製表 {today}", "團購結案・成效暨分潤確認單",
            "Closing Summary &amp; Commission Confirmation")}
<h1>{camp}・結案確認單</h1>
<div class=lead>活動期間：{period}　｜　感謝您這次的支持與用心開團 🌿</div>

<div class=sec><div class=sh><b>活動概覽</b><span>OVERVIEW</span></div>
<div class=ov>
  <div class=k>活動名稱</div><div class=v>{camp}</div>
  <div class=k>主打商品</div><div class=v>爆白防曬隔離噴霧(150ml)</div>
  <div class=k>分潤比例</div><div class=v>商品銷售額 {rate}</div>
  <div class=k>成交品項</div><div class=v>{lines_n} 項（3 種規格）</div>
  <div class=k>訂單總數</div><div class=v>{n} 筆（成交 {n}・退回 {len(ret)}・取消 {len(cancel)}）</div>
  <div class=k>統計區間</div><div class=v>{span}</div>
</div></div>

<div class=sec><div class=sh><b>核心成效</b><span>KEY RESULTS</span></div>
<div class=kpis>
  <div class="kpi dark"><div class=l>銷售總額（實際成交）</div>
    <div class=v><small>NT$</small>{money(gmv)}</div><div class=s>成交 {n} 筆</div></div>
  <div class=kpi><div class=l>實際成交訂單</div><div class=v>{n} <small>筆</small></div>
    <div class=s>已付款・已取貨／已發貨</div></div>
  <div class=kpi><div class=l>商品銷售額（分潤基礎）</div>
    <div class=v><small>NT$</small>{money(settle)}</div><div class=s>不含運費</div></div>
</div>
<div class=kpis style="margin-top:3.5mm">
  <div class=kpi style="max-width:60mm"><div class=l>客單價（AOV）</div>
    <div class=v><small>NT$</small>{money(aov)}</div><div class=s>成交 GMV ÷ {n}</div></div>
</div></div>

<div class=sec><div class=sh><b>訂單狀態</b><span>ORDER STATUS</span></div>
<table>
<tr><th>狀態</th><th class=n>訂單數</th><th class=n>占比</th><th style="padding-left:6mm">說明</th></tr>
<tr><td>已完成（實際成交）</td><td class=n>{n}</td><td class=n>{pct(n)}</td>
    <td style="padding-left:6mm"><span class=pill>計入分潤</span></td></tr>
<tr><td>已退回（未取貨）</td><td class=n>{len(ret)}</td><td class=n>{pct(len(ret))}</td>
    <td class=mute style="padding-left:6mm">未取貨退回・不計分潤</td></tr>
<tr><td>已取消（付款失敗）</td><td class=n>{len(cancel)}</td><td class=n>{pct(len(cancel))}</td>
    <td class=mute style="padding-left:6mm">不計分潤</td></tr>
<tr class=sum><td>合計</td><td class=n>{tot}</td><td class=n>100%</td>
    <td style="padding-left:6mm">實際成交 {n} 筆</td></tr>
</table>
<div class=note>※ 分潤以<b>實際成交（已完成・已付款取貨）</b>訂單計算；未取貨退回與付款失敗取消之訂單不列入分潤。</div>
</div>
<div class=ft><div>HEIWEI 何謂美　｜　團主結算確認單</div><div>{camp}　・　1 / 3</div></div>
</div>"""

    p2 = f"""<div class=page>
{head_block(host, f"致：團主 {host}", "結案・成效暨分潤確認單", "")}
<div class=sec><div class=sh><b>商品銷售（實際成交）</b><span>PRODUCT SALES</span></div>
<table>
<tr><th>商品組合</th><th class=n>成交數</th><th class=n>商品銷售額</th><th class=n>占比</th>
    <th style="padding-left:6mm">視覺占比</th></tr>
{prod_rows}
<tr class=sum><td>合計</td><td class=n>{lines_n}</td><td class=n>NT${money(settle)}</td>
    <td class=n>100%</td><td></td></tr>
</table></div>

<div class=sec><div class=sh><b>每日成交趨勢</b><span>DAILY TREND</span></div>
<div class=trendbox>{day_rows}</div>
<div class=note>※ 成交集中於 {peak_d}（{peak['n']} 筆／NT${money(peak['gmv'])}，占 {peak_pct:.1f}%）；
開團首日即完成過半銷售，後續為長尾補單。</div>
</div>
<div class=ft><div>HEIWEI 何謂美　｜　團主結算確認單</div><div>{camp}　・　2 / 3</div></div>
</div>"""

    p3 = f"""<div class="page p3">
{head_block(host, f"致：團主 {host}", "分潤確認・憑證與簽署", "")}
<div class=sec><div class=sh><b>分潤金額確認</b><span>COMMISSION</span></div>
<div class=calc><div class=f>商品銷售額 <b>NT${money(settle)}</b> × 分潤 <b>{rate}</b>　＝　應結分潤</div>
  <div class=amt><small>NT$</small> {money(comm)}</div></div></div>

<div class=sec><div class=sh><b>憑證開立方式（請勾選）</b><span>TAX DOCUMENT</span></div>
<p style="margin:0;font-size:9pt;color:#4a4a4a;line-height:1.8">憑證種類<b>依您的身分別決定</b>：個人戶（無統一編號）請選勞務報酬單；有商業登記（行號／工作室／公司，有統編）請選發票或收據。請勾選並填寫對應資料。</p>

<div class=opt><div class=oh><div class=box></div><div class=ot>開立勞務報酬單（勞報單）</div>
  <div class=oa>適用：個人戶・自然人接案・分潤・無統一編號</div></div>
  <p>HEIWEI 將依法辦理扣繳並開立扣繳憑單。<b>實領金額以扣繳後為準</b>（將扣除應扣繳稅款及二代健保補充保費，如適用）。請提供以下資料：</p>
  <div class=fields><div class=fld><div class=line></div><div class=lb>姓名</div></div>
    <div class=fld><div class=line></div><div class=lb>電話</div></div>
    <div class=fld><div class=line></div><div class=lb>身分證字號</div></div></div>
  <div class=fields><div class=fld style="flex:2"><div class=line></div><div class=lb>戶籍地址</div></div></div>
</div>

<div class=opt><div class=oh><div class=box></div><div class=ot>開立發票／收據（由您開立予 HEIWEI）</div>
  <div class=oa>適用：有商業登記・行號／個人工作室／公司・有統一編號</div></div>
  <p>請依下列<b>買受人資訊</b>開立發票或收據予 HEIWEI（行號免用統一發票者可開收據、公司開立統一發票）；HEIWEI 將憑該憑證全額給付分潤。</p>
  <div class=buyer><div class=cap>請開立予下列買受人（抬頭）</div>
    <b>何謂美國際有限公司</b>　｜　統一編號 <b>90960704</b>　｜　地址 高雄市左營區文敬路 59 號</div>
</div></div>

<div class=sec><div class=sh><b>簽署確認</b><span>SIGNATURE</span></div>
<div class=sign>
  <div class=decl>本人為團主 <b>{host}</b>，已詳閱本結案報告，確認<b>應結分潤金額 NT${money(comm)}（新台幣{cn_amount(comm)}）</b>無誤，並已勾選憑證開立方式、填列匯款資訊，同意以此辦理分潤匯款。</div>
  <div class=fields style="margin-top:3.5mm">
    <div class=fld><div class=line></div><div class=lb>團主簽名</div></div>
    <div class=fld><div class=line></div><div class=lb>確認日期</div></div></div>
  <div class=sub-h><b>匯款資訊</b><span>供會計匯款</span></div>
  <div class=fields style="margin-top:2mm">
    <div class=fld><div class=line></div><div class=lb>銀行</div></div>
    <div class=fld><div class=line></div><div class=lb>分行</div></div>
    <div class=fld><div class=line></div><div class=lb>戶名</div></div>
    <div class=fld><div class=line></div><div class=lb>帳號</div></div></div>
  <div class=fields><div class=fld><div class=line></div><div class=lb>業務承辦 HEIWEI</div></div>
    <div class=fld></div><div class=fld></div></div>
</div>
<div class=note>※ 簽署、勾選憑證方式並填妥匯款資訊後請回傳予業務承辦，HEIWEI 將於確認後安排分潤匯款。憑證認定如有疑問，建議洽詢您的記帳士／會計師。</div>
</div>
<div class=ft><div>HEIWEI 何謂美　｜　團主結算確認單・憑證</div><div>{camp}　・　3 / 3</div></div>
</div>"""

    html = f"<meta charset=utf-8><title>{camp}結案確認單</title><style>{CSS}</style>{p1}{p2}{p3}"
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
    tmp.write(html)
    tmp.close()
    subprocess.run([
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "--headless", "--disable-gpu", "--no-pdf-header-footer",
        f"--print-to-pdf={outfile}", "--virtual-time-budget=4000",
        f"file://{tmp.name}"], check=True, capture_output=True)
    return dict(orders=n, gmv=gmv, settle=settle, comm=comm, aov=aov,
                prods=prods, days=days, html=tmp.name)


if __name__ == "__main__":
    xls, host, camp, out = sys.argv[1:5]
    period = "—"
    if "--period" in sys.argv:
        period = sys.argv[sys.argv.index("--period") + 1]
    st = build(parse(xls), host, camp, period, out)
    print(f"訂單 {st['orders']}｜GMV {st['gmv']:,.0f}｜商品銷售額 {st['settle']:,.0f}"
          f"｜分潤 {st['comm']:,.0f}｜AOV {st['aov']:,.0f}")
    print("→", out)
