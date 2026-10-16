#!/usr/bin/env python3
"""把領取型優惠券的 promotion_id 填進 Flex 卡片。

Shopline 的領券連結長這樣：
    https://www.heiweibeauty.com/get_coupon/<promotion_id>
未登入點擊會被轉到登入頁，且 promotion_id 會被帶著走，登入完成即自動領券。
所以「要登入才領得到」本身就是閘門——不需要另外驗證綁定，也不需要發代碼。

用法：
  python3 set_claim_link.py --code BIND100          # 用折扣碼查
  python3 set_claim_link.py --title 綁定禮           # 用促銷標題查
  python3 set_claim_link.py --id 6ad0...             # 直接指定 id

⚠️ 券必須先在 Shopline 後台建好（選「透過連結或顧客分群發送」的領取型優惠券）。
"""
import argparse, io, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', 'scripts', 'shopline'))
import sl_api as S

SHOP = 'https://www.heiweibeauty.com'
FLEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cards', 'bind100.flex.json')


def find(code=None, title=None):
    for p in S.get_promotions():
        if code and any(str(c).strip().lower() == code.lower() for c in (p.get('codes') or [])):
            return p
        t = (p.get('title_translations') or {}).get('zh-hant') or ''
        if title and title in t:
            return p
    return None


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--code'); g.add_argument('--title'); g.add_argument('--id')
    ap.add_argument('--flex', default=FLEX)
    a = ap.parse_args()

    if a.id:
        pid, name = a.id, '(直接指定)'
    else:
        print('查詢促銷中…', file=sys.stderr)
        p = find(a.code, a.title)
        if not p:
            raise SystemExit(f'找不到促銷（code={a.code} title={a.title}）——後台建好了嗎？')
        pid = str(p.get('_id') or p.get('id'))
        name = (p.get('title_translations') or {}).get('zh-hant') or '(無標題)'

    link = f'{SHOP}/get_coupon/{pid}'
    s = io.open(a.flex, encoding='utf-8').read()
    n = s.count('__PROMOTION_ID__')
    if n:
        s = s.replace('__PROMOTION_ID__', pid)
    else:
        import re
        s, n = re.subn(r'https://www\.heiweibeauty\.com/get_coupon/[0-9a-zA-Z]+', link, s)
    io.open(a.flex, 'w', encoding='utf-8').write(s)

    print('=' * 56)
    print(f'促銷　　{name}')
    print(f'ID　　　{pid}')
    print(f'領券連結 {link}')
    print(f'已更新　{os.path.basename(a.flex)}（{n} 處）')
    print('=' * 56)
    print('這條連結可以放進：Email 內文、LINE 加入好友歡迎訊息、關鍵字自動回應。')
    print('⚠️ 請先自己登出後實測一次：點連結 → 用 LINE 登入 → 確認會員中心有這張券。')


if __name__ == '__main__':
    main()
