"""首頁／關於／門市據點／常見問題（草稿）。資料以 SPA 客服知識庫為準。"""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import build as b, courses as cs
from build import e, SITE, SPA_ID, LINE_HQ, TEL_HQ, wrap, cta, hero, bc_ld, course_cards, req

I = cs.IMG
IG = "https://www.instagram.com/heiweispa_skincare/"
SHOP = "https://www.heiweibeauty.com/"
MAP_HQ = "https://maps.app.goo.gl/ba8GG9RxAH879n9x5"
MAP_BT = "https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%8C%97%E5%B1%AF%E5%8D%80%E5%8D%97%E8%88%88%E8%B7%AF170%E8%99%9F"
BEITUN_LINE = "https://line.me/R/ti/p/@000yhvvp"

STORES = [
    dict(id=SPA_ID, name="HEIWEI SPA 何謂美 總公司（高雄左營館）", short="高雄左營總公司", city="高雄市", district="左營區", street="文敬路59號",
         zip="813", tel="07-3430072", hours_txt=["週一至週五 09:00–20:00（最後預約 18:30）", "週六 09:00–18:00（最後預約 16:30）", "週日公休"],
         hours=[(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "09:00", "20:00"), (["Saturday"], "09:00", "18:00")],
         geo=(22.677473, 120.311064), map=MAP_HQ, line=LINE_HQ, line_txt="@hwspa",
         park="機車可停大門內；汽車可停地下室（限高 190 公分，需倒車進入），請提前告知。"),
    dict(id=SITE + "/#dayspa-beitun", name="HEIWEI SPA 何謂美 台中北屯館", short="台中北屯館", city="台中市", district="北屯區", street="南興路170號",
         zip="406", tel="0978-290252", hours_txt=["週一至週五 09:00–20:00（最後預約 18:30）", "週六 09:00–18:00（最後預約 16:30）", "週日公休"],
         hours=[(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "09:00", "20:00"), (["Saturday"], "09:00", "18:00")],
         geo=(24.175471, 120.701290), map=MAP_BT, line=BEITUN_LINE, line_txt="@000yhvvp", park=""),
]


def store_ld(s):
    d = {"@type": ["DaySpa", "BeautySalon"], "@id": s["id"], "name": s["name"], "url": SITE + "/locations/",
         "image": I["public-01"], "telephone": s["tel"], "priceRange": "NT$759–NT$4,500",
         "address": {"@type": "PostalAddress", "streetAddress": s["street"], "addressLocality": s["district"], "addressRegion": s["city"],
                     "postalCode": s["zip"], "addressCountry": "TW"},
         "geo": {"@type": "GeoCoordinates", "latitude": s["geo"][0], "longitude": s["geo"][1]},
         "parentOrganization": {"@id": SITE + "/#organization"}, "sameAs": [IG]}
    if s["hours"]:
        d["openingHoursSpecification"] = [{"@type": "OpeningHoursSpecification", "dayOfWeek": days, "opens": o, "closes": c} for days, o, c in s["hours"]]
    return d


ORG = {"@type": "Organization", "@id": SITE + "/#organization", "name": "HEIWEI 何謂美", "alternateName": ["HEIWEI SPA", "何謂美 SPA"],
       "url": SITE + "/", "logo": "https://heiwei-group.com/wp-content/uploads/2026/11/heiwei-logo.png",
       "description": "HEIWEI 何謂美是 2015 年創立於台中的肌膚管理 SPA 與 MIT 保養品牌，目前於高雄左營總公司與台中北屯館提供臉部、身體與除毛療程。",
       "foundingDate": "2015", "email": "heiweimei@gmail.com", "telephone": "+886-7-343-0072", "taxID": "42668151",
       "sameAs": [IG, SHOP]}


def store_cards():
    out = ""
    for s in STORES:
        line = f'<a class="hwx-btn" href="{s["line"]}" target="_blank" rel="noopener">LINE 預約 {e(s["line_txt"])}</a>' if s["line"] else ""
        out += f"""<div class="hwx-card"><div class="no">{e(s['city'])}</div><h3>{e(s['short'])}</h3>
<p style="margin-top:10px">{e(s['city']+s['district']+s['street'])}<br>電話：<a href="tel:{s['tel'].replace('-', '')}">{e(s['tel'])}</a><br>{'<br>'.join(e(h) for h in s['hours_txt'])}</p>
{f'<p style="font-size:14px">停車：{e(s["park"])}</p>' if s['park'] else ''}
<div class="hwx-btns" style="margin-top:18px">{line}<a class="hwx-btn ghost" href="{s['map']}" target="_blank" rel="noopener">Google 地圖</a></div></div>"""
    return f'<div class="hwx-cards">{out}</div>'


GEN_FAQ = [
    ("如何預約 HEIWEI SPA？", "可以透過官方 LINE（@hwspa）預約，或撥打電話 07-3430072。本館採預約制，當天想預約也可以先用 LINE 詢問空檔。"),
    ("總公司營業時間是幾點？", "週一至週五 09:00–20:00（最後預約 18:30）、週六 09:00–18:00（最後預約 16:30），週日公休。"),
    ("第一次去需要準備什麼？", "不需要特別準備，準時到店即可；第一次會請你填寫基本資料。臉部課程都包含卸妝，不用先卸妝。"),
    ("一次療程大約多久？", "依項目不同，臉部課程通常 60–90 分鐘；若需要清粉刺，時間會依膚況增加。整體建議預留 70–120 分鐘。"),
    ("取消或改期有什麼規定？", "請盡早告知要取消或改期的時間。為維護預約品質，曾無故未到或當日取消者，之後預約需先支付訂金 NT$500。"),
    ("有停車位嗎？", "總公司機車可停大門內；汽車可停地下室（限高 190 公分，需倒車進入），請提前告知。"),
    ("可以和朋友一起去嗎？", "可以，我們有雙人房，可以和朋友一起預約。"),
    ("男生可以做療程嗎？", "目前只接待曾經消費過的女性顧客的男性友人。"),
    ("敏感肌可以做臉嗎？", "可以，推薦肌密修護舒敏課程；預約時告知膚況，美容師會依當天狀況調整。"),
    ("懷孕中可以做哪些療程？", "臉部保濕類課程都可以，懷孕 12 週以上也可以預約偉大的孕婦 SPA。"),
    ("生理期可以做療程嗎？", "可以。"),
    ("做完當天可以化妝嗎？", "可以。做完建議居家持續加強保濕，外出記得擦防曬。"),
    ("做完臉冒出小痘痘正常嗎？", "正常，肌膚代謝過程中可能出現一些小粉刺或痘痘，持續做好清潔保濕即可。"),
    ("可以用哪些方式付款？", "信用卡（線上綠界）、匯款與現金。"),
    ("有會員制度嗎？", "有 VIP 儲值會員制度，入會享課程 9 折，VIP 生日當月另有專屬禮遇，歡迎到店詢問。"),
    ("購買的療程次數可以轉讓或退費嗎？", "可以轉讓給朋友或家人，請提前告知；退費相關問題請洽專員。"),
    ("療程使用哪些品牌的產品？", "HEIWEI 何謂美自有保養品，以及 JANSSEN COSMETICS、MILA D'OPIZ、聖查理等專業品牌。"),
    ("店裡可以買保養品嗎？", "可以，現場有販售，也可以到 HEIWEI 何謂美官方網站 heiweibeauty.com 選購。"),
]


def faq_html(items):
    return '<div class="hwx-faq">' + "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in items) + "</div>"


def faq_ld(items):
    return {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in items]}


# ── 首頁 ──
def home():
    raw = json.load(open(os.path.join(os.path.dirname(__file__), "..", "docs/heiwei-spa/pages_backup_20261106.json")))
    old = next(p for p in raw if p["id"] == 712)["content"]["raw"]
    cut = old.find("<!-- wp:html -->\n<!-- RESERVATION -->")
    top = old[:cut]
    top = top.replace('''<div style="margin-bottom:28px;font-size:18px;letter-spacing:0.32em;color:#8f6658">
          HEIWEI SPA
        </div>''', '''<div style="margin-bottom:28px;font-size:18px;letter-spacing:0.32em;color:#8f6658">
          HEIWEI SPA 何謂美
        </div>''')
    top = top.replace('''<h1 style="margin:0;font-size:clamp(30px,5vw,60px);line-height:1.4;font-weight:500;letter-spacing:0.04em">
          和你為肌膚之美而生
        </h1>''', '''<h1 style="margin:0;font-size:clamp(30px,5vw,60px);line-height:1.4;font-weight:500;letter-spacing:0.04em">
          <span style="display:block;font-size:0.4em;letter-spacing:0.18em;color:#8f6658;margin-bottom:12px">高雄左營・台中北屯｜肌膚管理 SPA</span>和你為肌膚之美而生
        </h1>''')
    top = top.replace('href="https://heiwei-group.com/heiwei-spa-dm/" style="display:inline-flex', 'href="https://heiwei-group.com/facial/" style="display:inline-flex')
    top = top.replace('<a href="https://heiwei-group.com/heiwei-spa-dm/">查看課程項目', '<a href="https://heiwei-group.com/facial/">查看課程項目')
    top = top.replace('alt="HEIWEI SPA" style="width:100%', 'alt="HEIWEI SPA 美容師進行身體精油按摩" style="width:100%')
    assert top.count("/facial/") == 2 and "高雄左營・台中北屯" in top
    top += '</div>\n<!-- /wp:group -->\n</div>\n<!-- /wp:column -->\n</div>\n<!-- /wp:columns -->\n\n'

    picks = ["aquatic-hydrating-facial", "sensitive-skin-soothing-facial", "micro-current-v-face-facial", "hw-memory-mask-facial",
             "full-body-relaxing-massage", "prenatal-spa"]
    pc = [next(x for x in cs.COURSES if x["slug"] == s) for s in picks]
    cats = [("FACIAL", "臉部療程", "清潔保濕、敏感肌舒緩、微電流、記憶面膜等 13 堂臉部課程，皆含卸妝與肩頸放鬆。", "NT$2,500 起", SITE + "/facial/"),
            ("BODY", "身體療程", "精油全身舒壓、淋巴循環、去角質、美背、孕婦 SPA，全女性美容師。", "NT$1,680 起", SITE + "/body/"),
            ("HAIR REMOVAL", "冰肌除毛", "冷卻探頭降低痛感，唇周、腋下到 VIO 共 9 個部位。", "NT$759 起", SITE + "/hair-removal/")]
    catc = "".join(f'<a class="hwx-course" href="{u}"><div class="hwx-kicker" style="margin-bottom:6px">{k}</div><h3>{n}</h3><p>{d}</p><span class="meta">{p} →</span></a>' for k, n, d, p, u in cats)
    faq = GEN_FAQ[:6]
    body = f"""<section class="hwx-sec"><div class="hwx-wrap"><div class="hwx-head center"><div class="hwx-kicker">SERVICES</div><h2>HEIWEI SPA 服務項目</h2>
<p class="hwx-lead">從臉部肌膚管理、身體放鬆到冰肌除毛，同一天可以一次完成，預約時告訴我們想做的項目即可。</p></div>
<div class="hwx-courses">{catc}</div></div></section>
<section class="hwx-sec alt"><div class="hwx-wrap"><div class="hwx-head"><div class="hwx-kicker">POPULAR</div><h2>人氣課程</h2></div>
<div class="hwx-courses">{course_cards(pc)}</div>
<div class="hwx-btns"><a class="hwx-btn ghost" href="{SITE}/facial/">全部臉部療程</a><a class="hwx-btn ghost" href="{SITE}/body/">全部身體療程</a></div></div></section>
<section class="hwx-sec"><div class="hwx-wrap hwx-two"><div><div class="hwx-kicker">OUR STORY</div><h2>從自己的肌膚困擾開始的品牌</h2></div>
<div><p>HEIWEI 何謂美 2015 年創立於台中。品牌創辦人與執行長都曾為肌膚問題所苦，試過市面上許多保養品，最後決定自己投入研究，開發適合敏感與各種膚質的 MIT 保養品。</p>
<p>今天，HEIWEI 在高雄左營總公司與台中北屯館提供肌膚管理 SPA，館內療程使用自有研發的保養品，從專業護理到居家保養，陪你一起照顧肌膚。</p>
<div class="hwx-btns"><a class="hwx-btn ghost" href="{SITE}/about/">品牌故事</a><a class="hwx-btn ghost" href="{SHOP}" target="_blank" rel="noopener">HEIWEI 保養品官網</a></div></div></div></section>
<section class="hwx-sec alt"><div class="hwx-wrap"><div class="hwx-head"><div class="hwx-kicker">LOCATIONS</div><h2>門市據點</h2></div>{store_cards()}</div></section>
<section class="hwx-sec"><div class="hwx-wrap"><div class="hwx-head"><div class="hwx-kicker">FAQ</div><h2>常見問題</h2></div>{faq_html(faq)}
<div class="hwx-btns"><a class="hwx-btn ghost" href="{SITE}/faq/">看更多常見問題</a></div></div></section>
{cta("預約你的肌膚管理時光")}"""
    ld = {"@context": "https://schema.org", "@graph": [ORG, {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": "HEIWEI SPA 何謂美",
          "inLanguage": "zh-TW", "publisher": {"@id": SITE + "/#organization"}}] + [store_ld(s) for s in STORES] + [faq_ld(faq)]}
    return top + wrap(body, ld)


def about():
    body = hero("OUR STORY", "關於 HEIWEI 何謂美", "HEIWEI 何謂美，和你為肌膚之美而生。2015 年創立於台中，結合肌膚管理 SPA 與 MIT 保養品研發，陪每一位追求美的你重建健康膚況。",
                I["public-01"], "HEIWEI SPA 接待大廳", [("關於我們", "")])
    body += f"""<section class="hwx-sec"><div class="hwx-wrap hwx-two"><div><div class="hwx-kicker">ORIGIN</div><h2>品牌起源</h2></div><div>
<p>HEIWEI 何謂美 2015 年從台中起步，是一個以肌膚管理為核心的 SPA 品牌。</p>
<p>品牌創辦人與執行長，都曾是為肌膚問題所苦的女孩，嘗試過市面上許多保養品，卻發現大量生產的保養品很難照顧到敏感、受損肌膚的需求。於是她們透過長時間的自身測試與專業研究，開發出適合敏感與各種膚質的保養品，希望幫助肌膚找回健康穩定的狀態。</p></div></div></section>
<section class="hwx-sec alt"><div class="hwx-wrap hwx-two"><div><div class="hwx-kicker">BELIEF</div><h2>品牌理念</h2></div><div>
<p>每一位尋求美的你，都會有專業的我們，耐心解答你的肌膚問題。</p>
<p>HEIWEI 一直相信，女人的美不只是外在，更是由內而外的自信。我們聚集了一群為美努力的女生，希望一起提升女孩們對美的想像，裡外都美麗。</p></div></div></section>
<section class="hwx-sec"><div class="hwx-wrap"><div class="hwx-head"><div class="hwx-kicker">WHY HEIWEI</div><h2>為什麼選擇 HEIWEI SPA</h2></div>
<div class="hwx-cards">
<div class="hwx-card"><div class="no">01</div><h3>自有研發保養品</h3><p>館內療程使用 HEIWEI 自有研發的 MIT 保養品，並搭配 JANSSEN COSMETICS、MILA D'OPIZ、聖查理等專業品牌。</p></div>
<div class="hwx-card"><div class="no">02</div><h3>全女性美容師</h3><p>全館皆為女性美容師，獨立療程室，也有雙人房可以和朋友一起放鬆。</p></div>
<div class="hwx-card"><div class="no">03</div><h3>先評估再建議</h3><p>不確定做什麼？美容師會先了解你的膚況與需求，評估不收費。</p></div>
<div class="hwx-card"><div class="no">04</div><h3>臉、身體、除毛一次完成</h3><p>同一天可以安排多個項目，也可以兩位美容師同時服務，節省時間。</p></div>
</div></div></section>
<section class="hwx-sec alt"><div class="hwx-wrap"><div class="hwx-head"><div class="hwx-kicker">LOCATIONS</div><h2>門市據點</h2></div>{store_cards()}</div></section>
{cta()}"""
    ld = {"@context": "https://schema.org", "@graph": [bc_ld([("首頁", SITE + "/"), ("關於我們", SITE + "/about/")]),
          {"@type": "AboutPage", "url": SITE + "/about/", "about": {"@id": SITE + "/#organization"}}, ORG]}
    return wrap(body, ld)


def locations():
    body = hero("LOCATIONS", "門市據點｜高雄左營・台中北屯", "HEIWEI SPA 目前有兩間館：高雄左營總公司與台中北屯館。本館採預約制，請先透過 LINE 或電話預約。",
                I["public-03"], "HEIWEI SPA 高雄左營總公司外觀與接待區", [("門市據點", "")])
    maps = """<section class="hwx-sec alt"><div class="hwx-wrap hwx-two">
<div><h3 style="margin-bottom:12px">高雄左營總公司</h3><iframe title="HEIWEI SPA 高雄左營總公司地圖" src="https://www.google.com/maps?q=%E9%AB%98%E9%9B%84%E5%B8%82%E5%B7%A6%E7%87%9F%E5%8D%80%E6%96%87%E6%95%AC%E8%B7%AF59%E8%99%9F&output=embed" width="100%" height="320" style="border:0;border-radius:18px" loading="lazy"></iframe></div>
<div><h3 style="margin-bottom:12px">台中北屯館</h3><iframe title="HEIWEI SPA 台中北屯館地圖" src="https://www.google.com/maps?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%8C%97%E5%B1%AF%E5%8D%80%E5%8D%97%E8%88%88%E8%B7%AF170%E8%99%9F&output=embed" width="100%" height="320" style="border:0;border-radius:18px" loading="lazy"></iframe></div>
</div></section>"""
    body += f'<section class="hwx-sec"><div class="hwx-wrap"><div class="hwx-head"><div class="hwx-kicker">STORES</div><h2>兩館資訊</h2></div>{store_cards()}</div></section>' + maps + cta()
    ld = {"@context": "https://schema.org", "@graph": [bc_ld([("首頁", SITE + "/"), ("門市據點", SITE + "/locations/")])] + [store_ld(s) for s in STORES]}
    return wrap(body, ld)


def faq_page():
    body = hero("FAQ", "HEIWEI SPA 常見問題", "預約、停車、付款、療程前後注意事項，整理在這裡。找不到答案的話，歡迎直接 LINE 我們。",
                I["public-02"], "HEIWEI SPA 接待等候區", [("常見問題", "")])
    body += f'<section class="hwx-sec"><div class="hwx-wrap">{faq_html(GEN_FAQ)}</div></section>' + cta("還有問題？直接問我們")
    ld = {"@context": "https://schema.org", "@graph": [bc_ld([("首頁", SITE + "/"), ("常見問題", SITE + "/faq/")]), faq_ld(GEN_FAQ)]}
    return wrap(body, ld)


if __name__ == "__main__":
    out = {}
    for slug, title, fn, st, sd in [
        ("home-2026", "首頁（改版預覽）", home, "", ""),
        ("about", "關於我們", about, "關於 HEIWEI 何謂美｜2015 創立的肌膚管理 SPA 品牌", "HEIWEI 何謂美 2015 年創立於台中，結合肌膚管理 SPA 與 MIT 自有保養品研發，目前於高雄左營總公司與台中北屯館提供臉部、身體與除毛療程。"),
        ("locations", "門市據點", locations, "HEIWEI SPA 門市據點｜高雄左營總公司・台中北屯館", "HEIWEI SPA 高雄左營總公司：文敬路59號，07-3430072，週一至五 09:00–20:00、週六 09:00–18:00。台中北屯館：南興路170號，0978-290252，營業時間同總公司。採預約制。"),
        ("faq", "常見問題", faq_page, "HEIWEI SPA 常見問題｜預約、停車、付款、療程注意事項", "HEIWEI SPA 常見問題：如何預約、營業時間、停車、取消改期、付款方式、敏感肌與孕婦可做的療程、做完臉的注意事項。"),
    ]:
        p = b.upsert_page(slug, title, fn(), seo_title=st, seo_desc=sd)
        out[slug] = p["id"]; print(slug, p["id"])
