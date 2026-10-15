#!/usr/bin/env python3
"""促銷活動成效分析 —— 任何一檔 Shopline 促銷都能跑。

用法：
  # 1) 先列出活動找 ID（可用關鍵字過濾）
  python3 promo_review.py --list
  python3 promo_review.py --list 超取

  # 2) 跑分析（期間預設讀活動本身的起訖）
  python3 promo_review.py --id 6a965c1a3a69b678c7046b91

  # 3) 自訂對照期與輸出
  python3 promo_review.py --id <ID> --baseline 2026-06-01:2026-08-31 --out ../../data/promo-xxx

產出：
  <out>/analysis.txt   純文字完整統計
  <out>/summary.json   機器可讀摘要（給後續產報告用）

分析邏輯（與 2026-10-01 的 7-ELEVEN 超取禮分析一致）：
  · 以訂單明細 item_type=Gift 且 promotion_id 相符，辨識「實際觸發」的訂單
  · 一律排除已取消訂單
  · 預設排除 NT$0 訂單（體驗組索取單會嚴重稀釋占比與客單價，見 --keep-zero）
  · 活動若限定物流／平台，自動抓出該限制並據此計算「符合資格」母數
"""
import argparse, json, os, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sl_api as S


def month_add(ym, delta):
    y, m = int(ym[:4]), int(ym[5:7])
    m += delta
    y += (m - 1) // 12
    m = (m - 1) % 12 + 1
    return f'{y:04d}-{m:02d}'


def month_range(ym):
    import calendar
    y, m = int(ym[:4]), int(ym[5:7])
    return f'{ym}-01', f'{ym}-{calendar.monthrange(y, m)[1]:02d}'


def bucket(a):
    if a < 1000:  return '低於 1,000'
    if a < 2000:  return '1,000–1,999'
    if a < 3000:  return '2,000–2,999'
    if a < 5000:  return '3,000–4,999'
    return '5,000 以上'


def collect(orders, promo_id, deliv_ids, platforms, keep_zero, min_price=0, min_items=0):
    """回傳 (統計字典, 觸發訂單清單)。

    三層母數，缺一個比率就會失真：
      all   全站所有付費訂單（只作背景參考）
      scope 活動「平台限制」內的訂單 —— 這才是算占比的正確分母
      elig  scope 之內又命中「物流限制」的訂單 = 真正符合資格
    """
    st = {'all': [0, 0.0], 'scope': [0, 0.0], 'elig': [0, 0.0], 'hit': [0, 0.0], 'zero': 0,
          'by_deliv': defaultdict(lambda: [0, 0.0]),
          'by_src': defaultdict(lambda: [0, 0.0]),
          'by_day': defaultdict(lambda: [0, 0.0]),
          'by_amt': defaultdict(int)}
    hits = []
    for o in orders:
        if S.is_cancelled(o):
            continue
        amt = S.amount(o)
        if amt <= 0 and not keep_zero:
            st['zero'] += 1
            continue
        st['all'][0] += 1; st['all'][1] += amt
        did = S.delivery_id(o)
        ok_p = (not platforms) or (S.source_type(o) in platforms)
        if not ok_p:
            if promo_id in S.gift_promo_ids(o):
                st['hit'][0] += 1; st['hit'][1] += amt; hits.append(o)
                k = f'{S.source_type(o)} {S.source_name(o)}'.strip()
                st['by_src'][k][0] += 1; st['by_src'][k][1] += amt
                st['by_day'][S.created_date(o)][0] += 1
                st['by_day'][S.created_date(o)][1] += amt
                st['by_amt'][bucket(amt)] += 1
            continue
        st['scope'][0] += 1; st['scope'][1] += amt
        st['by_deliv'][S.delivery_name(o)][0] += 1
        st['by_deliv'][S.delivery_name(o)][1] += amt
        ok_amt = amt >= min_price
        ok_cnt = True
        if min_items:
            q = sum(int(x.get('quantity') or 0) for x in (o.get('subtotal_items') or [])
                    if x.get('item_type') == 'Product')
            ok_cnt = q >= min_items
        if ((not deliv_ids) or (did in deliv_ids)) and ok_amt and ok_cnt:
            st['elig'][0] += 1; st['elig'][1] += amt
        if promo_id in S.gift_promo_ids(o):
            st['hit'][0] += 1; st['hit'][1] += amt
            hits.append(o)
            k = f'{S.source_type(o)} {S.source_name(o)}'.strip()
            st['by_src'][k][0] += 1; st['by_src'][k][1] += amt
            st['by_day'][S.created_date(o)][0] += 1
            st['by_day'][S.created_date(o)][1] += amt
            st['by_amt'][bucket(amt)] += 1
    return st, hits


def days_between(s, e):
    import datetime
    f = '%Y-%m-%d'
    return (datetime.datetime.strptime(e, f) - datetime.datetime.strptime(s, f)).days + 1


def line(st, label, nd):
    sc, e = st['scope'], st['elig']
    pct = e[0] / max(sc[0], 1) * 100
    return (f"{label:<13}{nd:>5}{sc[0]:>8}{sc[1]:>12,.0f}{sc[1]/max(nd,1):>11,.0f}"
            f"{sc[1]/max(sc[0],1):>9,.0f}{e[0]:>8}{pct:>8.1f}%{e[1]/max(e[0],1):>10,.0f}{st['zero']:>7}")


def main():
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument('--list', nargs='?', const='', metavar='關鍵字', help='列出促銷活動')
    ap.add_argument('--id', help='促銷活動 ID')
    ap.add_argument('--period', help='活動期 YYYY-MM-DD:YYYY-MM-DD（預設讀活動設定）')
    ap.add_argument('--baseline', help='對照期 YYYY-MM-DD:YYYY-MM-DD（預設活動前三個月，逐月列出）')
    ap.add_argument('--out', default=None, help='輸出目錄')
    ap.add_argument('--keep-zero', action='store_true', help='保留 NT$0 訂單（預設排除）')
    ap.add_argument('--no-cache', action='store_true')
    a = ap.parse_args()

    if a.list is not None:
        kw = a.list
        print(f"{'ID':<26}{'名稱':<34}{'期間':<24}{'狀態':<9}{'使用'}")
        print('-' * 104)
        for pr in S.get_promotions():
            t = S.promo_title(pr)
            if kw and kw not in t:
                continue
            per = f"{str(pr.get('start_at'))[:10]}~{str(pr.get('end_at'))[:10]}"
            print(f"{pr['id']:<26}{t[:32]:<34}{per:<24}{str(pr.get('status')):<9}{pr.get('use_count')}")
        return

    if not a.id:
        ap.error('請給 --id，或先用 --list 找活動')

    pr = next((x for x in S.get_promotions() if x['id'] == a.id), None)
    if not pr:
        raise SystemExit(f'找不到活動 {a.id}')

    title = S.promo_title(pr)
    deliv_ids = set(pr.get('whitelisted_delivery_option_ids') or [])
    plat_raw  = pr.get('available_platforms') or []
    platforms = {'storefront'} if plat_raw == ['ec'] else set()

    if a.period:
        ps, pe = a.period.split(':')
    else:
        ps, pe = str(pr.get('start_at'))[:10], str(pr.get('end_at'))[:10]
        if pe == 'None':
            raise SystemExit('活動沒有結束日，請用 --period 指定分析期間')

    out = a.out or os.path.join(S.ROOT, 'data', 'promo-' + a.id[:8])
    os.makedirs(out, exist_ok=True)
    buf = []
    def P(*x):
        s = ' '.join(str(i) for i in x)
        print(s); buf.append(s)

    P('=' * 96)
    P(f'促銷活動成效分析：{title}')
    P('=' * 96)
    P(f'活動 ID    {a.id}')
    P(f'活動期間   {ps} ~ {pe}   （分析用）')
    P(f'活動類型   {pr.get("discount_type")}  ・ 系統記錄使用次數 {pr.get("use_count")}')
    if deliv_ids:
        P('限定物流   ' + '、'.join(S.get_delivery_name(d) for d in deliv_ids))
    if plat_raw:
        P(f'限定平台   {plat_raw}')
    conds = pr.get('conditions') or []
    min_price, min_items = 0, 0
    for c in conds:
        mp = (c.get('min_price') or {}).get('dollars') or 0
        mi = c.get('min_item_count') or 0
        min_price = max(min_price, float(mp)); min_items = max(min_items, int(mi))
        P(f'門檻       最低金額 {(c.get("min_price") or {}).get("label") or "無"}'
          f' ・ 最低件數 {mi or "無"}')
    P(f'零元訂單   {"保留" if a.keep_zero else "排除（體驗組索取單會稀釋占比與客單價）"}')
    P('')

    # 對照期：預設活動起月往前三個月
    if a.baseline:
        bs, be = a.baseline.split(':')
        periods = [(bs, be, '對照期')]
    else:
        m0 = ps[:7]
        periods = [month_range(month_add(m0, -i)) + (month_add(m0, -i),) for i in (3, 2, 1)]

    scope_desc = '官網(storefront)' if platforms else '全站'
    P(f'【逐期比較】排除已取消與零元單。「適用範圍」＝{scope_desc}，占比以此為分母；')
    P('　　　　　　「符合資格」＝適用範圍內又命中活動物流限制者。')
    P(f"{'期間':<13}{'天數':>5}{'適用範圍':>8}{'範圍營收':>12}{'日均營收':>11}{'客單價':>9}{'符合資格':>8}{'占比':>9}{'資格客單':>10}{'零元':>7}")
    P('-' * 97)
    results = {}
    for s, e, lab in periods:
        orders = list(S.iter_orders(s, e, use_cache=not a.no_cache, quiet=True))
        st, _ = collect(orders, a.id, deliv_ids, platforms, a.keep_zero, min_price, min_items)
        P(line(st, lab, days_between(s, e)))
        results[lab] = (st, days_between(s, e))
    orders = list(S.iter_orders(ps, pe, use_cache=not a.no_cache, quiet=True))
    cur, hits = collect(orders, a.id, deliv_ids, platforms, a.keep_zero, min_price, min_items)
    nd_cur = days_between(ps, pe)
    P(line(cur, '★活動期', nd_cur))
    P('')

    prev, nd_prev = results[periods[-1][2]]
    def chg(x, y):
        return f'{(y-x)/x*100:+.1f}%' if x else 'n/a'
    P(f'【活動期 vs 前一期（{periods[-1][2]}）】分母＝{scope_desc}')
    P(f"  適用範圍訂單  {prev['scope'][0]} → {cur['scope'][0]}   {chg(prev['scope'][0], cur['scope'][0])}")
    P(f"  範圍營收      NT${prev['scope'][1]:,.0f} → NT${cur['scope'][1]:,.0f}   {chg(prev['scope'][1], cur['scope'][1])}")
    P(f"  符合資格單數  {prev['elig'][0]} → {cur['elig'][0]}   {chg(prev['elig'][0], cur['elig'][0])}")
    pp = prev['elig'][0] / max(prev['scope'][0], 1) * 100
    cp = cur['elig'][0] / max(cur['scope'][0], 1) * 100
    P(f"  符合資格占比  {pp:.1f}% → {cp:.1f}%   ({cp-pp:+.1f} 個百分點)")
    P(f"  資格客單價    NT${prev['elig'][1]/max(prev['elig'][0],1):,.0f} → NT${cur['elig'][1]/max(cur['elig'][0],1):,.0f}")
    P(f"  資格營收      NT${prev['elig'][1]:,.0f} → NT${cur['elig'][1]:,.0f}   {chg(prev['elig'][1], cur['elig'][1])}")
    if nd_prev != nd_cur:
        dp, dc = prev['scope'][1]/max(nd_prev,1), cur['scope'][1]/max(nd_cur,1)
        P(f"  ⚠ 期間長度不同（{nd_prev} 天 vs {nd_cur} 天），請看日均：NT${dp:,.0f} → NT${dc:,.0f}   {chg(dp, dc)}")
    P('')

    cids = {S.customer_id(o) for o in hits if S.customer_id(o)}
    is_gift = pr.get('discount_type') == 'gift'
    if is_gift:
        P('【實際觸發】以訂單明細 item_type=Gift 比對 promotion_id')
        P(f"  觸發訂單      {cur['hit'][0]} 筆  NT${cur['hit'][1]:,.0f}  客單 NT${cur['hit'][1]/max(cur['hit'][0],1):,.0f}")
        P(f"  不重複顧客    {len(cids)} 位（{cur['hit'][0]-len(cids)} 筆為重複購買）")
        if cur['elig'][0]:
            P(f"  觸發 / 符合資格 = {cur['hit'][0]}/{cur['elig'][0]} = {cur['hit'][0]/cur['elig'][0]*100:.1f}%")
            if cur['hit'][0] >= cur['elig'][0] and not min_price and not min_items:
                P('  ⚠ 觸發率 100%：贈品自動附加且無門檻，領取率無法衡量吸引力，')
                P('     應改看「符合資格占比」的變化 —— 那才是顧客是否因活動改變行為')
        gap = cur['hit'][0] - cur['elig'][0]
        if gap > 0:
            P(f'  ⚠ 觸發數多於符合資格數 {gap} 筆：活動的物流／平台限制未完全生效，請檢查後台設定')
        P(f"  系統 use_count {pr.get('use_count')}  vs  本次比對 {cur['hit'][0]}"
          + ('  ✓ 一致' if pr.get('use_count') == cur['hit'][0] else '  ⚠ 不一致（系統值可能含已取消訂單）'))
    else:
        P(f"【實際觸發】活動類型為 {pr.get('discount_type')}，非贈品型")
        P('  ⚠ 折扣／免運型活動不會在訂單明細留下可比對的項目，無法逐筆回溯誰實際用到。')
        P(f"     僅能參考系統 use_count = {pr.get('use_count')}（可能含已取消訂單）。")
        P('     本報告的「符合資格占比」仍然有效，那是此類活動最可靠的成效指標。')
    P('')

    for key, tt in (('by_src', '觸發訂單的來源'), ('by_deliv', '適用範圍內的物流別'), ('by_amt', '觸發訂單金額級距')):
        d = cur[key]
        if not d:
            continue
        P(f'【{tt}】')
        if key == 'by_amt':
            for k in ['低於 1,000', '1,000–1,999', '2,000–2,999', '3,000–4,999', '5,000 以上']:
                if d.get(k):
                    P(f'  {k:<16}{d[k]:>4} 筆')
        else:
            for k, (n, v) in sorted(d.items(), key=lambda x: -x[1][1]):
                P(f'  {k[:40]:<42}{n:>5} 筆  NT${v:>11,.0f}')
        P('')

    if cur['by_day']:
        P('【逐日觸發】')
    for k in sorted(cur['by_day']):
        n, v = cur['by_day'][k]
        P(f'  {k}  {n:>3} 筆  NT${v:>9,.0f}')

    open(os.path.join(out, 'analysis.txt'), 'w', encoding='utf-8').write('\n'.join(buf) + '\n')
    js = {'promotion_id': a.id, 'title': title, 'period': [ps, pe],
          'use_count_system': pr.get('use_count'),
          'scope': scope_desc,
          'current': {'all': cur['all'], 'scope': cur['scope'], 'eligible': cur['elig'], 'hit': cur['hit'],
                      'zero_orders': cur['zero'], 'unique_customers': len(cids)},
          'days': nd_cur,
          'baseline': {lab: {'days': nd, 'all': st['all'], 'scope': st['scope'],
                             'eligible': st['elig'], 'zero_orders': st['zero']}
                       for lab, (st, nd) in results.items()},
          'by_source': {k: v for k, v in cur['by_src'].items()},
          'by_amount_bucket': dict(cur['by_amt']),
          'by_day': {k: v for k, v in cur['by_day'].items()}}
    json.dump(js, open(os.path.join(out, 'summary.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    print(f'\n→ 已寫出 {out}/analysis.txt 與 summary.json', file=sys.stderr)


if __name__ == '__main__':
    main()
