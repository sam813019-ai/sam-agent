#!/usr/bin/env python3
"""依「訂單來源(一頁式商店)」批次為團購客戶加顧客標籤。

用法：
    python3 tag_groupbuy_customers.py --source-id 6a8d14e8d99f5b000a1876db \
        --tag 團購-品馨 --created-after 2026-08-26T00:00:00Z [--dry-run]

找 source_id：先跑 --list-sources，會列出期間內所有 order_source 與筆數。
標籤用 PATCH /v1/customers/{id}/tags + update_mode=add（累加，不會蓋掉舊標籤）。
"""
import argparse, json, re, sys, time, urllib.request, urllib.error

BASE = "https://open.shopline.io/v1"
ENV = "/Users/mac/Downloads/sam-agent/heiwei-review/.env.local"


def headers():
    env = open(ENV).read()
    token = re.search(r'SHOPLINE_ACCESS_TOKEN=["\']?([^"\'\n]+)', env).group(1).strip()
    return {"authorization": "Bearer " + token, "User-Agent": "HEIWEI-review",
            "Content-Type": "application/json"}


def api(url, H, data=None, method="GET"):
    req = urllib.request.Request(url, data=data, headers=H, method=method)
    return json.load(urllib.request.urlopen(req))


def fetch_orders(H, created_after):
    orders, prev = [], None
    while True:
        url = f"{BASE}/orders?per_page=250&created_after={created_after}"
        if prev:
            url += "&previous_id=" + prev
        items = api(url, H).get("items", [])
        orders += items
        if len(items) < 250:
            return orders
        prev = items[-1]["id"]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--created-after", required=True)
    p.add_argument("--source-id")
    p.add_argument("--tag")
    p.add_argument("--list-sources", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args()

    H = headers()
    orders = fetch_orders(H, a.created_after)
    print(f"期間內訂單 {len(orders)} 筆")

    if a.list_sources:
        from collections import Counter
        c = Counter()
        for o in orders:
            s = o.get("order_source") or {}
            c[(s.get("type"), s.get("source_id"), (s.get("name") or {}).get("zh-hant"))] += 1
        for k, v in c.most_common():
            print(v, k)
        return

    if not (a.source_id and a.tag):
        sys.exit("需要 --source-id 與 --tag（或用 --list-sources）")

    hit = [o for o in orders if (o.get("order_source") or {}).get("source_id") == a.source_id]
    ids = sorted({o["customer_id"] for o in hit if o.get("customer_id")})
    print(f"符合來源訂單 {len(hit)} 筆／不重複客戶 {len(ids)} 位")
    if a.dry_run:
        for o in sorted(hit, key=lambda x: x["created_at"]):
            print(o["order_number"], o["created_at"][:16], o.get("customer_name"), o["total"]["dollars"])
        return

    ok = fail = 0
    for cid in ids:
        body = json.dumps({"tags": [a.tag], "update_mode": "add"}).encode()
        try:
            api(f"{BASE}/customers/{cid}/tags", H, body, "PATCH")
        except urllib.error.HTTPError as e:
            print("FAIL", cid, e.code, e.read().decode()[:200]); fail += 1; continue
        time.sleep(0.2)
        c = api(f"{BASE}/customers/{cid}", H)
        if a.tag in (c.get("tags") or []):
            ok += 1; print("OK ", c.get("name"), c.get("tags"))
        else:
            fail += 1; print("FAIL(verify)", cid, c.get("tags"))
    print(f"\n成功 {ok}／失敗 {fail}")


if __name__ == "__main__":
    main()
