#!/usr/bin/env python3
"""CRM V2 推播成效報告 —— 自動彙整 LINE 推播與折扣碼轉換。

六項指標裡有五項可全自動取得，只有「顧客回覆則數」要人工到 LINE 聊天室數。

用法：
  python3 v2_report.py                      # 預設看 V2RETURN
  python3 v2_report.py --code BIND100
  python3 v2_report.py --code V2RETURN --replies 12   # 把人工數到的回覆數補進去

資料來源：
  送達人數  data/line-push/*.json（推播當下的執行紀錄，mode=send 那幾筆）
  使用次數  Shopline 促銷的 use_count
  帶動營收  訂單的 promotion_items[].promotion._id 比對
  封鎖變化  LINE insight/followers（可查過去任一天，不需事先存基準）
"""
import argparse, datetime, glob, json, os, sys, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sl_api as S
from line_push import line_token

LOG_DIR = os.path.join(S.ROOT, 'data', 'line-push')


def money(v):
    if isinstance(v, dict):
        return float(v.get('dollars') or 0)
    try:
        return float(v or 0)
    except Exception:
        return 0.0


def find_promo(code):
    code = code.strip().lower()
    for p in S.get_promotions():
        if any(str(c).strip().lower() == code for c in (p.get('codes') or [])):
            return p
    return None


def latest_push(code):
    """挑出最近一次真的送出去的推播紀錄（mode=send）。"""
    best = None
    for f in sorted(glob.glob(os.path.join(LOG_DIR, '*.json'))):
        try:
            d = json.load(open(f, encoding='utf-8'))
        except Exception:
            continue
        if d.get('mode') != 'send':
            continue
        blob = json.dumps(d, ensure_ascii=False)
        if code.lower() in blob.lower():
            best = (f, d)
    return best


def insight(tok, d):
    try:
        r = urllib.request.Request(
            f'https://api.line.me/v2/bot/insight/followers?date={d}',
            headers={'Authorization': 'Bearer ' + tok})
        j = json.load(urllib.request.urlopen(r, timeout=20))
        return j if j.get('status') == 'ready' else None
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--code', default='V2RETURN')
    ap.add_argument('--replies', type=int, help='LINE 聊天室顧客回覆則數（人工數）')
    a = ap.parse_args()

    print('=' * 64)
    print(f'CRM V2 推播成效報告　折扣碼 {a.code}')
    print(f'產出時間　{datetime.datetime.now():%Y-%m-%d %H:%M}')
    print('=' * 64)

    # ── 1. 推播送達 ────────────────────────────────────────────
    push = latest_push(a.code)
    sent = push_date = None
    if push:
        f, d = push
        sent = d.get('sent_ok') or d.get('to_push')
        push_date = datetime.datetime.strptime(d['time'], '%Y%m%d_%H%M%S')
        print(f'\n【推播】{d.get("label") or "(未命名)"}　{push_date:%Y-%m-%d %H:%M}')
        print(f'  實際送達　　{sent:,} 位')
        if d.get('unreachable'):
            print(f'  已失效排除　{len(d["unreachable"]):,} 位')
        print(f'  紀錄檔　　　{os.path.basename(f)}')
    else:
        print(f'\n【推播】⚠️ 在 {LOG_DIR} 找不到含「{a.code}」且已送出的紀錄')
        print('  （只跑過預覽沒加 --do，或折扣碼拼錯）')

    # ── 2. 折扣碼使用 ──────────────────────────────────────────
    p = find_promo(a.code)
    if not p:
        print(f'\n【折扣碼】⚠️ Shopline 查無代碼 {a.code}，後台還沒建立？')
        return
    title = (p.get('title_translations') or {}).get('zh-hant') or '(無標題)'
    used = int(p.get('use_count') or 0)
    print(f'\n【折扣碼】{title}')
    print(f'  使用次數　　{used:,} 次')
    if p.get('max_use_count'):
        print(f'  總量上限　　{p["max_use_count"]:,} 次')
    print(f'  促銷 ID　　 {p.get("_id") or p.get("id")}')

    # ── 3. 帶動營收 ────────────────────────────────────────────
    pid = str(p.get('_id') or p.get('id'))

    # 掃描區間跟著促銷自己的起迄日走。
    # 原本預設回推 30 天，碰到跨年度或早就結束的活動會一筆都對不到
    # （F520 活動期是 2025/07–08，用 30 天視窗掃出 0 筆）。
    def as_date(v, fallback):
        if not v:
            return fallback
        try:
            return datetime.datetime.strptime(str(v)[:10], '%Y-%m-%d').date()
        except ValueError:
            return fallback

    today = datetime.date.today()
    start = as_date(p.get('start_at'), today - datetime.timedelta(days=30))
    end = min(as_date(p.get('end_at'), today), today)
    if push_date:                      # 有推播紀錄時，只看推播之後的訂單
        start = max(start, push_date.date())
    if end < start:
        end = today
    print(f'\n【帶動營收】掃描 {start} ~ {end}（依促銷起迄日）…', file=sys.stderr)
    rev = disc = 0.0
    cnt = 0
    for o in S.iter_orders(str(start), str(end), quiet=True):
        if S.is_cancelled(o):
            continue
        for it in (o.get('promotion_items') or []):
            if str(((it.get('promotion') or {}).get('_id'))) == pid:
                cnt += 1
                rev += S.amount(o)
                disc += money(it.get('discounted_amount'))
                break
    print(f'  使用該碼的訂單　{cnt:,} 筆')
    print(f'  訂單總額　　　　NT${rev:,.0f}')
    print(f'  折抵成本　　　　NT${disc:,.0f}')
    if cnt:
        print(f'  平均客單　　　　NT${rev/cnt:,.0f}')
    if disc:
        print(f'  投報比　　　　　{rev/disc:.1f} 倍（每折 1 元帶回 {rev/disc:.1f} 元）')

    # ── 4. 轉換率 ──────────────────────────────────────────────
    if sent:
        print(f'\n【轉換率】{used/sent*100:.1f}%　（{used} 次使用 ÷ {sent} 位送達）')
        if cnt:
            print(f'  人均貢獻　NT${rev/sent:,.0f}（總營收 ÷ 送達人數）')

    # ── 5. 封鎖變化 ────────────────────────────────────────────
    tok = line_token()
    print('\n【LINE 好友變化】')
    base_d = (push_date.date() - datetime.timedelta(days=1)) if push_date else None
    rows = []
    for lbl, dt in [('推播前', base_d), ('最新', datetime.date.today() - datetime.timedelta(days=2))]:
        if not dt:
            continue
        j = insight(tok, dt.strftime('%Y%m%d'))
        if j:
            rows.append((lbl, dt, j))
            print(f'  {lbl} {dt}　好友 {j["followers"]:,}　封鎖 {j["blocks"]:,}　'
                  f'可觸及 {j["targetedReaches"]:,}')
        else:
            print(f'  {lbl} {dt}　（LINE 尚未產出該日統計，通常隔日才有）')
    if len(rows) == 2:
        d0, d1 = rows[0][2], rows[1][2]
        db = d1['blocks'] - d0['blocks']
        df = d1['followers'] - d0['followers']
        print(f'  → 封鎖 {db:+,} 位　好友 {df:+,} 位', end='')
        if sent and db > 0:
            print(f'　（封鎖數相當於送達人數的 {db/sent*100:.1f}%）')
        else:
            print()

    # ── 6. 人工項 ──────────────────────────────────────────────
    print('\n【顧客回覆】', end='')
    if a.replies is not None:
        print(f'{a.replies:,} 則')
    else:
        print('未提供　→ 到 LINE 聊天室數完後加 --replies N 重跑')

    print('\n' + '=' * 64)


if __name__ == '__main__':
    main()
