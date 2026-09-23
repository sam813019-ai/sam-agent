#!/usr/bin/env python3
# Novamira MCP execute-php 用戶端（JSON-RPC over HTTP）
import json, base64, urllib.request, urllib.error

ENDPOINT = "https://waynebear20996-mlebi.wpcomstaging.com/wp-json/mcp/mcp-adapter-default-server"
USER = "sam813019"
APP_PW = "ASN28lfIc7RF7pV74UBXru0R"
_AUTH = "Basic " + base64.b64encode(f"{USER}:{APP_PW}".encode()).decode()
_session = None

def _post(payload, want_json=True):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(ENDPOINT, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json, text/event-stream")
    req.add_header("Authorization", _AUTH)
    if _session:
        req.add_header("mcp-session-id", _session)
    resp = urllib.request.urlopen(req, timeout=180)
    sid = resp.headers.get("mcp-session-id")
    body = resp.read().decode()
    # 可能是 SSE 格式（data: {...}）
    if body.startswith("event:") or "\ndata:" in body or body.startswith("data:"):
        for line in body.splitlines():
            if line.startswith("data:"):
                body = line[5:].strip(); break
    out = json.loads(body) if want_json and body.strip() else None
    return out, sid

def init():
    global _session
    out, sid = _post({"jsonrpc":"2.0","id":1,"method":"initialize",
        "params":{"protocolVersion":"2024-11-05","capabilities":{},
                  "clientInfo":{"name":"jt360","version":"1.0"}}})
    _session = sid
    _post({"jsonrpc":"2.0","method":"notifications/initialized"}, want_json=False)
    return out

def php(code):
    out, _ = _post({"jsonrpc":"2.0","id":99,"method":"tools/call",
        "params":{"name":"mcp-adapter-execute-ability",
                  "arguments":{"ability_name":"novamira/execute-php",
                               "parameters":{"code":code}}}})
    return out

if __name__ == "__main__":
    print("init:", json.dumps(init())[:200])
    r = php("echo wp_upload_dir()['basedir'];")
    print("php:", json.dumps(r)[:500])
