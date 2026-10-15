#!/usr/bin/env python3
"""A 軌名單匯出 —— CRM V1 標籤客中「未綁 LINE 且有 Email」者。

這批人推播不到（Shopline 沒有 line_id），只能走 Email，
目的是請他們綁定 LINE，讓下一波改用推播。

⚠️ 2026-10-15 起，實際寄送改走 Shopline 顧客分群＋廣播中心，不再用這份 CSV 寄信。
   本檔保留作為「對帳用」：客服建好分群後，用這裡的人數交叉驗證試算結果。
   欄位 可寄送 標示是否同意接收行銷信 —— 未同意者 Shopline 不會寄，法規限制。

用法：
  python3 export_a_track.py                  # 產出 CSV 到 data/crm-v2/
  python3 export_a_track.py --out 路徑.csv

⚠️ 產出檔含顧客姓名與 Email，屬個資。已在 .gitignore 排除，勿外傳。
"""
import argparse, csv, datetime, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sl_api as S
from line_push import fetch_customers, tags_of, money, EXCLUDE_NAMES, EXCLUDE_EMAILS

# CRM V1 名單＝當初實際分群上的 V1-* 標籤。
# 刻意「不」納入 VIP-高價值／回頭客／大量採購 這三個橫向標籤：
# 那是跨期的行為標籤，不是 V1 這批名單的成員定義，納入會多出約 230 位非 V1 客。
def is_v1(tg):
    return any(t.startswith('V1-') for t in tg)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(S.ROOT, 'data', 'crm-v2',
                                                  'A軌_未綁LINE名單.csv'))
    a = ap.parse_args()

    print('撈取顧客中…', file=sys.stderr)
    customers = fetch_customers()

    rows = []
    stat = {'v1': 0, 'bound': 0, 'no_email': 0, 'excluded': 0}
    for c in customers:
        tg = tags_of(c)
        if not is_v1(tg):
            continue
        stat['v1'] += 1
        name = (c.get('name') or '').strip()
        email = (c.get('email') or '').strip()
        if name in EXCLUDE_NAMES or email.lower() in EXCLUDE_EMAILS:
            stat['excluded'] += 1
            continue
        if c.get('line_id'):
            stat['bound'] += 1
            continue
        if not email or '@' not in email:
            stat['no_email'] += 1
            continue
        rows.append({
            '姓名': name or '(未填)',
            'Email': email,
            '可寄送': '是' if c.get('is_subscribed_marketing_email') else '否（未同意行銷信）',
            'VIP人工': '是' if 'V1-VIP人工' in tg else '',
            '累計消費': int(money(c.get('orders_total_sum'))),
            '訂單數': int(c.get('order_count') or 0),
            '標籤': '／'.join(sorted(tg)),
            '顧客ID': c.get('id'),
        })

    rows.sort(key=lambda r: -r['累計消費'])

    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    sendable = [r for r in rows if r['可寄送'] == '是' and not r['VIP人工']]
    tot = sum(r['累計消費'] for r in rows)
    print('=' * 60)
    print(f'CRM V1 標籤客　　　{stat["v1"]:,} 位')
    print(f'  已綁 LINE（走 B 軌推播）　{stat["bound"]:,} 位')
    print(f'  未綁且無 Email（撈不到）　{stat["no_email"]:,} 位')
    print(f'  永久排除　　　　　　　　　{stat["excluded"]} 位')
    print(f'→ A 軌名單總數　　{len(rows):,} 位')
    print(f'   累計消費 NT${tot:,}　人均 NT${tot//max(len(rows),1):,}')
    print()
    print(f'★ Shopline 廣播實際寄得到　{len(sendable):,} 位')
    print(f'   （已扣除未同意行銷信者與 V1-VIP人工，此數應與後台分群試算相符）')
    print('=' * 60)
    print(f'已寫出：{a.out}')


if __name__ == '__main__':
    main()
