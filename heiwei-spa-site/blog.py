"""美容知識文章（草稿）。每篇：Gutenberg 段落區塊＋FAQ＋CTA＋BlogPosting/FAQPage JSON-LD。
文案原則同課程頁：不寫治療、改善疾病等醫療效能宣稱；孕期、用藥一律建議先諮詢醫師。"""
import json, sys, os, html
sys.path.insert(0, os.path.dirname(__file__))
from build import req, SITE, SPA_ID
e = html.escape
F = SITE + "/facial/"; B = SITE + "/body/"


def P(t): return f"<!-- wp:paragraph -->\n<p>{t}</p>\n<!-- /wp:paragraph -->"
def H(t): return f'<!-- wp:heading -->\n<h2 class="wp-block-heading">{t}</h2>\n<!-- /wp:heading -->'
def H3(t): return f'<!-- wp:heading {{"level":3}} -->\n<h3 class="wp-block-heading">{t}</h3>\n<!-- /wp:heading -->'
def UL(items): return '<!-- wp:list -->\n<ul class="wp-block-list">' + "".join(f"<!-- wp:list-item -->\n<li>{i}</li>\n<!-- /wp:list-item -->" for i in items) + "</ul>\n<!-- /wp:list -->"
def A(slug, text, cat="facial"): return f'<a href="{SITE}/{cat}/{slug}/">{text}</a>'
def TABLE(head, rows):
    th = "".join(f"<th>{h}</th>" for h in head); tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<!-- wp:table -->\n<figure class="wp-block-table"><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></figure>\n<!-- /wp:table -->'


def tail(title, faq):
    f = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in faq)
    return f"""<!-- wp:html -->
<div class="hwx"><section style="margin:40px 0"><h2 style="font-size:26px;margin-bottom:18px">常見問題</h2><div class="hwx-faq">{f}</div></section>
<div class="hwx-cta" style="margin:40px 0"><h2>想找人幫你看看肌膚狀況？</h2><p style="margin-top:12px">HEIWEI SPA 高雄左營總公司・台中北屯館，美容師膚況評估不收費。</p>
<div class="hwx-btns"><a class="hwx-btn" href="https://line.me/R/ti/p/@hwspa" target="_blank" rel="noopener">LINE 預約 @hwspa</a><a class="hwx-btn ghost" href="tel:073430072">來電 07-3430072</a></div></div></div>
<!-- /wp:html -->"""


def ld(slug, title, desc, img, faq):
    url = f"{SITE}/blog/{slug}/"
    return {"@context": "https://schema.org", "@graph": [
        {"@type": "BlogPosting", "headline": title, "description": desc, "image": img, "inLanguage": "zh-TW",
         "author": {"@type": "Organization", "name": "HEIWEI SPA 美容師團隊", "url": SITE + "/about/"},
         "publisher": {"@id": SITE + "/#organization"}, "about": {"@id": SPA_ID}},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}]}


U = "https://heiwei-group.com/wp-content/uploads/2026/10/"
POSTS = [
 dict(slug="kaohsiung-facial-guide", cat="臉部保養", media=785, img=U + "heiwei-space-room-02.webp",
  title="高雄做臉推薦｜第一次做臉怎麼選？臉部保養課程完整指南",
  seo="高雄做臉推薦｜第一次做臉怎麼選？臉部課程價格與流程指南",
  desc="第一次在高雄做臉不知道怎麼選？美容師整理臉部保養課程的種類、價格、流程與挑選方法，從清潔保濕、敏感肌到進階保養，一篇看懂。",
  body=[P("第一次做臉，最常見的煩惱是：價目表上的課程看起來都差不多，不知道哪一堂適合自己。這篇由 HEIWEI SPA 美容師整理挑選臉部課程的方法，讓你預約前心裡有底。"),
        H("先搞清楚：你最在意的是什麼？"),
        P("挑課程前，先問自己一個問題：<strong>現在最困擾的肌膚狀況是哪一個？</strong>課程大致可以依需求分成幾類："),
        TABLE(["你的困擾", "適合的課程方向", "HEIWEI 對應課程"], [
            ["乾燥、上妝浮粉", "清潔＋保濕", A("aquatic-hydrating-facial", "AQUATIC 潔淨保濕") + "、" + A("sothys-hydra-elastic-facial", "SOTHYS 水彈力")],
            ["容易泛紅、刺癢", "溫和舒緩", A("sensitive-skin-soothing-facial", "肌密修護舒敏")],
            ["粉刺多、毛孔明顯", "深層清潔", A("nano-hydrogen-bubble-facial", "奈米水素水小氣泡") + "、" + A("seaweed-micro-crystal-facial", "喚顏海藻微晶")],
            ["暗沉、粗糙、角質厚", "代謝角質", A("almond-acid-facial", "苦杏仁代謝") + "、" + A("detox-firming-facial", "排濁緊緻")],
            ["初老、缺乏彈潤感", "滋潤保養", A("green-caviar-facial", "綠魚子逆時撫紋") + "、" + A("pdrn-radiance-facial", "補骨脂酚亮采")],
            ["臉部線條、緊繃", "手技＋儀器", A("micro-current-v-face-facial", "微電流小V臉") + "、" + A("gua-sha-brightening-facial", "撥筋活氧")]]),
        H("一堂臉部課程大概在做什麼？"),
        P("大多數臉部課程的流程都很接近，差別在中間的「主要護理」。以 HEIWEI SPA 為例："),
        UL(["<strong>卸妝洗臉</strong>：到店不需要先卸妝。", "<strong>去角質／深層清潔</strong>：依課程使用酵素、杏仁酸或儀器。",
            "<strong>主要護理</strong>：精華導入、按摩、撥筋、微電流或面膜。", "<strong>保濕敷面、軟膜</strong>：把水分與精華留住。",
            "<strong>肩頸按摩、基礎保養</strong>：放鬆後完成保養，可以直接上妝出門。"]),
        P("時間通常是 60–90 分鐘；如果需要清粉刺，會依膚況增加時間，建議整體預留 70–120 分鐘。"),
        H("第一次做臉的 4 個小提醒"),
        UL(["<strong>先告訴美容師你的狀況</strong>：正在用 A 酸、杜鵑花酸，或最近做過醫美療程，都要先說。",
            "<strong>不要吃太飽再來</strong>：躺著做臉會比較舒服。",
            "<strong>做完泛紅、冒小粉刺是常見的</strong>：清粉刺後或敏感肌泛紅較明顯；代謝期偶爾會冒出小粉刺，持續保濕即可。",
            "<strong>回家保養更重要</strong>：做完臉要持續加強保濕，外出記得防曬。"]),
        H("真的不知道怎麼選？讓美容師幫你評估"),
        P("如果看完還是覺得每一堂都適合，可以直接預約" + A("custom-facial-consultation", "美容師評估客製化課程") + "，到店先看膚況再規劃內容，評估不收費。全部課程與價格可以在" + f'<a href="{F}">臉部療程總覽</a>' + "查看。")],
  faq=[("第一次做臉要準備什麼？", "不需要特別準備，也不用先卸妝；第一次到店會請你填寫基本資料。"),
       ("做臉多久做一次比較好？", "依課程與膚況而定，一般保濕清潔類課程可以 3–4 週安排一次；實際頻率建議到店請美容師評估。"),
       ("做完臉可以化妝嗎？", "可以，做完後建議持續保濕並做好防曬。")]),

 dict(slug="sensitive-skin-facial", cat="臉部保養", media=786, img=U + "heiwei-space-room-04.webp",
  title="敏感肌可以做臉嗎？敏弱肌做臉前必看的 7 件事",
  seo="敏感肌可以做臉嗎？敏弱肌做臉前必看 7 件事｜HEIWEI SPA",
  desc="敏感肌、容易泛紅的人可以做臉嗎？美容師整理敏弱肌做臉前要告知的事、適合的課程類型與做完臉後的保養重點。",
  body=[P("「我是敏感肌，可以做臉嗎？」是我們最常被問的問題之一。答案是<strong>可以</strong>，但要選對課程、做好溝通。以下是敏弱肌做臉前一定要知道的 7 件事。"),
        H("1. 先分清楚：敏感肌常見的樣子"),
        P("容易泛紅、刺癢、換季就不穩定、擦保養品偶爾會刺刺的，這些都是常見的敏弱肌狀態，多半和肌膚最外層的防護比較脆弱、留不住水分有關。"),
        H("2. 選「舒緩保濕型」課程，避開刺激性操作"),
        P("敏感肌做臉的重點是<strong>溫和</strong>：以舒緩、保濕、加強防護為主，避免強力去角質或高刺激的酸類。HEIWEI SPA 的" + A("sensitive-skin-soothing-facial", "肌密修護舒敏課程") + "就是為這類肌膚設計的。"),
        H("3. 預約時就先說明膚況"),
        P("讓美容師事先知道你容易泛紅、對哪些產品有反應，當天才能調整產品與力道。"),
        H("4. 正在使用 A 酸、杜鵑花酸要告知"),
        P("這類產品會讓肌膚比較乾，建議選擇保濕類課程，並在到店時告訴美容師使用的產品與頻率。"),
        H("5. 剛做完醫美療程？先講清楚時間"),
        P("請告知醫美療程的項目與距離現在多久，一般會建議以保濕舒緩為主；術後照護仍以你的醫師建議為準。"),
        H("6. 有傷口或很不舒服時先暫緩"),
        P("臉上有傷口可以先拍照傳給我們確認；身體不舒服時，建議改天再來。"),
        H("7. 做完之後：保濕、防曬、少刺激"),
        UL(["做完幾天內持續加強保濕。", "外出一定要防曬。", "暫時不要使用去角質或酸類產品。", "如果泛紅持續或不舒服，拍照傳 LINE 給我們。"]),
        P("想從最溫和的方式開始，也可以先做" + A("aquatic-hydrating-facial", "AQUATIC 潔淨保濕課程") + "，流程精簡、以清潔保濕為主。")],
  faq=[("敏感肌適合做哪種臉部課程？", "以舒緩保濕為主的課程最適合，例如 HEIWEI SPA 的肌密修護舒敏課程；預約時先告知膚況，美容師會再調整。"),
       ("敏感肌可以清粉刺嗎？", "可以，但美容師會依當天膚況調整力道與時間；清完泛紅較明顯是常見現象，做好保濕即可。"),
       ("有在用 A 酸可以做臉嗎？", "可以，但建議選保濕類課程，並告訴美容師使用的產品。")]),

 dict(slug="prenatal-massage-guide", cat="身體保養", media=784, img=U + "heiwei-space-room-02.webp",
  title="孕婦按摩可以做嗎？孕期 SPA 週數、注意事項一次看",
  seo="孕婦按摩可以做嗎？孕期 SPA 幾週可以做、注意事項｜高雄 HEIWEI SPA",
  desc="懷孕可以按摩、做 SPA 嗎？整理孕婦按摩建議週數、精油選擇、哪些部位要避開，以及預約前要告知的事。",
  body=[P("懷孕之後，腰背、腿部的負擔越來越重，很多準媽媽會想：<strong>懷孕可以按摩嗎？</strong>只要選對時間、對的店家與方式，孕期也能好好放鬆。"),
        H("懷孕幾週可以做孕婦按摩？"),
        P("HEIWEI SPA 的" + A("prenatal-spa", "偉大的孕婦 SPA", "body") + "建議<strong>懷孕 12 週以後</strong>再預約，預約時請告知懷孕週數。若有妊娠相關狀況或醫師特別叮嚀，請先和你的醫師確認。"),
        H("孕婦按摩和一般按摩有什麼不同？"),
        UL(["<strong>姿勢</strong>：依週數調整躺姿，讓肚子不受壓迫。", "<strong>力道</strong>：以溫和的油推為主，不做強力指壓。",
            "<strong>部位</strong>：胸部不會主動按摩，除非你有需求才會輕輕帶過。", "<strong>產品</strong>：使用孕期可用的精油。"]),
        H("精油安全嗎？"),
        P("我們使用孕婦可以使用的聖查理百年精油；如果你不想使用精油，也可以改用薰衣草基底油。對香味敏感的話，預約時先說即可。"),
        H("預約前要告訴店家的事"),
        UL(["懷孕週數。", "目前覺得不舒服的部位（例如腰背、腿部沉重）。", "醫師是否有特別叮嚀或限制。", "對精油、香味的偏好。"]),
        H("懷孕中還可以做臉嗎？"),
        P("可以，臉部保濕類的課程都適合，例如" + A("aquatic-hydrating-facial", "AQUATIC 潔淨保濕課程") + "。孕期肌膚容易比較敏感，到店時也請告知懷孕中。")],
  faq=[("懷孕幾週可以做孕婦 SPA？", "建議懷孕 12 週以後，預約時告知週數；若有妊娠相關狀況請先諮詢醫師。"),
       ("孕婦 SPA 使用的精油安全嗎？", "使用孕婦可用的聖查理百年精油，也可以改用薰衣草基底油。"),
       ("孕婦可以做臉嗎？", "可以，保濕類的臉部課程都適合，到店時請告知懷孕中。")]),

 dict(slug="mandelic-acid-guide", cat="臉部保養", media=783, img=U + "heiwei-space-public-06.webp",
  title="杏仁酸是什麼？杏仁酸跟果酸差在哪、誰適合做杏仁酸課程",
  seo="杏仁酸是什麼？杏仁酸跟果酸差別、會脫皮嗎｜HEIWEI SPA",
  desc="杏仁酸和果酸有什麼不同？做杏仁酸會脫皮嗎？美容師說明杏仁酸的特性、適合的膚質，以及做完後的保養重點。",
  body=[P("杏仁酸（Mandelic Acid）是從苦杏仁萃取的酸類，近幾年在保養品與美容課程中很常見。它和傳統果酸最大的差別是：<strong>比較溫和</strong>。"),
        H("杏仁酸跟果酸差在哪？"),
        TABLE(["", "杏仁酸", "傳統果酸（如甘醇酸）"], [["分子大小", "較大", "較小"], ["滲透速度", "較慢、較溫和", "較快"], ["刺激感", "較低", "相對較高"], ["脫皮情況", "通常不明顯", "較容易脫皮"]]),
        P("因為分子較大、滲透較慢，杏仁酸對肌膚的刺激感較低，不太會出現明顯脫皮，所以常被用在想定期代謝角質、又怕刺激的人身上。"),
        H("哪些人適合杏仁酸課程？"),
        UL(["肌膚粗糙、角質厚的人", "膚色暗沉不均的人", "油性肌膚、覺得毛孔明顯的人", "想嘗試酸類保養但怕刺激的人"]),
        H("做完杏仁酸要注意什麼？"),
        UL(["<strong>加強保濕</strong>：如果出現輕微脫皮，通常代表保濕不夠，乳霜可以多擦一點。", "<strong>一定要防曬</strong>。", "<strong>避免同時使用其他酸類產品</strong>。"]),
        P("HEIWEI SPA 的" + A("almond-acid-facial", "美國苦杏仁代謝課程") + "以杏仁酸搭配精華導入與軟膜，60 分鐘完成；背部容易冒粉刺的人，也可以參考使用杏仁酸的" + A("back-hip-cleansing-care", "美背／美臀淨暇課程", "body") + "。")],
  faq=[("做杏仁酸會脫皮嗎？", "杏仁酸是酸類中最溫和的，通常不太會脫皮；若有脫皮，代表保濕不夠，請加強保濕。"),
       ("敏感肌可以做杏仁酸嗎？", "建議先讓美容師評估膚況；容易泛紅刺癢的人，可以先從舒緩保濕類課程開始。"),
       ("杏仁酸課程多久做一次？", "依膚況而定，建議到店由美容師評估後安排。")]),

 dict(slug="ice-hair-removal-guide", cat="除毛", media=787, img=U + "heiwei-space-room-05.webp",
  title="冰肌除毛是什麼？會痛嗎、要做幾次、除毛前後注意事項",
  seo="冰肌除毛會痛嗎？要做幾次？高雄除毛前後注意事項｜HEIWEI SPA",
  desc="冰肌除毛和一般除毛有什麼不同？會不會痛？要做幾次？整理除毛前的準備、禁忌與除毛後的照顧，以及各部位價格。",
  body=[P("越來越多人選擇到店除毛，省去每天刮毛的麻煩。這篇整理大家最常問的冰肌除毛問題。"),
        H("冰肌除毛的「冰」是什麼意思？"),
        P("冰肌除毛的探頭具有<strong>冷卻功能</strong>，施打時可以降低疼痛感。痛感仍然因人而異，毛髮越粗黑的部位通常感受越明顯。"),
        H("要做幾次？"),
        P("次數因人而異，主要和毛髮粗細有關。毛髮長出來就可以回來做，通常間隔 <strong>2–3 週</strong>，生長週期會慢慢拉長。"),
        H("除毛前要怎麼準備？"),
        UL(["<strong>提前 2–3 天自行刮除毛髮</strong>，效果會更好。", "施打部位<strong>不要擦含酸類的保養品與止汗劑</strong>。"]),
        H("除毛後會紅腫嗎？"),
        P("遇到顏色較深的地方（例如痣）可能會有些微紅腫，通常半天內就會消退。除毛後記得做好保濕與防曬。"),
        H("比基尼線和 VIO 全除差在哪？"),
        P("比基尼線是針對部分區域；VIO 是全除。想要更乾淨、省去整理的麻煩，建議選全除。"),
        H("各部位價格"),
        TABLE(["部位", "單次價格"], [["唇周", "NT$759"], ["腋下", "NT$899"], ["小腿", "NT$1,499"], ["大腿／手臂", "NT$1,799"], ["背部／比基尼線", "NT$2,699"], ["面部全除／VIO 全除", "NT$3,299"]]),
        P("完整說明請看" + f'<a href="{SITE}/hair-removal/">冰肌除毛頁面</a>' + "。除毛也可以和臉部、身體課程同一天一起做，預約時告知即可。")],
  faq=[("冰肌除毛會痛嗎？", "痛感因人而異；冰肌探頭具冷卻功能，可以降低施打時的痛感。"),
       ("除毛要做幾次？", "因人而異，和毛髮粗細有關；毛髮長出來就可以回來做，通常間隔 2–3 週。"),
       ("男生可以除毛嗎？", "目前只接待曾經消費過的女性顧客的男性友人。")]),

 dict(slug="facial-aftercare-faq", cat="臉部保養", media=778, img=U + "heiwei-space-room-01.webp",
  title="做完臉要注意什麼？泛紅、冒痘、多久做一次｜美容師解答 8 個問題",
  seo="做完臉要注意什麼？泛紅冒痘正常嗎、多久做一次｜HEIWEI SPA",
  desc="做完臉可以化妝嗎？泛紅、冒小痘痘正常嗎？多久做一次比較好？HEIWEI SPA 美容師整理做臉前後最常見的 8 個問題。",
  body=[P("做完臉之後的幾天，是很多人最緊張的時候：臉怎麼紅紅的？怎麼冒了幾顆小痘痘？以下是我們最常被問到的 8 個問題。"),
        H3("1. 做完臉可以馬上化妝嗎？"), P("可以。不過做完臉後肌膚比較需要水分，建議先做好保濕再上妝。"),
        H3("2. 做完臉泛紅正常嗎？"), P("有些課程、清粉刺後，或本身比較敏感的肌膚，做完泛紅會比較明顯，通常會慢慢退。若持續不舒服，拍照傳 LINE 給我們。"),
        H3("3. 做完臉冒出小痘痘？"), P("正常。肌膚代謝的過程中，有時會出現一些小粉刺或痘痘，持續做好清潔與保濕即可。"),
        H3("4. 為什麼做完反而覺得比較乾？"), P("部分課程會有一段代謝期，所以居家保濕就更重要，乳霜可以擦厚一點。"),
        H3("5. 做完多久可以曬太陽、游泳？"), P("外出一定要擦防曬，避免長時間曝曬。"),
        H3("6. 多久做一次臉比較好？"), P("每個課程的週期和每個人的膚況都不一樣，建議到店讓美容師評估。以" + A("micro-current-v-face-facial", "微電流小V臉課程") + "為例，希望效果明顯的人會每週安排。"),
        H3("7. 做一次就會有效果嗎？"), P("每個人的膚況不同，感受也不同；搭配正確的居家保養，才能讓膚況穩定。"),
        H3("8. 做完臉回家要怎麼保養？"),
        UL(["持續加強保濕。", "外出擦防曬。", "做完幾天避免去角質、酸類產品。", "不確定產品怎麼用，可以直接問美容師。"]),
        P("想了解 HEIWEI SPA 的臉部課程，可以看" + f'<a href="{F}">臉部療程總覽</a>' + "；更多預約、付款相關問題請看" + f'<a href="{SITE}/faq/">常見問題</a>' + "。")],
  faq=[("做完臉可以化妝嗎？", "可以，建議先做好保濕再上妝。"), ("做完臉冒痘正常嗎？", "正常，肌膚代謝過程中可能出現小粉刺或痘痘，持續清潔保濕即可。"),
       ("做完臉為什麼更乾？", "部分課程有代謝期，居家保濕更重要。")]),
]


def run():
    cats = {c["name"]: c["id"] for c in req("GET", "/categories?per_page=100")}
    for name, slug in [("臉部保養", "facial-care"), ("身體保養", "body-care"), ("除毛", "hair-removal-tips")]:
        if name not in cats:
            cats[name] = req("POST", "/categories", {"name": name, "slug": slug})["id"]
    out = []
    for p in POSTS:
        content = "\n\n".join(p["body"]) + "\n\n" + tail(p["title"], p["faq"]) + \
                  '\n\n<!-- wp:html -->\n<script type="application/ld+json">' + json.dumps(ld(p["slug"], p["title"], p["desc"], p["img"], p["faq"]), ensure_ascii=False) + "</script>\n<!-- /wp:html -->"
        found = req("GET", f"/posts?slug={p['slug']}&status=any&context=edit")
        data = {"title": p["title"], "slug": p["slug"], "content": content, "excerpt": p["desc"], "status": "draft",
                "categories": [cats[p["cat"]]], "featured_media": p["media"],
                "meta": {"jetpack_seo_html_title": p["seo"], "advanced_seo_description": p["desc"]}}
        r = req("POST", f"/posts/{found[0]['id']}" if found else "/posts", data)
        out.append((r["id"], p["title"])); print(r["id"], p["title"])
    return out


if __name__ == "__main__":
    run()
