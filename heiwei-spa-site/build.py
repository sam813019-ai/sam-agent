"""HEIWEI SPA 改版頁面產生器：courses.py 的資料 → WordPress 頁面內容（Custom HTML 區塊＋JSON-LD）"""
import json, html, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from scripts.wp_spa import req

SITE = "https://heiwei-group.com"
LINE_HQ = "https://line.me/R/ti/p/@hwspa"
TEL_HQ = "07-3430072"
SPA_ID = SITE + "/#dayspa"
CAT = {"facial": ("臉部療程", "FACIAL CARE", "/facial/"), "body": ("身體療程", "BODY CARE", "/body/")}

ADDONS = [
    ("清粉刺", "—", "NT$500"),
    ("特殊安瓶（依膚況挑選）", "—", "NT$500–800"),
    ("女性暖宮熱石舒緩", "20／30 分鐘", "NT$1,100／1,680"),
    ("腿部紓壓", "15／30 分鐘", "NT$800／1,400"),
    ("頭部放鬆", "15／30 分鐘", "NT$800／1,400"),
    ("被動式律動儀", "20 分鐘", "NT$1,100"),
    ("金絲遠紅外線太空艙", "30 分鐘", "NT$800"),
    ("全身體膜", "—", "NT$1,600"),
]

e = html.escape


def course_url(c):
    return f"{SITE}{CAT[c['cat']][2]}{c['slug']}/"


def buttons(extra_ghost=True):
    b = f'<a class="hwx-btn" href="{LINE_HQ}" target="_blank" rel="noopener">LINE 預約 @hwspa</a>'
    if extra_ghost:
        b += f'<a class="hwx-btn ghost" href="tel:{TEL_HQ.replace("-", "")}">來電 {TEL_HQ}</a>'
    return f'<div class="hwx-btns">{b}</div>'


def course_page(c, all_courses):
    cn, ck, cpath = CAT[c["cat"]]
    price = f"NT${c['price']:,}" if isinstance(c["price"], int) else c["price"]
    facts = "".join(f"<li><b>{k}</b>{e(v)}</li>" for k, v in [("時間", c["time"]), ("價格", price), ("適合", c["suits_short"])])
    who = "".join(f"<li>{e(x)}</li>" for x in c["who"])
    steps = "".join(f"<li>{e(s[0])}" + (f"<small>{e(s[1])}</small>" if s[1] else "") + "</li>" for s in c["steps"])
    feats = "".join(f'<div class="hwx-card"><div class="no">{i+1:02d}</div><h3>{e(t)}</h3><p>{e(d)}</p></div>' for i, (t, d) in enumerate(c["features"]))
    faqs = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in c["faq"])
    addons = "".join(f'<tr><td>{e(n)}</td><td>{e(t)}</td><td class="p">{e(p)}</td></tr>' for n, t, p in ADDONS)
    rel = [x for x in all_courses if x["slug"] in c.get("related", []) and not x.get("hold")]
    relh = "".join(
        f'<a class="hwx-course" href="{course_url(x)}"><h3>{e(x["name"])}</h3><p>{e(x["card"])}</p>'
        f'<span class="meta">{e(x["time"])}・{("NT$%s" % format(x["price"], ",")) if isinstance(x["price"], int) else e(x["price"])}</span></a>'
        for x in rel)
    body = f"""
<div class="hwx alignfull">
<section class="hwx-hero"><div class="hwx-wrap">
<nav class="hwx-bc" aria-label="麵包屑"><a href="{SITE}/">首頁</a><span>›</span><a href="{SITE}{cpath}">{cn}</a><span>›</span>{e(c['name'])}</nav>
<div class="hwx-grid"><div>
<div class="hwx-kicker">{ck}</div>
<h1>{e(c['name'])}</h1>
<p class="hwx-lead">{e(c['lead'])}</p>
<ul class="hwx-facts">{facts}</ul>
{buttons()}
</div>
<div class="hwx-hero-img"><img src="{c['img']}" alt="{e(c['img_alt'])}" width="1200" height="800" loading="eager"></div>
</div></div></section>

<section class="hwx-sec"><div class="hwx-wrap hwx-two">
<div><div class="hwx-kicker">ABOUT</div><h2>{e(c['about_h'])}</h2></div>
<div>{''.join(f'<p>{e(p)}</p>' for p in c['about'])}</div>
</div></section>

<section class="hwx-sec alt"><div class="hwx-wrap hwx-two">
<div><div class="hwx-kicker">FOR YOU</div><h2>這堂課適合誰</h2><p style="margin-top:14px">{e(c['who_note'])}</p></div>
<ul class="hwx-check">{who}</ul>
</div></section>

<section class="hwx-sec"><div class="hwx-wrap">
<div class="hwx-head"><div class="hwx-kicker">FEATURES</div><h2>課程特色</h2></div>
<div class="hwx-cards">{feats}</div>
</div></section>

<section class="hwx-sec alt"><div class="hwx-wrap">
<div class="hwx-head"><div class="hwx-kicker">PROCESS</div><h2>療程流程・{e(c['time'])}</h2>
<p class="hwx-lead">{'臉部課程皆包含卸妝洗臉與肩頸放鬆，到店前不需要先卸妝。' if c['cat']=='facial' else '實際流程會依你當天的身體狀況微調，有任何不舒服都可以隨時告訴美容師。'}</p></div>
<ol class="hwx-steps">{steps}</ol>
</div></section>

<section class="hwx-sec"><div class="hwx-wrap">
<div class="hwx-head"><div class="hwx-kicker">ADD-ON</div><h2>加購項目</h2>
<p class="hwx-lead">加購項目需搭配主課程，預約時先告知，美容師會為你保留時間。</p></div>
<table class="hwx-table"><thead><tr><th>項目</th><th>時間</th><th>價格</th></tr></thead><tbody>{addons}</tbody></table>
</div></section>

<section class="hwx-sec alt"><div class="hwx-wrap">
<div class="hwx-head"><div class="hwx-kicker">FAQ</div><h2>{e(c['name'])}常見問題</h2></div>
<div class="hwx-faq">{faqs}</div>
<div class="hwx-note" style="margin-top:24px"><b>預約小提醒：</b>本館採預約制；若需改期請提前告知。療程感受與維持時間因個人膚況與居家保養習慣而異，到店後美容師會先了解你的肌膚狀態再進行。</div>
</div></section>

{f'<section class="hwx-sec"><div class="hwx-wrap"><div class="hwx-head"><div class="hwx-kicker">MORE</div><h2>你可能也喜歡</h2></div><div class="hwx-courses">{relh}</div></div></section>' if relh else ''}

<section class="hwx-sec" style="padding-top:0"><div class="hwx-wrap"><div class="hwx-cta">
<div class="hwx-kicker" style="color:rgba(255,255,255,.75)">RESERVATION</div>
<h2>預約{e(c['name'])}</h2>
<p style="margin-top:12px">HEIWEI SPA 總公司・高雄市左營區文敬路59號・週一至五 09:00–20:00・週六 09:00–18:00</p>
{buttons()}
</div></div></section>
</div>"""
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "首頁", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": cn, "item": SITE + cpath},
                {"@type": "ListItem", "position": 3, "name": c["name"], "item": course_url(c)}]},
            {"@type": "Service", "@id": course_url(c) + "#service", "name": c["name"], "serviceType": cn,
             "description": c["lead"], "url": course_url(c), "image": c["img"],
             "provider": {"@id": SPA_ID}, "areaServed": {"@type": "City", "name": "高雄市"},
             **({"offers": {"@type": "Offer", "price": c["price"], "priceCurrency": "TWD", "availability": "https://schema.org/InStock"}} if isinstance(c["price"], int) else {})},
            {"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in c["faq"]]},
        ]}
    script = '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>"
    return f'<!-- wp:html -->\n{body}\n{script}\n<!-- /wp:html -->'


def upsert_page(slug, title, content, parent=0, status="draft", seo_title="", seo_desc="", template=""):
    found = req("GET", f"/pages?slug={slug}&status=any&context=edit")
    data = {"title": title, "slug": slug, "content": content, "parent": parent, "status": status, "template": template,
            "meta": {"jetpack_seo_html_title": seo_title, "advanced_seo_description": seo_desc}}
    if found:
        return req("POST", f"/pages/{found[0]['id']}", data)
    return req("POST", "/pages", data)


def price_str(x):
    return f"NT${x['price']:,}" if isinstance(x["price"], int) else x["price"]


def course_cards(cs):
    return "".join(
        f'<a class="hwx-course" href="{course_url(x)}"><h3>{e(x["name"])}</h3><p>{e(x["card"])}</p>'
        f'<span class="meta">{e(x["time"])}・{e(price_str(x))}</span></a>' for x in cs)


def wrap(body, ld):
    return ('<!-- wp:html -->\n<div class="hwx alignfull">' + body + '</div>\n<script type="application/ld+json">'
            + json.dumps(ld, ensure_ascii=False) + '</script>\n<!-- /wp:html -->')


def cta(title="預約你的療程", sub="HEIWEI SPA 總公司・高雄市左營區文敬路59號・週一至五 09:00–20:00・週六 09:00–18:00"):
    return f"""<section class="hwx-sec"><div class="hwx-wrap"><div class="hwx-cta">
<div class="hwx-kicker" style="color:rgba(255,255,255,.75)">RESERVATION</div><h2>{e(title)}</h2>
<p style="margin-top:12px">{e(sub)}</p>{buttons()}</div></div></section>"""


def hero(kicker, h1, lead, img, alt, crumbs):
    bc = f'<a href="{SITE}/">首頁</a>' + "".join(f'<span>›</span>{e(n)}' if not u else f'<span>›</span><a href="{u}">{e(n)}</a>' for n, u in crumbs)
    return f"""<section class="hwx-hero"><div class="hwx-wrap"><nav class="hwx-bc" aria-label="麵包屑">{bc}</nav>
<div class="hwx-grid"><div><div class="hwx-kicker">{kicker}</div><h1>{e(h1)}</h1><p class="hwx-lead">{e(lead)}</p>{buttons()}</div>
<div class="hwx-hero-img"><img src="{img}" alt="{e(alt)}" width="1200" height="800" loading="eager"></div></div></div></section>"""


def bc_ld(items):
    return {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}


def hub_page(cat, courses, intro, extra_html=""):
    cn, ck, cpath = CAT[cat]
    cs = [x for x in courses if x["cat"] == cat and not x.get("hold")]
    body = hero(ck, f"高雄{cn}｜HEIWEI SPA", intro[0], intro[1], intro[2], [(cn, "")])
    body += f"""<section class="hwx-sec"><div class="hwx-wrap"><div class="hwx-head"><div class="hwx-kicker">ALL COURSES</div>
<h2>全部{cn}・共 {len(cs)} 堂</h2><p class="hwx-lead">{e(intro[3])}</p></div><div class="hwx-courses">{course_cards(cs)}</div></div></section>"""
    body += extra_html + cta(f"不知道選哪一堂？", "LINE 告訴我們你的需求，美容師會幫你推薦適合的課程。")
    ld = {"@context": "https://schema.org", "@graph": [bc_ld([("首頁", SITE + "/"), (cn, SITE + cpath)]),
          {"@type": "ItemList", "name": f"HEIWEI SPA {cn}", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": course_url(x), "name": x["name"]} for i, x in enumerate(cs)]}]}
    return wrap(body, ld)


def hair_page(items, img):
    rows = "".join(f'<tr><td>{e(n)}</td><td class="p">NT${p:,}</td></tr>' for n, p in items)
    faq = [("冰肌除毛跟雷射除毛有什麼不同？", "冰肌除毛的探頭具有冷卻功能，施打過程可以降低疼痛感；效果因人而異，與毛髮粗細有關。"),
           ("要做幾次？", "因人而異（與毛髮粗細度有關），毛髮長出來就可以回來做，生長週期會慢慢拉長。"),
           ("除毛前需要自己先剃毛嗎？", "建議提前 2～3 天先自行刮除，效果會更好。"),
           ("除毛前有什麼禁忌？", "施打部位請勿擦含酸類的保養品與止汗劑。"),
           ("除毛過程會痛嗎？", "痛感因人而異；冰肌探頭具冷卻功能，可以降低施打時的痛感。"),
           ("除完毛會紅腫嗎？", "遇到黑色的地方（例如痣）可能會有些微紅腫，通常半天內就會消退。"),
           ("比基尼線和 VIO 全除差在哪？", "比基尼線是針對部分區域；VIO 是全除，想要更乾淨建議選全除。"),
           ("多久做一次？", "大約 2～3 週，毛髮長出來就可以回來做。"),
           ("男生可以做嗎？", "目前只接待曾經消費過的女性顧客的男性友人。")]
    body = hero("HAIR REMOVAL", "冰肌除毛｜高雄 HEIWEI SPA",
                "冰肌除毛的探頭具有冷卻功能，施打時可以降低疼痛感。唇周、腋下到 VIO 共 9 個部位，價格透明，也可以和臉部、身體課程同一天一起做。",
                img, "HEIWEI SPA 冰肌除毛療程室", [("冰肌除毛", "")])
    body += f"""<section class="hwx-sec"><div class="hwx-wrap hwx-two"><div><div class="hwx-kicker">PRICE</div><h2>部位與價格</h2>
<p style="margin-top:14px">以下為單次價格。施打前美容師會確認部位與膚況。</p>
<div class="hwx-note" style="margin-top:20px"><b>除毛前提醒：</b>建議提前 2～3 天自行刮除毛髮；施打部位請勿擦含酸類保養品與止汗劑。</div></div>
<table class="hwx-table"><thead><tr><th>部位</th><th>單次價格</th></tr></thead><tbody>{rows}</tbody></table></div></section>
<section class="hwx-sec alt"><div class="hwx-wrap"><div class="hwx-head"><div class="hwx-kicker">FAQ</div><h2>冰肌除毛常見問題</h2></div>
<div class="hwx-faq">{"".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in faq)}</div></div></section>"""
    body += cta("預約冰肌除毛")
    url = SITE + "/hair-removal/"
    ld = {"@context": "https://schema.org", "@graph": [bc_ld([("首頁", SITE + "/"), ("冰肌除毛", url)]),
          {"@type": "Service", "name": "冰肌除毛", "url": url, "provider": {"@id": SPA_ID}, "areaServed": {"@type": "City", "name": "高雄市"},
           "offers": [{"@type": "Offer", "name": n, "price": p, "priceCurrency": "TWD"} for n, p in items]},
          {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}]}
    return wrap(body, ld)
