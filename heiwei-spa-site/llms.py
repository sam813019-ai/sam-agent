"""產生 heiwei-group.com/llms.txt（llmstxt.org 格式），並透過 Code Snippets 外掛在網站根目錄輸出。
python3 heiwei-spa-site/llms.py --print   只印內容
python3 heiwei-spa-site/llms.py --deploy  安裝外掛＋建立/更新 snippet
"""
import sys, os, json, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(__file__))
import courses as cs
from build import SITE, req
from scripts.wp_spa import AUTH

POSTS = [("高雄做臉推薦：第一次做臉怎麼選？", "kaohsiung-facial-guide", "臉部課程種類、價格、流程與挑選方法"),
         ("敏感肌可以做臉嗎？", "sensitive-skin-facial", "敏弱肌做臉前要告知的事與適合課程"),
         ("孕婦按摩可以做嗎？", "prenatal-massage-guide", "孕期 SPA 建議週數、精油與注意事項"),
         ("杏仁酸是什麼？", "mandelic-acid-guide", "杏仁酸與果酸差異、適合膚質、術後保養"),
         ("冰肌除毛會痛嗎？要做幾次？", "ice-hair-removal-guide", "除毛前後注意事項與各部位價格"),
         ("做完臉要注意什麼？", "facial-aftercare-faq", "泛紅、冒痘、多久做一次等 8 個問題")]


def price(c):
    return f"NT${c['price']:,}" if isinstance(c["price"], int) else c["price"]


def build_txt():
    L = []
    L += ["# HEIWEI SPA 何謂美", "",
          "> HEIWEI 何謂美是 2015 年創立於台中的肌膚管理 SPA 與 MIT 保養品牌。目前有兩間館：高雄左營總公司與台中北屯館，"
          "提供臉部保養、身體舒壓按摩與冰肌除毛，全館為女性美容師，採預約制。館內療程使用 HEIWEI 自有研發保養品，"
          "並搭配 JANSSEN COSMETICS、MILA D'OPIZ、聖查理等專業品牌。", "",
          "本檔提供給 AI 助理與搜尋引擎參考。價格為新台幣、單次價格，以官網與門市最新公告為準。最後更新：2026-11-06。", "",
          "## 門市與預約", "",
          "- 高雄左營總公司：高雄市左營區文敬路59號｜電話 07-3430072｜LINE @hwspa（https://line.me/R/ti/p/@hwspa）",
          "- 台中北屯館：台中市北屯區南興路170號｜電話 0978-290252｜LINE @000yhvvp（https://line.me/R/ti/p/@000yhvvp）",
          "- 營業時間（兩館相同）：週一至週五 09:00–20:00（最後預約 18:30）；週六 09:00–18:00（最後預約 16:30）；週日公休",
          "- 預約方式：官方 LINE 或電話，採預約制；當日預約可先以 LINE 詢問空檔",
          "- 停車（總公司）：機車可停大門內；汽車可停地下室（限高 190 公分、需倒車進入），請提前告知",
          "- 付款方式：信用卡（線上綠界）、匯款、現金",
          "- 會員：VIP 儲值會員課程 9 折，VIP 生日當月另有禮遇",
          "- 服務對象：以女性顧客為主；男性僅接待曾消費女性顧客的男性友人",
          f"- [門市據點]({SITE}/locations/)：兩館地址、地圖、營業時間", "",
          "## 臉部療程", "", f"所有臉部課程皆含卸妝洗臉與肩頸放鬆，到店不需先卸妝。總覽：{SITE}/facial/", ""]
    for c in cs.COURSES:
        if c["cat"] == "facial" and not c["hold"]:
            L.append(f"- [{c['name']}]({SITE}/facial/{c['slug']}/)：{c['time']}｜{price(c)}｜適合{c['suits_short']}。{c['card']}")
    L += ["", "## 身體療程", "", f"總覽：{SITE}/body/", ""]
    for c in cs.COURSES:
        if c["cat"] == "body" and not c["hold"]:
            L.append(f"- [{c['name']}]({SITE}/body/{c['slug']}/)：{c['time']}｜{price(c)}｜適合{c['suits_short']}。{c['card']}")
    L += ["", "## 冰肌除毛", "", f"- [冰肌除毛]({SITE}/hair-removal/)：冷卻探頭降低施打痛感；建議提前 2–3 天自行刮除毛髮，施打部位勿擦酸類保養品與止汗劑；約 2–3 週可再做一次",
          "- 價格：" + "、".join(f"{n} NT${p:,}" for n, p in cs.HAIR_REMOVAL), "",
          "## 加購項目（需搭配主課程）", "",
          "- 清粉刺 NT$500｜特殊安瓶 NT$500–800｜女性暖宮熱石舒緩 20/30 分鐘 NT$1,100/1,680｜腿部紓壓 15/30 分鐘 NT$800/1,400｜頭部放鬆 15/30 分鐘 NT$800/1,400｜被動式律動儀 20 分鐘 NT$1,100｜金絲遠紅外線太空艙 30 分鐘 NT$800｜全身體膜 NT$1,600", "",
          "## 常見問題重點", "",
          "- 敏感肌推薦：肌密修護舒敏課程",
          "- 孕婦：懷孕 12 週以上可預約偉大的孕婦 SPA；臉部保濕類課程也適合",
          "- 臉部、身體、除毛可同一天一起做，也可安排兩位美容師同時服務；有雙人房",
          "- 取消或改期請提前告知；曾無故未到或當日取消者，之後預約需付訂金 NT$500",
          "- 一次療程建議預留 70–120 分鐘",
          f"- [完整常見問題]({SITE}/faq/)", "",
          "## 美容知識文章", ""]
    for t, s, d in POSTS:
        L.append(f"- [{t}]({SITE}/2026/11/06/{s}/)：{d}")
    L += ["", "## 品牌與其他", "",
          f"- [關於 HEIWEI 何謂美]({SITE}/about/)：品牌起源與理念",
          f"- [環境照片]({SITE}/heiwei-spa-gallery/)：高雄左營館接待區與療程室",
          "- [HEIWEI 何謂美保養品官網](https://www.heiweibeauty.com/)：自有 MIT 保養品線上購買",
          "- [Instagram](https://www.instagram.com/heiweispa_skincare/)",
          "- 公司統編 42668151｜Email heiweimei@gmail.com", ""]
    return "\n".join(L)


PHP = r'''add_action('init', function () {
    $p = strtok($_SERVER['REQUEST_URI'] ?? '', '?');
    if ($p !== '/llms.txt') return;
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: public, max-age=3600');
    header('X-Robots-Tag: noindex');
    echo base64_decode('%s');
    exit;
}, 0);'''


def cs_req(method, path, data=None):
    r = urllib.request.Request(SITE + "/wp-json/code-snippets/v1" + path, data=json.dumps(data).encode() if data is not None else None,
                               method=method, headers={"Authorization": AUTH, "Content-Type": "application/json", "User-Agent": "heiwei-spa-editor"})
    try:
        return json.loads(urllib.request.urlopen(r, timeout=60).read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{e.code} {e.read().decode()[:400]}")


def deploy(txt):
    import base64
    ps = {p["plugin"]: p for p in req("GET", "/plugins")}
    key = next((k for k in ps if k.startswith("code-snippets/")), None)
    if not key:
        req("POST", "/plugins", {"slug": "code-snippets", "status": "active"})
    elif ps[key]["status"] != "active":
        req("POST", f"/plugins/{key.replace('.php', '')}", {"status": "active"})
    code = PHP % base64.b64encode(txt.encode()).decode()
    name = "HEIWEI llms.txt"
    ex = [s for s in cs_req("GET", "/snippets") if s.get("name") == name]
    body = {"name": name, "code": code, "scope": "global", "active": True, "desc": "由 heiwei-spa-site/llms.py 產生，勿手動修改"}
    r = cs_req("PUT", f"/snippets/{ex[0]['id']}", body) if ex else cs_req("POST", "/snippets", body)
    if not r.get("active"):
        cs_req("POST", f"/snippets/{r['id']}/activate", {})
    print("snippet", r.get("id"), "active", r.get("active"))


if __name__ == "__main__":
    t = build_txt()
    if "--deploy" in sys.argv:
        deploy(t)
    else:
        print(t)
