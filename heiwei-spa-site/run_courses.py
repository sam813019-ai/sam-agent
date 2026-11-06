import build as b, courses as cs
I = cs.IMG
hubs = {
 "facial": ("臉部療程", ["從基礎清潔保濕、敏感肌舒緩，到微電流、記憶面膜等進階保養，HEIWEI SPA 依你的膚況安排最適合的臉部課程。所有臉部課程都包含卸妝洗臉與肩頸放鬆。",
            I["room-02"], "HEIWEI SPA 高雄臉部保養療程室", "不確定哪一堂適合你？可以選「美容師評估客製化課程」，評估不收費。"],
            "高雄臉部保養推薦｜做臉課程價格一覽｜HEIWEI SPA",
            "HEIWEI SPA 高雄左營臉部療程一覽：清潔保濕、敏感肌舒緩、杏仁酸、小氣泡、微電流小V臉、記憶面膜等，NT$2,500 起，含卸妝與肩頸放鬆。LINE @hwspa 預約。"),
 "body": ("身體療程", ["精油全身舒壓、淋巴循環、去角質、美背、孕婦 SPA 與女性私密保養，全女性美容師，在獨立療程室好好放鬆。",
           I["room-03"], "HEIWEI SPA 高雄身體精油按摩療程室", "身體課程都從足浴或清潔開始，結束後可以沐浴，清爽離開。"],
           "高雄身體 SPA 按摩推薦｜精油舒壓、孕婦按摩｜HEIWEI SPA",
           "HEIWEI SPA 高雄左營身體療程：精油全身舒壓、前胸後背放鬆、疏經儀淋巴循環、全身去角質、美背、孕婦 SPA，NT$1,680 起，全女性美容師。"),
}
ids = {}
for cat, (title, intro, st, sd) in hubs.items():
    p = b.upsert_page(cat, title, b.hub_page(cat, cs.COURSES, intro), seo_title=st, seo_desc=sd)
    ids[cat] = p["id"]; print("hub", cat, p["id"])
for c in cs.COURSES:
    p = b.upsert_page(c["slug"], c["name"], b.course_page(c, cs.COURSES), parent=ids[c["cat"]], seo_title=c["seo_title"], seo_desc=c["seo_desc"])
    print(p["id"], "HOLD" if c["hold"] else "", c["name"])
p = b.upsert_page("hair-removal", "冰肌除毛", b.hair_page(cs.HAIR_REMOVAL, I["room-05"]),
                  seo_title="高雄冰肌除毛價格｜腋下、VIO、全臉除毛｜HEIWEI SPA",
                  seo_desc="HEIWEI SPA 高雄左營冰肌除毛，冷卻探頭降低疼痛感。唇周 NT$759、腋下 NT$899、小腿 NT$1,499、VIO 全除 NT$3,299，9 個部位價格透明。")
print("hair", p["id"])
