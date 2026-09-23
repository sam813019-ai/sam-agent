# ION BLUE GHK-Cu 動畫（Pinterest 影片 HTML 重製）

來源：Pinterest pin 1085086104001993955（ION BLUE 20 秒直式廣告），2026-09-17 重製。

| 檔案 | 用途 |
|---|---|
| **`shopline_description.html`** | **貼 Shopline「商品描述」用**（原始碼模式整段貼上）。無 JS、無 SVG、無 CSS 變數、無外部字型；波浪屏障用 `clip-path: polygon()` + `@keyframes`，縮放用 container query 單位 |
| `embed.html` | 貼「客製化語法元件」或一般網站用（有 JS/SVG，效果較細；依容器寬度縮放；class 全部 `gk-` 前綴） |
| `index.html` | 單獨開檔預覽（深底置中）；網址加 `?t=8` 可跳到第 8 秒 |
| `make_shopline.py` | 產生 `shopline_description.html` 與 `preview_shopline.html` 的腳本，改幾何/時間軸請改這支再重跑 |

三段時間軸（20s 一輪）：0–10s 分子穿透屏障入細胞 → 10–15s「TIRED OF SKINCARE PROMISES?」→ 15–20s「THANK YOU」。
