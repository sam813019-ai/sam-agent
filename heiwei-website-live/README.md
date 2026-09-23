# HEIWEI 何謂美官網 — 上線版存檔（2026-09-15）

heiweibeauty.com（Shopline）首頁的客製化區塊，**依頁面由上而下編號**，一段一支檔。
這裡是「改版前的基準版」：**不要直接改這些檔**，要改請複製一份到新資料夾再動。

| 檔案 | 區塊 | 備註 |
|---|---|---|
| `01_marquee_coffee.html` | 超商取貨送咖啡券跑馬燈（米杏底） | 原稿＝`heiwei-website-v7/shopline_marquee_coffee_balm.html`（9/3） |
| `02_video_hero.html` | YouTube 影片 Hero（oFZMAJbdEkM，點擊連到 B 群噴霧） | 原稿＝`assets/heiwei/heiwei_video_hero.html`（5/14） |
| `03_product_carousel.html` | 全系列 9 支產品橫向輪播（拖曳＋hover 立即選購） | 電腦上原本沒有，2026-09-15 從 Shopline 抄回 |
| `04_parallax_bspray.html` | 視差大圖「何謂美／和你為肌膚之美而生」＋ B 群噴霧滑入區 | 同上 |
| `05_omo_grid.html` | 全系列九宮格（hover 換第二張圖＋立即購買） | 同上；⚠️ 第 9 格 p-img-2 網址結尾多一個 `g`（上線版原樣） |
| `06_brand_stats.html` | 品牌數字 count-up（10 年／14 天／2000 萬） | 同上 |

貼進 Shopline 的位置都是「客製化語法」元件（可用 CSS 變數＋JS）；坑見記憶 `reference_shopline_page_embed`。
