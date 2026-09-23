#!/usr/bin/env python3
"""讀 report_data.json 產出團購顧客標籤報告 HTML（再用 Chrome headless 轉 PDF）。"""
import json,sys,datetime
data=json.load(open(sys.argv[1])); out=sys.argv[2]
T=data["teams"]; C=data["cross"]
tot_cust=sum(t["customers"] for t in T); tot_ord=sum(t["orders"] for t in T)
tot_rev=sum(t["revenue"] for t in T)
uniq=data["unique_customers"]; assign=data["assignments"]
def money(v): return f"{v:,.0f}"

rows=[]
def rng(a,b):
    return f"{a[:4]}/{a[5:7]}/{a[8:10]}–{b[5:7]}/{b[8:10]}" if a[:4]==b[:4] else f"{a[:4]}/{a[5:]}–{b[:4]}/{b[5:]}"
for t in T:
    sess="　".join(rng(x["first"],x["last"]) for x in t["sessions"])
    aov=t["revenue"]/t["orders"] if t["orders"] else 0
    rows.append(f"""<tr><td class=tag>{t['tag']}</td><td class=n>{t['customers']:,}</td>
      <td class=n>{t['orders']:,}</td><td class=n>{money(t['revenue'])}</td><td class=n>{money(aov)}</td>
      <td class=dt>{sess}</td><td class=n>{len(t['sessions'])}</td></tr>""")

multi_sess="".join(
  f"<tr><td class=tag>{t['tag']}</td><td class=dt>{x['name']}</td><td class=dt>{rng(x['first'],x['last'])}</td>"
  f"<td class=n>{x['customers']:,}</td><td class=n>{x['orders']:,}</td><td class=n>{x['revenue']:,}</td></tr>"
  for t in T if len(t["sessions"])>1 for x in t["sessions"])

crows=[]
for i,p in enumerate(C,1):
    legs="".join(f"<div class=leg><span class=lt>{o['tag'].replace('團購-','')}</span>"
                 f"<span class=ld>{o['date'].replace('-','/')}</span>"
                 f"<span class=la>${money(o['total'])}</span></div>" for o in p["gb_orders"])
    contact=" ".join(x for x in [p["phone"],p["email"]] if x)
    crows.append(f"""<tr><td class=n>{i}</td><td><b>{p['name']}</b><div class=sub>{contact}</div></td>
      <td>{legs}</td><td class=n>{p['gap']}</td><td class=n>${money(p['gb_total'])}</td></tr>""")

html=f"""<title>團購顧客標籤報告</title>
<style>
@page{{size:A4;margin:14mm 12mm 16mm}}
*{{box-sizing:border-box}}
body{{font-family:"Noto Sans TC","PingFang TC","Heiti TC",sans-serif;color:#25211e;margin:0;
     font-size:9.4pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
h1{{font-size:19pt;margin:0 0 2mm;letter-spacing:.04em;font-weight:700}}
h2{{font-size:11.5pt;margin:9mm 0 3mm;padding-bottom:1.5mm;border-bottom:1.6px solid #25211e;
    letter-spacing:.06em}}
h2 span{{font-weight:400;color:#8a8078;font-size:9pt;letter-spacing:0}}
.lead{{color:#6f6862;font-size:9.2pt;margin:0 0 6mm}}
.hdr{{border-bottom:3px solid #25211e;padding-bottom:4mm;margin-bottom:6mm}}
.brand{{font-size:8.4pt;letter-spacing:.3em;color:#a4998f;margin-bottom:2mm}}
.kpis{{display:flex;gap:3mm;margin:5mm 0 2mm}}
.kpi{{flex:1;border:1px solid #e2dcd5;border-top:3px solid #b08d68;padding:3.5mm 3mm;background:#fbf9f7}}
.kpi .v{{font-size:16pt;font-weight:700;letter-spacing:-.01em;line-height:1.15}}
.kpi .l{{font-size:8pt;color:#8a8078;margin-top:1mm;letter-spacing:.05em}}
.kpi .s{{font-size:7.6pt;color:#a4998f;margin-top:.6mm}}
table{{width:100%;border-collapse:collapse;margin-top:2mm}}
th{{font-size:8pt;color:#8a8078;text-align:left;font-weight:600;letter-spacing:.06em;
    border-bottom:1px solid #d8d1c9;padding:2mm 1.8mm}}
td{{padding:2mm 1.8mm;border-bottom:1px solid #efeae5;vertical-align:top}}
tr:nth-child(even) td{{background:#fbf9f7}}
.n{{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}}
.tag{{font-weight:600}}
.dt{{color:#6f6862;font-size:8.4pt}}
.sub{{color:#8a8078;font-size:7.8pt;word-break:break-all;line-height:1.35}}
.leg{{display:flex;gap:2mm;align-items:baseline;font-size:8.4pt;padding:.4mm 0}}
.lt{{min-width:19mm;font-weight:600}}
.ld{{min-width:15mm;color:#6f6862;font-variant-numeric:tabular-nums}}
.la{{color:#6f6862;font-variant-numeric:tabular-nums}}
.note{{background:#faf7f3;border-left:3px solid #b08d68;padding:3.5mm 4mm;margin:4mm 0;font-size:8.8pt}}
.note b{{display:block;margin-bottom:1.2mm}}
ol,ul{{margin:2mm 0;padding-left:5mm}} li{{margin:1.2mm 0}}
code{{background:#f2ede7;padding:.3mm 1.2mm;border-radius:2px;font-size:8.2pt;
      font-family:"SF Mono",Menlo,monospace}}
.foot{{margin-top:8mm;padding-top:3mm;border-top:1px solid #d8d1c9;color:#a4998f;font-size:7.8pt}}
.pb{{page-break-before:always}}
tr{{page-break-inside:avoid}}
</style>
<div class=hdr>
  <div class=brand>HEIWEI 何謂美｜顧客分群</div>
  <h1>團購顧客標籤報告</h1>
  <div class=lead>依 Shopline 訂單來源（一頁式商店）歸團，為歷來所有團購客戶建立「團購-團主」標籤。
  資料截至 {data['generated'].replace('-','/')}，掃描全站 {data['total_orders_scanned']:,} 筆訂單。</div>
</div>

<div class=kpis>
  <div class=kpi><div class=v>{len(T)}</div><div class=l>團主標籤</div><div class=s>共 {sum(len(t['sessions']) for t in T)} 場開團</div></div>
  <div class=kpi><div class=v>{uniq:,}</div><div class=l>已標籤客戶</div><div class=s>去重後不重複人數</div></div>
  <div class=kpi><div class=v>{tot_ord:,}</div><div class=l>團購訂單</div><div class=s>佔全站 {tot_ord/data['total_orders_scanned']*100:.0f}%</div></div>
  <div class=kpi><div class=v>{money(tot_rev/10000)}萬</div><div class=l>團購營收</div><div class=s>客單 ${money(tot_rev/tot_ord)}</div></div>
  <div class=kpi><div class=v>{len(C)}</div><div class=l>跨團回購客</div><div class=s>僅佔 {len(C)/uniq*100:.1f}%</div></div>
</div>

<h2>一、標籤總覽 <span>依客戶數排序</span></h2>
<table>
<tr><th>標籤</th><th class=n>客戶</th><th class=n>訂單</th><th class=n>營收 NT$</th><th class=n>客單價</th><th>開團期間</th><th class=n>場次</th></tr>
{''.join(rows)}
<tr style="border-top:2px solid #25211e"><td class=tag>合計</td><td class=n>{tot_cust:,}</td>
<td class=n>{tot_ord:,}</td><td class=n>{money(tot_rev)}</td><td class=n>{money(tot_rev/tot_ord)}</td>
<td class=dt>2025/08–2026/08</td><td class=n>{sum(len(t['sessions']) for t in T)}</td></tr>
</table>
<div class=note><b>為什麼客戶數合計（{tot_cust:,}）大於實際標籤人數（{uniq:,}）</b>
同一位客人若跨兩團購買，會在兩個團各被計一次，但實際只有一個人、掛兩個標籤。
差額 {tot_cust-uniq} 來自下一頁的 {len(C)} 位跨團客戶（其中 {sum(1 for p in C if len(p['tags'])>2)} 位跨了三團）。
實際寫入 {uniq:,} 位客戶、{assign:,} 個標籤指派。</div>

<h2>同一團主的多次開團 <span>共用同一標籤，此處拆開檢視</span></h2>
<table>
<tr><th>標籤</th><th>一頁式商店名稱</th><th>期間</th><th class=n>客戶</th><th class=n>訂單</th><th class=n>營收 NT$</th></tr>
{multi_sess}
</table>

<div class=pb></div>
<h2>二、跨團回購客戶名單 <span>{len(C)} 位，同時掛兩個以上標籤</span></h2>
<div class=lead>這 {len(C)} 位是唯一在不同團主的團裡都下過單的人 —— 佔全部團購客戶的 {len(C)/uniq*100:.1f}%。
她們是已經跳脫「跟團主買」、轉為認品牌的族群，是最值得優先經營的名單。</div>
<table>
<tr><th class=n>#</th><th>顧客／聯絡方式</th><th>參與的團（標籤・日期・金額）</th><th class=n>間隔天數</th><th class=n>團購累計</th></tr>
{''.join(crows)}
</table>

<div class=pb></div>
<h2>三、怎麼用這批標籤</h2>
<ol>
<li><b>後台篩選：</b>Shopline 管理後台 → 顧客管理 → 篩選條件選「標籤」→ 輸入 <code>團購-</code> 可列出所有團購客；輸入完整標籤（如 <code>團購-桐林</code>）則只出該團。</li>
<li><b>再行銷分眾：</b>三包千人以上的名單（團購-COCO、團購-Yboutique、團購-桐林）可各自做專屬回購優惠，避免全站群發浪費 LINE 推播額度。</li>
<li><b>團主續約談判：</b>標籤總覽的客單價與營收欄可直接當作和團主談下一檔分潤的依據。</li>
<li><b>跨團名單：</b>第二頁 {len(C)} 位建議獨立經營（專屬客服、新品優先試用），她們的回購動機來自品牌本身而非團主。</li>
</ol>

<h2>四、資料來源與維護</h2>
<ul>
<li><b>歸團依據：</b>訂單的 <code>order_source</code> 欄位（type = <code>one_page_store</code>），即客人下單時所在的團主一頁式商店。</li>
<li><b>分潤活動無法歸團：</b>後台雖有對應的 affiliate campaign，但訂單的 <code>affiliate_data</code> 全為空、<code>order_usage</code> API 回 404，故一律以 order_source 為準。</li>
<li><b>寫入方式：</b><code>PATCH /v1/customers/{{id}}/tags</code> 帶 <code>update_mode=add</code>，累加不覆蓋既有標籤，重跑不會重複。</li>
<li><b>維護腳本：</b><code>scripts/shopline/scan_order_sources.py</code>（掃新團來源）、
<code>tag_groupbuy_customers.py</code>（單一團補標）、<code>tag_all_groupbuys.py</code>（全部重跑）。</li>
<li><b>未涵蓋：</b>官網自然流量與實體店訂單不在本次標籤範圍；實體店另有部分 POS 訂單未綁定會員，無法上標籤。</li>
</ul>

<div class=foot>HEIWEI 何謂美｜團購顧客標籤報告　產出日期 {data['generated'].replace('-','/')}　
資料來源 Shopline Open API　寫入 {uniq:,} 位客戶全數成功、抽樣 120 位驗證無誤</div>
"""
open(out,"w").write(html)
print("wrote",out)
