#!/usr/bin/env python3
"""年度業績對比 —— 逐月、通路別、同期比較。

用法：
  python3 year_review.py 2025 2026            # 兩年對比（後者若未完整，自動以 YTD 同期比較）
  python3 year_review.py 2025 2026 --out ../../data/year-review
"""
import argparse, calendar, json, os, sys
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sl_api as S


def pull(year, upto_month=12):
    """回傳 {月: [有效筆, 有效額, 取消筆, 取消額]} 與 {通路: [筆, 額]}。"""
    mon = {m: [0, 0.0, 0, 0.0] for m in range(1, upto_month + 1)}
    src = defaultdict(lambda: [0, 0.0])
    cust = set()
    for m in range(1, upto_month + 1):
        last = calendar.monthrange(year, m)[1]
        print(f'  {year}-{m:02d} …', file=sys.stderr)
        for o in S.iter_orders(f'{year}-{m:02d}-01', f'{year}-{m:02d}-{last}', quiet=True):
            amt = S.amount(o)
            if S.is_cancelled(o):
                mon[m][2] += 1; mon[m][3] += amt
            else:
                mon[m][0] += 1; mon[m][1] += amt
                src[S.source_type(o)][0] += 1; src[S.source_type(o)][1] += amt
                c = S.customer_id(o)
                if c: cust.add(c)
    return mon, src, cust


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('years', nargs=2, type=int)
    ap.add_argument('--upto', type=int, default=None, help='只比到第 N 月（預設自動判斷）')
    ap.add_argument('--out', default=None)
    a = ap.parse_args()
    y1, y2 = a.years

    import datetime
    now = datetime.date.today()
    upto = a.upto or (now.month - 1 if y2 == now.year else 12)
    out = a.out or os.path.join(S.ROOT, 'data', f'year-{y1}-{y2}')
    os.makedirs(out, exist_ok=True)
    buf = []
    def P(*x):
        s = ' '.join(str(i) for i in x); print(s); buf.append(s)

    m1, s1, c1 = pull(y1, 12)
    m2, s2, c2 = pull(y2, upto)
    m1p, s1p, c1p = (m1, s1, c1) if upto == 12 else pull(y1, upto)

    def tot(mon, upto_m=12):
        t = [0, 0.0, 0, 0.0]
        for m in range(1, upto_m + 1):
            for i in range(4): t[i] += mon[m][i]
        return t

    T1, T2 = tot(m1), tot(m2, upto)
    T1p = tot(m1p, upto)

    P('=' * 86)
    P(f'Shopline 年度業績對比　{y1} vs {y2}')
    P('=' * 86)
    P(f'{y2} 資料截至 {y2}-{upto:02d} 月底（YTD），{y1} 同期以 1–{upto} 月計算以利對等比較。')
    P('口徑：排除已取消訂單；金額為訂單總額（含運費）。')
    P('')

    P(f"{'月份':<8}{y1:>9}{'':>3}{'客單':>8}{'':>4}{y2:>10}{'':>3}{'客單':>8}{'':>4}{'年增率':>10}")
    P('-' * 72)
    for m in range(1, 13):
        v1, n1 = m1[m][1], m1[m][0]
        if m <= upto:
            v2, n2 = m2[m][1], m2[m][0]
            g = f'{(v2-v1)/v1*100:+.0f}%' if v1 else '—'
            P(f"{m:>2} 月  {v1:>12,.0f}{n1:>5}單{v1/max(n1,1):>8,.0f}{v2:>12,.0f}{n2:>5}單{v2/max(n2,1):>8,.0f}{g:>10}")
        else:
            P(f"{m:>2} 月  {v1:>12,.0f}{n1:>5}單{v1/max(n1,1):>8,.0f}{'—':>12}{'':>5} {'—':>8}{'—':>10}")
    P('-' * 72)
    g = f'{(T2[1]-T1p[1])/T1p[1]*100:+.1f}%' if T1p[1] else '—'
    P(f"1–{upto} 月  {T1p[1]:>12,.0f}{T1p[0]:>5}單{T1p[1]/max(T1p[0],1):>8,.0f}"
      f"{T2[1]:>12,.0f}{T2[0]:>5}單{T2[1]/max(T2[0],1):>8,.0f}{g:>10}")
    P(f"{y1} 全年 {T1[1]:>12,.0f}{T1[0]:>5}單{T1[1]/max(T1[0],1):>8,.0f}")
    P('')

    P(f'【通路結構】兩邊皆為 1–{upto} 月同期，可直接比較')
    P(f"{'通路':<20}{str(y1)+' 1-'+str(upto)+'月':>14}{'占比':>8}{str(y2)+' 1-'+str(upto)+'月':>14}{'占比':>8}{'年增率':>10}")
    allk = set(s1p) | set(s2)
    for k in sorted(allk, key=lambda x: -s2.get(x, [0, 0])[1]):
        v1 = s1p.get(k, [0, 0.0])[1]; v2 = s2.get(k, [0, 0.0])[1]
        g = f'{(v2-v1)/v1*100:+.0f}%' if v1 else '新增'
        P(f"  {k:<18}{v1:>14,.0f}{v1/max(T1p[1],1)*100:>7.1f}%{v2:>14,.0f}{v2/max(T2[1],1)*100:>7.1f}%{g:>10}")
    P('')
    P(f'  （參考）{y1} 全年通路：' + '／'.join(
        f'{k} NT${v[1]:,.0f}' for k, v in sorted(s1.items(), key=lambda x: -x[1][1])))
    P('')
    P('【顧客數】')
    P(f'  {y1} 全年下單顧客 {len(c1):,} 位')
    P(f'  {y2} 1–{upto} 月  {len(c2):,} 位')
    if c1p is not None:
        P(f'  {y1} 1–{upto} 月  {len(c1p):,} 位　→ 年增 {(len(c2)-len(c1p))/max(len(c1p),1)*100:+.1f}%')
        P(f'  兩年都買過的顧客 {len(c1p & c2):,} 位')

    open(os.path.join(out, 'analysis.txt'), 'w', encoding='utf-8').write('\n'.join(buf) + '\n')
    json.dump({'years': [y1, y2], 'upto_month': upto,
               'monthly': {str(y1): m1, str(y2): m2},
               'totals': {f'{y1}_full': T1, f'{y1}_ytd': T1p, f'{y2}_ytd': T2},
               'sources': {f'{y1}_full': dict(s1), f'{y1}_ytd': dict(s1p), f'{y2}_ytd': dict(s2)},
               'customers': {f'{y1}_full': len(c1), f'{y1}_ytd': len(c1p or []),
                             f'{y2}_ytd': len(c2), 'both': len((c1p or set()) & c2)}},
              open(os.path.join(out, 'summary.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    print(f'\n→ {out}/analysis.txt', file=sys.stderr)


if __name__ == '__main__':
    main()
