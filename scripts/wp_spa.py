"""HEIWEI SPA (heiwei-group.com) WordPress REST helper. Credentials: ~/.config/heiwei-spa/wp.env"""
import base64, json, os, urllib.request, urllib.error

def _env():
    d = {}
    for line in open(os.path.expanduser("~/.config/heiwei-spa/wp.env"), encoding="utf-8"):
        if "=" in line:
            k, v = line.rstrip("\n").split("=", 1)
            d[k] = v
    return d

E = _env()
BASE = E["WP_URL"].rstrip("/") + "/wp-json/wp/v2"
AUTH = "Basic " + base64.b64encode(f'{E["WP_USER"]}:{E["WP_APP_PASS"]}'.encode()).decode()

def req(method, path, data=None, raw=None, headers=None):
    h = {"Authorization": AUTH, "User-Agent": "heiwei-spa-editor"}
    body = None
    if raw is not None:
        body = raw
    elif data is not None:
        body = json.dumps(data).encode(); h["Content-Type"] = "application/json"
    h.update(headers or {})
    r = urllib.request.Request(BASE + path, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{e.code} {e.read().decode()[:500]}")

def upload_media(path, title=None):
    import mimetypes
    name = os.path.basename(path)
    mt = mimetypes.guess_type(path)[0] or "application/octet-stream"
    from urllib.parse import quote
    m = req("POST", "/media", raw=open(path, "rb").read(),
            headers={"Content-Type": mt, "Content-Disposition": f'attachment; filename="{quote(name)}"'})
    if title: req("POST", f"/media/{m['id']}", {"title": title, "alt_text": title})
    return m

if __name__ == "__main__":
    d = req("GET", "/users/me?context=edit")
    c = d.get("capabilities", {})
    print("user:", d["username"], "roles:", d.get("roles"))
    for k in ["edit_posts", "publish_posts", "edit_others_posts", "upload_files", "manage_categories", "edit_pages", "publish_pages"]:
        print(" ", k, c.get(k, False))
