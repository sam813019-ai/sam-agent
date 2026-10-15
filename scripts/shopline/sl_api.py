"""Shopline Admin Open API 共用連線層（含重試、分頁、本機快取）。

其他腳本用法：
    from sl_api import iter_orders, get_promotions, fmt
    for o in iter_orders('2026-09-01','2026-09-30'): ...
"""
import json, os, time, urllib.request, urllib.parse, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV  = os.path.join(ROOT, 'heiwei-review', '.env.local')
BASE = 'https://open.shopline.io/v1'
CACHE_DIR = os.path.join(ROOT, 'data', '.sl_cache')


def token():
    for line in open(ENV, encoding='utf-8'):
        if line.startswith('SHOPLINE_ACCESS_TOKEN='):
            return line.strip().split('=', 1)[1].strip().strip('"')
    raise SystemExit(f'找不到 SHOPLINE_ACCESS_TOKEN（{ENV}）')


_TOK = None
def _get(path, tries=5, **params):
    """單次 GET，逾時或 5xx 會指數退避重試。"""
    global _TOK
    if _TOK is None:
        _TOK = token()
    url = f'{BASE}/{path}?' + urllib.parse.urlencode(params)
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + _TOK})
            return json.load(urllib.request.urlopen(req, timeout=180))
        except Exception as e:
            last = e
            wait = 2 ** i
            print(f'    ⟳ 重試 {i+1}/{tries}（{type(e).__name__}），{wait}s 後再試', file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError(f'{path} 連續 {tries} 次失敗：{last}')


def _tw_to_utc(d, end=False):
    """'2026-09-01' → UTC ISO。台灣 UTC+8，故當地 00:00 = 前一日 16:00Z。"""
    if 'T' in d:
        return d
    y, m, dd = (int(x) for x in d.split('-'))
    import datetime
    t = datetime.datetime(y, m, dd)
    if end:
        t += datetime.timedelta(days=1)
    t -= datetime.timedelta(hours=8)
    return t.strftime('%Y-%m-%dT%H:%M:%SZ')


def iter_orders(start, end, use_cache=True, quiet=False):
    """逐筆產出期間內訂單（台灣日期，含頭含尾）。結果依月份快取於 data/.sl_cache/。"""
    a, b = _tw_to_utc(start), _tw_to_utc(end, end=True)
    key = f'orders_{a[:10]}_{b[:10]}.json'.replace(':', '')
    path = os.path.join(CACHE_DIR, key)
    if use_cache and os.path.exists(path):
        if not quiet:
            print(f'  （快取）{key}', file=sys.stderr)
        for o in json.load(open(path, encoding='utf-8')):
            yield o
        return
    out, page = [], 1
    while page <= 400:
        d = _get('orders', per_page=250, page=page, created_after=a, created_before=b)
        items = d.get('items') or d.get('data') or []
        if not items:
            break
        out += items
        if not quiet and page % 5 == 0:
            print(f'    …已取 {len(out)} 筆', file=sys.stderr)
        page += 1
    if use_cache:
        os.makedirs(CACHE_DIR, exist_ok=True)
        json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    for o in out:
        yield o


def get_promotions():
    """取回全部促銷活動。"""
    out, page = [], 1
    while page <= 20:
        d = _get('promotions', per_page=50, page=page)
        items = d.get('items') or d.get('data') or []
        if not items:
            break
        out += items
        page += 1
    return out


def get_delivery_name(did, _c={}):
    if did in _c:
        return _c[did]
    try:
        d = _get('delivery_options/' + did, tries=2)
        o = d.get('item') or d.get('data') or d
        _c[did] = (o.get('name_translations') or {}).get('zh-hant') or did
    except Exception:
        _c[did] = did
    return _c[did]


# ── 訂單欄位存取（Shopline 欄位藏得深，集中在這裡） ──
def amount(o):
    return float((o.get('total') or {}).get('dollars', 0))

def is_cancelled(o):
    return (o.get('status') or '') == 'cancelled'

def delivery_id(o):
    return (o.get('order_delivery') or {}).get('delivery_option_id')

def delivery_name(o):
    return ((o.get('order_delivery') or {}).get('name_translations') or {}).get('zh-hant') or '?'

def source_type(o):
    return (o.get('order_source') or {}).get('type') or '?'

def source_name(o):
    return ((o.get('order_source') or {}).get('name') or {}).get('zh-hant') or ''

def customer_id(o):
    return o.get('customer_id') or (o.get('customer') or {}).get('id')

def created_date(o):
    return (o.get('created_at') or '')[:10]

def gift_promo_ids(o):
    """此訂單實際觸發的贈品活動 ID 清單。"""
    return [(x.get('item_data') or {}).get('promotion_id')
            for x in (o.get('subtotal_items') or [])
            if x.get('item_type') == 'Gift' and (x.get('item_data') or {}).get('promotion_id')]

def promo_title(pr):
    t = pr.get('title_translations') or {}
    return t.get('zh-hant') or t.get('en') or '(未命名)'

def fmt(n):
    return f'{n:,.0f}'
