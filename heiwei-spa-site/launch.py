"""一鍵上線（使用者確認草稿後才執行）。
python3 heiwei-spa-site/launch.py --dry   只列出會做的事
python3 heiwei-spa-site/launch.py --go    正式執行
備份：docs/heiwei-spa/pages_backup_20261106.json、global_styles_backup_20261106.json；本腳本執行前另存選單／頁尾／設定。
"""
import json, sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
from build import req, SITE
import courses as cs

GO = "--go" in sys.argv
BK = os.path.join(os.path.dirname(__file__), "..", "docs/heiwei-spa")

OLD_TO_NEW = {  # 舊頁 id → 新路徑
    69: "/facial/aquatic-hydrating-facial/", 127: "/facial/sothys-hydra-elastic-facial/", 132: "/facial/almond-acid-facial/",
    137: "/facial/seaweed-micro-crystal-facial/", 144: "/facial/gua-sha-brightening-facial/", 166: "/facial/micro-current-v-face-facial/",
    172: "/facial/hw-memory-mask-facial/", 181: "/facial/nano-hydrogen-bubble-facial/", 185: "/facial/", 169: "/facial/", 495: "/facial/",
    190: "/body/chest-back-relaxing-massage/", 193: "/body/full-body-relaxing-massage/", 197: "/body/lymphatic-circulation-massage/",
    200: "/body/g5-body-sculpting-massage/", 204: "/body/full-body-scrub/", 208: "/body/back-hip-cleansing-care/", 213: "/body/bust-care/",
    216: "/body/prenatal-spa/", 260: "/locations/", 1: "/about/", 3: "/",
}


FROM = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--from=")), None)
_started = [FROM is None]


def step(msg, fn):
    if not _started[0] and FROM in msg:
        _started[0] = True
    if not _started[0]:
        print("  (略過) " + msg); return
    print(("▶ " if GO else "· ") + msg)
    if GO:
        return fn()


def main():
    old = {p["id"]: p for p in json.load(open(os.path.join(BK, "pages_backup_20261106.json")))}
    drafts = {p["slug"]: p for p in req("GET", "/pages?status=any&per_page=100&context=edit")}
    nav = req("GET", "/navigation/7?context=edit")
    foot = req("GET", "/template-parts/attar//footer?context=edit")
    sett = req("GET", "/settings")
    if GO:
        json.dump({"nav": nav["content"]["raw"], "footer": foot["content"]["raw"], "settings": sett, "home712": req("GET", "/pages/712?context=edit")},
                  open(os.path.join(BK, f"prelaunch_backup_{time.strftime('%Y%m%d_%H%M')}.json"), "w"), ensure_ascii=False)

    # 1. 轉址外掛
    def plugin():
        ps = {p["plugin"]: p for p in req("GET", "/plugins")}
        if "redirection/redirection" not in ps:
            req("POST", "/plugins", {"slug": "redirection", "status": "active"})
        elif ps["redirection/redirection"]["status"] != "active":
            req("POST", "/plugins/redirection/redirection", {"status": "active"})
    step("安裝並啟用 Redirection 轉址外掛", plugin)

    # 2. 發布新頁（總覽頁先發，子頁網址才會正確）
    order = ["facial", "body"] + [c["slug"] for c in cs.COURSES if not c["hold"]] + ["hair-removal", "about", "locations", "faq"]
    for s in order:
        step(f"發布 /{s}/ （{drafts[s]['title']['raw']}）", lambda s=s: req("POST", f"/pages/{drafts[s]['id']}", {"status": "publish"}))

    # 3. 首頁換新內容（保留 712 這個 id，仍是網站首頁）
    h = drafts.get("home-2026", {"id": 0, "content": {"raw": ""}})
    step("首頁（712）換成新版內容＋SEO 標題描述", lambda: req("POST", "/pages/712", {"content": h["content"]["raw"], "meta": {
        "jetpack_seo_html_title": "HEIWEI SPA 何謂美｜高雄左營・台中北屯 肌膚管理 SPA、做臉、身體按摩、除毛",
        "advanced_seo_description": "HEIWEI SPA 何謂美，2015 年創立的肌膚管理 SPA 與 MIT 保養品牌。高雄左營總公司、台中北屯館提供臉部保養、敏感肌舒緩、精油身體按摩、孕婦 SPA 與冰肌除毛。LINE @hwspa 預約。"}}))
    step("刪除首頁預覽草稿", lambda: req("DELETE", f"/pages/{h['id']}?force=true"))

    # 4. 舊頁轉址＋移到垃圾桶（可還原）
    def redirects():
        for pid, new in OLD_TO_NEW.items():
            src = old[pid]["link"].replace(SITE, "")
            from urllib.parse import unquote
            for u in {src, unquote(src)}:
                req_r("POST", "/redirect", {"url": u, "action_data": {"url": SITE + new}, "action_type": "url", "action_code": 301,
                                           "match_type": "url", "group_id": 1, "regex": False})
            req("DELETE", f"/pages/{pid}")
    step(f"{len(OLD_TO_NEW)} 個舊頁設 301 轉址並移到垃圾桶", redirects)
    step("DM 頁（662）設為不被搜尋引擎索引", lambda: req("POST", "/pages/662", {"meta": {"jetpack_seo_noindex": True}}))
    step("空白草稿文章 245、Hello World 文章移到垃圾桶", lambda: (req("DELETE", "/posts/245"), req("DELETE", "/posts/2")))

    # 5. 選單
    def L(label, url): return f'<!-- wp:navigation-link {{"label":"{label}","url":"{url}","kind":"custom"}} /-->'
    def SUB(label, url, kids): return (f'<!-- wp:navigation-submenu {{"label":"{label}","url":"{url}","kind":"custom"}} -->'
                                       + "".join(kids) + '<!-- /wp:navigation-submenu -->')
    fc = [c for c in cs.COURSES if c["cat"] == "facial" and not c["hold"]]
    bc = [c for c in cs.COURSES if c["cat"] == "body" and not c["hold"]]
    menu = "\n".join([
        L("首頁", SITE + "/"),
        SUB("臉部療程", SITE + "/facial/", [L("全部臉部療程", SITE + "/facial/")] + [L(c["name"], f"{SITE}/facial/{c['slug']}/") for c in fc]),
        SUB("身體療程", SITE + "/body/", [L("全部身體療程", SITE + "/body/")] + [L(c["name"], f"{SITE}/body/{c['slug']}/") for c in bc]),
        L("冰肌除毛", SITE + "/hair-removal/"),
        L("關於我們", SITE + "/about/"),
        L("環境", SITE + "/heiwei-spa-gallery/"),
        L("門市據點", SITE + "/locations/"),
        L("常見問題", SITE + "/faq/"),
        L("保養品", "https://www.heiweibeauty.com/"),
    ])
    step("更新主選單（9 項，課程收在下拉）", lambda: req("POST", "/navigation/7", {"content": menu}))

    # 6. 頁尾
    footer = f"""<!-- wp:html -->
<div class="hwx alignfull" style="background:#f4ebe3;margin-top:0"><div class="hwx-wrap" style="padding-top:56px;padding-bottom:30px">
<div class="hwx-cards" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
<div><h3 style="font-size:18px;margin-bottom:10px">HEIWEI SPA 何謂美</h3><p style="font-size:14px">2015 年創立的肌膚管理 SPA 與 MIT 保養品牌。</p>
<p style="font-size:14px"><a href="https://line.me/R/ti/p/@hwspa">LINE @hwspa</a>・<a href="https://www.instagram.com/heiweispa_skincare/">Instagram</a>・<a href="https://www.heiweibeauty.com/">保養品官網</a></p></div>
<div><h3 style="font-size:18px;margin-bottom:10px">高雄左營總公司</h3><p style="font-size:14px">高雄市左營區文敬路59號<br><a href="tel:073430072">07-3430072</a><br>週一至五 09:00–20:00・週六 09:00–18:00・週日公休<br><a href="https://line.me/R/ti/p/@hwspa">LINE @hwspa</a></p></div>
<div><h3 style="font-size:18px;margin-bottom:10px">台中北屯館</h3><p style="font-size:14px">台中市北屯區南興路170號<br><a href="tel:0978290252">0978-290252</a><br>週一至五 09:00–20:00・週六 09:00–18:00・週日公休<br><a href="https://line.me/R/ti/p/@000yhvvp">LINE @000yhvvp</a></p></div>
<div><h3 style="font-size:18px;margin-bottom:10px">療程</h3><p style="font-size:14px"><a href="{SITE}/facial/">臉部療程</a><br><a href="{SITE}/body/">身體療程</a><br><a href="{SITE}/hair-removal/">冰肌除毛</a><br><a href="{SITE}/faq/">常見問題</a></p></div>
</div>
<p style="font-size:12px;text-align:center;margin-top:30px">© HEIWEI 何謂美・統編 42668151・heiweimei@gmail.com</p>
</div></div>
<!-- /wp:html -->"""
    step("更新頁尾（兩館資訊＋療程連結）", lambda: req("POST", "/template-parts/attar//footer", {"content": footer}))

    # 7. 網站標題
    step("網站標題／副標題", lambda: req("POST", "/settings", {"title": "HEIWEI SPA 何謂美", "description": "高雄・台中肌膚管理 SPA｜臉部保養、身體舒壓、冰肌除毛"}))

    # 8. 環境頁圖片 alt
    def gallery_alt():
        import re
        raw = old[601]["content"]["raw"]; n = [0]
        def f(m):
            n[0] += 1
            return m.group(0).replace('alt=""', f'alt="HEIWEI SPA 高雄左營館環境照 {n[0]}"')
        req("POST", "/pages/601", {"content": re.sub(r'<img [^>]*alt=""[^>]*>', f, raw), "title": "SPA 館環境",
                                   "meta": {"jetpack_seo_html_title": "HEIWEI SPA 環境照片｜高雄左營館接待區與療程室",
                                            "advanced_seo_description": "看看 HEIWEI SPA 高雄左營館的接待大廳、等候區與獨立療程室，明亮安靜的空間，讓每次到訪都是放鬆時光。"}})
    step("環境頁 19 張圖補 alt＋SEO 描述", gallery_alt)
    print("完成" if GO else "（預覽模式，未執行）")


def req_r(method, path, data):
    import urllib.request, base64
    from scripts.wp_spa import AUTH
    r = urllib.request.Request(SITE + "/wp-json/redirection/v1" + path, data=json.dumps(data).encode(), method=method,
                               headers={"Authorization": AUTH, "Content-Type": "application/json", "User-Agent": "heiwei-spa-editor"})
    return json.loads(urllib.request.urlopen(r, timeout=60).read().decode())


if __name__ == "__main__":
    main()
