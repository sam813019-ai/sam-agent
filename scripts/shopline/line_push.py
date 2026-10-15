#!/usr/bin/env python3
"""LINE 官方帳號分眾推播 —— 依 Shopline 標籤篩選 ＋ line_id 推播。

⚠️ 推播不可逆。本腳本預設「只預覽、不發送」，必須明確加 --do 才會真的送出。

用法：
  # 1) 預覽：列出會推給誰、幾個人、訊息內容（不發送）
  python3 line_push.py --tag "回頭客" --message msg.txt

  # 2) 多標籤交集／排除
  python3 line_push.py --tag "回頭客" --tag "團購-Yboutique" --exclude-tag "VIP-高價值" --message msg.txt

  # 3) 任一標籤符合即納入（聯集）
  python3 line_push.py --any-tag "VIP-高價值" --any-tag "大量採購" --message msg.txt

  # 4) 確認無誤後真的送出
  python3 line_push.py --tag "回頭客" --message msg.txt --do

  # 5) 發圖文卡（Flex Message），--flex 取代 --message
  python3 line_push.py --any-tag "回頭客" --flex cards/v2return.flex.json

產出：
  data/line-push/<時間戳>_<標籤>.json  —— 名單、訊息、執行結果，可追溯

訊息檔格式：純文字，支援多行。LINE 單則上限 5,000 字。
"""
import argparse, datetime, json, os, re, sys, time, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sl_api as S

LINE_API = 'https://api.line.me/v2/bot'
BATCH = 500          # LINE multicast 單次上限
LOG_DIR = os.path.join(S.ROOT, 'data', 'line-push')

# 永久排除：分銷帳號與本人測試帳號（見 CRM V1 既有規則）
EXCLUDE_NAMES = {'宋珮瑄', '冀子琪'}
EXCLUDE_EMAILS = {'sam813019@gmail.com'}


def line_token():
    p = os.path.join(S.ROOT, 'heiwei-review', '.env.local')
    for line in open(p, encoding='utf-8'):
        if line.startswith('LINE_CHANNEL_ACCESS_TOKEN='):
            return line.strip().split('=', 1)[1].strip().strip('"')
    raise SystemExit(f'找不到 LINE_CHANNEL_ACCESS_TOKEN（{p}）')


def line_call(path, payload, tok):
    req = urllib.request.Request(
        f'{LINE_API}/{path}',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'},
        method='POST')
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return True, r.status, ''
    except urllib.error.HTTPError as e:
        return False, e.code, e.read().decode()[:300]
    except Exception as e:
        return False, 0, str(e)[:300]


def reachable(uid, tok):
    """問 LINE 這個 userId 現在推不推得到。

    Shopline 存的 line_id 只代表「曾經綁定過」。顧客之後封鎖或刪好友，
    Shopline 不會知道，欄位還留著 —— 實測 171 位裡有 30 位（17.5%）是這種。
    推播時 multicast 不會報錯，訊息就是靜靜地沒送到，轉換率分母因此灌水。
    """
    req = urllib.request.Request(f'{LINE_API}/profile/{uid}',
                                 headers={'Authorization': 'Bearer ' + tok})
    try:
        urllib.request.urlopen(req, timeout=20)
        return True
    except urllib.error.HTTPError as e:
        if e.code == 404:       # 非好友／已封鎖
            return False
        raise                   # 其他錯誤不要當成失效吞掉


def bot_info(tok):
    req = urllib.request.Request(f'{LINE_API}/info', headers={'Authorization': 'Bearer ' + tok})
    return json.load(urllib.request.urlopen(req, timeout=30))


def quota(tok):
    try:
        req = urllib.request.Request(f'{LINE_API}/message/quota',
                                     headers={'Authorization': 'Bearer ' + tok})
        q = json.load(urllib.request.urlopen(req, timeout=30))
        req2 = urllib.request.Request(f'{LINE_API}/message/quota/consumption',
                                      headers={'Authorization': 'Bearer ' + tok})
        c = json.load(urllib.request.urlopen(req2, timeout=30))
        return q, c
    except Exception as e:
        return None, None


def tags_of(c):
    out = set()
    for t in (c.get('tags') or []):
        n = t if isinstance(t, str) else (t.get('name') or t.get('content') or '')
        if n:
            out.add(n)
    return out


def money(v):
    if isinstance(v, dict):
        return float(v.get('dollars') or 0)
    try:
        return float(v or 0)
    except Exception:
        return 0.0


def fetch_customers():
    out, page = [], 1
    while page <= 80:
        d = S._get('customers', per_page=250, page=page)
        items = d.get('items') or d.get('data') or []
        if not items:
            break
        out += items
        page += 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tag', action='append', default=[], help='必須全部具備（交集），可重複')
    ap.add_argument('--any-tag', action='append', default=[], help='任一符合即納入（聯集），可重複')
    ap.add_argument('--exclude-tag', action='append', default=[], help='具備此標籤者排除，可重複')
    ap.add_argument('--message', help='訊息檔路徑（純文字）')
    ap.add_argument('--flex', help='Flex Message JSON 檔（圖文卡），與 --message 擇一')
    ap.add_argument('--do', action='store_true', help='真的送出（省略則僅預覽）')
    ap.add_argument('--limit', type=int, help='只推前 N 位（測試用）')
    ap.add_argument('--skip-reach-check', action='store_true',
                    help='略過可達性檢查（名單很大、趕時間時用）')
    ap.add_argument('--label', default='', help='本次推播的名稱，寫進紀錄')
    a = ap.parse_args()

    if not (a.tag or a.any_tag):
        ap.error('至少要給一個 --tag 或 --any-tag')
    if bool(a.message) == bool(a.flex):
        ap.error('--message 與 --flex 擇一（不能都給，也不能都不給）')

    if a.flex:
        if not os.path.exists(a.flex):
            ap.error(f'Flex 檔不存在：{a.flex}')
        try:
            payload = json.load(open(a.flex, encoding='utf-8'))
        except json.JSONDecodeError as e:
            ap.error(f'Flex JSON 格式錯誤：{e}')
        # 容許兩種寫法：整個 message 物件，或只給 contents
        if payload.get('type') != 'flex':
            payload = {'type': 'flex', 'altText': payload.pop('altText', 'HEIWEI 何謂美'),
                       'contents': payload.get('contents', payload)}
        if not payload.get('altText'):
            ap.error('Flex 訊息缺少 altText（通知列與舊版 LINE 會顯示這段文字）')
        if len(payload['altText']) > 400:
            ap.error(f'altText {len(payload["altText"])} 字，超過 LINE 上限 400 字')
        messages = [payload]
        text = f"[Flex 圖文卡] {payload['altText']}"
    else:
        if not os.path.exists(a.message):
            ap.error(f'訊息檔不存在：{a.message}')
        text = open(a.message, encoding='utf-8').read().strip()
        if not text:
            ap.error('訊息檔是空的')
        if len(text) > 5000:
            ap.error(f'訊息 {len(text)} 字，超過 LINE 單則上限 5,000 字')
        messages = [{'type': 'text', 'text': text}]

    tok = line_token()
    info = bot_info(tok)

    print('=' * 72)
    print(f'LINE 分眾推播　{"【正式發送】" if a.do else "【預覽模式・不會送出】"}')
    print('=' * 72)
    print(f'官方帳號　{info.get("displayName")}（{info.get("premiumId") or info.get("basicId")}）')
    if a.tag:          print(f'必備標籤　{" ＋ ".join(a.tag)}')
    if a.any_tag:      print(f'任一標籤　{" 或 ".join(a.any_tag)}')
    if a.exclude_tag:  print(f'排除標籤　{" / ".join(a.exclude_tag)}')
    print()

    print('撈取顧客中…', file=sys.stderr)
    customers = fetch_customers()
    want_all = set(a.tag)
    want_any = set(a.any_tag)
    drop = set(a.exclude_tag)

    hit, no_line, excluded = [], 0, 0
    for c in customers:
        tg = tags_of(c)
        if want_all and not want_all.issubset(tg):
            continue
        if want_any and not (want_any & tg):
            continue
        if drop & tg:
            continue
        name = (c.get('name') or '').strip()
        email = (c.get('email') or '').strip().lower()
        if name in EXCLUDE_NAMES or email in EXCLUDE_EMAILS:
            excluded += 1
            continue
        if not c.get('line_id'):
            no_line += 1
            continue
        hit.append({'id': c['id'], 'name': name or '(未填)', 'line_id': c['line_id'],
                    'spend': money(c.get('orders_total_sum')),
                    'orders': int(c.get('order_count') or 0)})

    hit.sort(key=lambda x: -x['spend'])
    if a.limit:
        hit = hit[:a.limit]

    unreachable = []
    if hit and not a.skip_reach_check:
        print(f'可達性檢查中（{len(hit):,} 位，逐一向 LINE 確認）…', file=sys.stderr)
        live = []
        for i, x in enumerate(hit, 1):
            if i % 50 == 0:
                print(f'  …{i}/{len(hit)}', file=sys.stderr)
            try:
                good = reachable(x['line_id'], tok)
            except Exception:
                good = True      # 查不動時保守視為可推，寧可多送不要漏送
            (live if good else unreachable).append(x)
            time.sleep(0.05)
        hit = live

    # unreachable 已從 hit 移出，母數要加回來，否則覆蓋率會被高估
    matched = len(hit) + len(unreachable) + no_line
    print(f'符合標籤條件　　{matched:,} 位')
    print(f'  其中未綁 LINE　{no_line:,} 位（自動排除，無法推播）')
    print(f'  永久排除名單　　{excluded} 位（分銷帳號／本人）')
    if unreachable:
        lost = sum(x['spend'] for x in unreachable)
        print(f'  已封鎖／刪好友　{len(unreachable):,} 位（LINE 查無此好友，推不到）')
        print(f'                  這批累計消費 NT${lost:,.0f}，建議改走 Email 或請團主私訊')
    print(f'→ 實際送達　　　{len(hit):,} 位', end='')
    if matched:
        print(f'（覆蓋率 {len(hit)/matched*100:.1f}%）')
    else:
        print()
    if hit:
        tot = sum(x['spend'] for x in hit)
        print(f'   累計消費 NT${tot:,.0f}　人均 NT${tot/len(hit):,.0f}')
    print()

    q, cons = quota(tok)
    if q:
        used = (cons or {}).get('totalUsage')
        lim = q.get('value')
        print(f'本月額度　類型 {q.get("type")}'
              + (f'　上限 {lim:,} 則' if lim else '')
              + (f'　已用 {used:,} 則' if used is not None else ''))
        if lim and used is not None:
            left = lim - used
            print(f'　　　　　剩餘 {left:,} 則　本次需 {len(hit):,} 則'
                  + ('　⚠️ 額度不足' if len(hit) > left else '　✓ 足夠'))
        print()

    print('─' * 72)
    print('訊息內容：')
    print('─' * 72)
    if a.flex:
        c = messages[0]['contents']
        bubbles = c.get('contents', [c]) if c.get('type') == 'carousel' else [c]
        print(f'Flex 圖文卡　altText：{messages[0]["altText"]}')
        print(f'卡片數　{len(bubbles)} 張')
        for i, b in enumerate(bubbles, 1):
            hero = (b.get('hero') or {}).get('url', '（無圖）')
            btns = [x['action'].get('label') for x in (b.get('footer') or {}).get('contents', [])
                    if x.get('type') == 'button']
            print(f'  {i}. 圖 {hero}')
            print(f'     按鈕 {" ／ ".join(btns) if btns else "（無）"}')
    else:
        print(text)
    print('─' * 72)
    print()

    show = hit[:15]
    print(f'名單預覽（依累計消費排序，顯示前 {len(show)} 位）：')
    for i, x in enumerate(show, 1):
        print(f'  {i:>3}. {x["name"][:14]:<16}消費 NT${x["spend"]:>9,.0f}　{x["orders"]} 筆')
    if len(hit) > len(show):
        print(f'  …另有 {len(hit)-len(show):,} 位')
    print()

    os.makedirs(LOG_DIR, exist_ok=True)
    ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    slug = re.sub(r'[^\w\-]', '', (a.label or '_'.join(a.tag + a.any_tag)))[:40]
    logf = os.path.join(LOG_DIR, f'{ts}_{slug}.json')
    rec = {'time': ts, 'label': a.label, 'mode': 'send' if a.do else 'preview',
           'bot': info.get('premiumId') or info.get('basicId'),
           'tag': a.tag, 'any_tag': a.any_tag, 'exclude_tag': a.exclude_tag,
           'matched': matched, 'no_line': no_line, 'excluded': excluded,
           'unreachable': [{'id': x['id'], 'name': x['name']} for x in unreachable],
           'to_push': len(hit), 'message': text,
           'flex_file': a.flex, 'payload': messages,
           'recipients': [{'id': x['id'], 'name': x['name']} for x in hit],
           'batches': []}

    if not a.do:
        json.dump(rec, open(logf, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print('【預覽模式】沒有送出任何訊息。')
        print(f'名單已存：{logf}')
        print('確認無誤後，在原指令後面加上 --do 才會真的發送。')
        return

    if not hit:
        print('沒有可推播的對象，結束。')
        return

    print(f'⚠️  即將對 {len(hit):,} 位送出，5 秒後開始（Ctrl+C 可中止）…')
    time.sleep(5)

    ok = fail = 0
    for i in range(0, len(hit), BATCH):
        chunk = hit[i:i + BATCH]
        good, code, err = line_call('message/multicast',
                                    {'to': [x['line_id'] for x in chunk],
                                     'messages': messages}, tok)
        rec['batches'].append({'from': i + 1, 'to': i + len(chunk),
                               'ok': good, 'status': code, 'error': err})
        if good:
            ok += len(chunk)
            print(f'  ✓ 第 {i+1}–{i+len(chunk)} 位　送出成功')
        else:
            fail += len(chunk)
            print(f'  ✗ 第 {i+1}–{i+len(chunk)} 位　失敗 HTTP {code}：{err}')
        if i + BATCH < len(hit):
            time.sleep(1)

    rec['sent_ok'] = ok
    rec['sent_fail'] = fail
    json.dump(rec, open(logf, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print()
    print(f'完成：成功 {ok:,} 位／失敗 {fail:,} 位')
    print(f'執行紀錄：{logf}')


if __name__ == '__main__':
    main()
