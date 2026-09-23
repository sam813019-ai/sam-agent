# HEIWEI 爆白潤色防曬棒 — 商品描述區塊

夏日清爽風（晴空藍 × 品牌粉 × 奶白）的互動區塊，行動優先。

## ⚠️ 兩個版本，要貼 Shopline 請用 shopline 版

| 檔案 | 用途 |
|---|---|
| **`sunscreen_stick_shopline.html`** | **要貼 Shopline 的就是這支。** 已避開 Shopline 編輯器的所有過濾 |
| `sunscreen_stick.html` | 原始完整版（有 JS、SVG、CSS 變數）。**貼 Shopline 會壞**，留著給自架站或未來別的平台用 |
| `preview_shopline.html` / `preview.html` | 對應的本機預覽檔，由 `make_shopline.sh` 之外的 `make_preview.sh` 產生 |
| `make_shopline.sh` + `image_urls.txt` | 把圖片路徑一次換成 Shopline 網址的小工具 |
| `assets/` | 已壓縮好的圖片（每張 70–150KB），要上傳到 Shopline 圖庫 |

## 上架步驟

1. **上傳圖片**：Shopline 後台 → 商品 → 描述 → 插入圖片，把 `assets/` 裡的 6 張圖上傳，各自複製圖片網址。
2. **填 `image_urls.txt`**：每行 `=` 後面貼上對應網址。
3. **跑工具**：
   ```bash
   bash make_shopline.sh
   ```
   會產生 `sunscreen_stick_shopline_READY.html`。少填哪張它會直接告訴你。
4. **貼上**：商品描述編輯器 → 切換原始碼 `<>` → 貼上 READY 檔的**全部內容** → 儲存。
5. 存檔後用手機開商品頁確認，重點看：圖有沒有破、UV 時段能不能點、FAQ 是不是收合狀態。

## Shopline 商品描述的過濾規則（2026-08-20 實測）

貼上去之後 Shopline 會淨化 HTML，這是實際比對線上原始碼得到的結果：

**❌ 會被拿掉**

| 東西 | 後果 |
|---|---|
| CSS 變數宣告（`--x:` ）但保留 `var(--x)` | 所有顏色失效，整頁變白底黑字 ← **最致命** |
| `<svg>` | 圖示全部消失 |
| `<details>`（`<summary>` 會留著） | 手風琴全部攤開、不能收合 |
| `<script>` | 所有 JS 互動失效 |
| CSS 的 at-import 字型 | 字型退回系統字型 |
| `aria-*`、`loading="lazy"` 屬性 | 無障礙標記消失（不影響顯示） |

**✅ 會保留**

`<style>` 標籤本身、一般 CSS 屬性、`@media`、`@keyframes`、CSS 動畫、
`<input type="radio">`、`<input type="checkbox">`、`:checked` 選擇器、
`<table>`、`<sup>`、行內 `style=""`、偽元素 `::before/::after`

另外 Shopline 會把 `<img src>` 換成自家 lazy-load（原路徑搬到 `data-src`），
所以**圖片一定要用 Shopline 圖庫網址**，本機相對路徑不會自己變成可用網址。

## shopline 版做了哪些替換

| 原本 | 改成 |
|---|---|
| CSS 變數 | 全部展開成實際色碼（`#143845`、`#2E9FC9`…） |
| `<script>` 驅動的 UV 滑桿 | 早晨／中午／午後／傍晚 四段 radio 切換，純 CSS |
| `<details>` 成分卡與 FAQ | `<input type="checkbox">` + `:checked` |
| `<svg>` 圖示 | CSS 畫的圓點與勾勾（`::before` 旋轉邊框） |
| Google Fonts at-import | 系統字型堆疊（Noto Sans TC / PingFang TC / 微軟正黑） |
| flex / grid 版面 | `inline-block` + `table`，相容性更保險 |

功能已實測（本機模擬點擊）：UV 四段切換正常、三效合一分頁正常、
成分卡與 FAQ 可展開可收合、無水平捲動、6 張圖全載入。

## 頁面結構

1. 首屏 — 陽光光暈動態、SPF50+ ★★★★
2. 四大賣點
3. 痛點 — 夏天不想擦防曬的三個理由
4. **UV 時光機（互動）** — 四段時間切換
5. **三效合一（互動）** — 防曬／潤色／保養 分頁
6. **四大成分（互動）** — 點開展開說明
7. 差異對比表
8. 使用三步驟
9. 日常情境
10. 商品資訊 ＋ 使用注意事項
11. **FAQ（互動）** — 6 題
12. 結尾

## 待確認

- 容量取自素材標示 **NET 15g / 0.53oz**，若實際規格不同請改「商品資訊」那段。
- 售價、優惠、贈品沒寫進描述（Shopline 商品頁本身有價格區）。
