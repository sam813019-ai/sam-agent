#!/usr/bin/env python3
"""部署 zhentai-test：備份 → 分塊 base64 上傳 → filesize 驗證 → purge edge cache。"""
import base64
import json
import os
import sys
import urllib.request

ENDPOINT = "https://waynebear20996-mlebi.wpcomstaging.com/wp-json/mcp/mcp-adapter-default-server"
USER, APP_PW = "sam813019", "ASN28lfIc7RF7pV74UBXru0R"
DEST = "/srv/htdocs/wp-content/uploads/zhentai-test"
HERE = os.path.dirname(os.path.abspath(__file__))
FILES = ["index.html", "products.html", "contact.html", "jt-ui.js", "jt-ui.css"]
BAK = ".bak-20260819"
CHUNK = 1_000_000
SESSION = {"id": None}


def call(method, params=None, notify=False):
    body = {"jsonrpc": "2.0", "method": method}
    if params is not None:
        body["params"] = params
    if not notify:
        body["id"] = 1
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(), method="POST")
    token = base64.b64encode(f"{USER}:{APP_PW}".encode()).decode()
    req.add_header("Authorization", f"Basic {token}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json, text/event-stream")
    if SESSION["id"]:
        req.add_header("mcp-session-id", SESSION["id"])
    with urllib.request.urlopen(req) as resp:
        if not SESSION["id"]:
            SESSION["id"] = resp.headers.get("mcp-session-id")
        raw = resp.read().decode()
    if notify:
        return None
    for line in raw.splitlines():
        if line.startswith("data:"):
            raw = line[5:].strip()
            break
    return json.loads(raw)


def php(code):
    r = call("tools/call", {
        "name": "mcp-adapter-execute-ability",
        "arguments": {"ability_name": "novamira/execute-php", "parameters": {"code": code}},
    })
    return r["result"]["structuredContent"]["data"]["output"]


def connect():
    call("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                        "clientInfo": {"name": "zhentai-deploy", "version": "1.0"}})
    call("notifications/initialized", notify=True)


def purge():
    return php('if (class_exists("Edge_Cache_Plugin")) '
               '{ Edge_Cache_Plugin::get_instance()->purge_domain_now("manual"); echo "purged"; } '
               'else { echo "no-plugin"; }')


def main():
    connect()

    print("— 備份原檔 —")
    for f in FILES:
        out = php(f'echo @copy("{DEST}/{f}", "{DEST}/{f}{BAK}") ? "ok" : "FAIL";')
        print(f"  {f}{BAK}: {out.strip()}")

    print("— 上傳 —")
    failed = []
    for f in FILES:
        local = os.path.join(HERE, f)
        data = base64.b64encode(open(local, "rb").read()).decode()
        tmp = f"{DEST}/.{f}.b64"
        php(f'@unlink("{tmp}"); echo "ok";')
        for i in range(0, len(data), CHUNK):
            php(f'file_put_contents("{tmp}", "{data[i:i + CHUNK]}", FILE_APPEND); echo "ok";')
        php(f'file_put_contents("{DEST}/{f}", base64_decode(file_get_contents("{tmp}"))); '
            f'@unlink("{tmp}"); echo "ok";')
        remote = php(f'echo filesize("{DEST}/{f}");').strip()
        want = os.path.getsize(local)
        ok = str(want) == remote
        print(f"  {f}: local={want} remote={remote} {'OK' if ok else 'MISMATCH'}")
        if not ok:
            failed.append(f)

    if failed:
        print(f"\n❌ filesize 不符：{', '.join(failed)} — 停止，未 purge cache")
        sys.exit(1)

    print("— purge edge cache —")
    print(" ", purge())
    print("\n✅ 部署完成")


if __name__ == "__main__":
    main()
