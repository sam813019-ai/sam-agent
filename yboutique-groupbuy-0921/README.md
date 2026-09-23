# 楊楊（楠梓 YB）× HEIWEI 何謂美｜生日慶團（2026/9/21–9/27）

YB 第二團，主題是團主**楊楊的生日慶**。四品項：爆白潤色防曬棒（新品）、爆白防曬隔離噴霧、B 群保濕噴霧、**高端精華水安瓶 50ml（本團新增）**。

- **版型**＝Lucy 9/15 那版（形象照首屏＋團主名牌＋好康＋品項＋付款＋愛用清單標題＋注意事項），商品本身用 Shopline 商品區塊呈現
- **配色**＝「香檳生日」，取自楊楊生日形象照（奶油牆面／香檳金／珍珠白／玫瑰膚），首屏加了 *Happy Birthday* 花體字與金色星光
- **價格**＝報價表「楠梓YB」分頁「以葳核准」欄（與 8 月團相同，見 `團主確認文案.md`）

## 檔案結構：一個區塊一支檔

```
00_header.html      首屏（形象照 ＋ Happy Birthday ＋ 團主名牌 ＋ 開團倒數，含倒數 JS）
01_perks.html       生日慶好康（免運／前 200 名旅行組／滿 4000 膠囊）
02_items.html       團購品項 ×4（產品圖直接吃 Shopline 圖床；桌機 2×2）
03_payment.html     付款方式（固定四項，無超商貨到付款）
04_picks.html       「楊楊的生日愛用清單」主標題 ← 這段之後接 Shopline 全部商品
05_notice.html      注意事項

_shell_head.html / _shell_foot.html   整頁外殼（title／body 底色／頁尾）
build.sh            依編號組成 index.html
index.html          ← 自動產生，不要直接改
assets/             yb_hero.jpg（首屏，長邊 1200）、yb_avatar.jpg（名牌圓圖 400×400）— 本機備份
_pdf_source.html    開團確認書來源 → HEIWEI_團購開團確認書_楠梓YB_20260921.pdf
團主確認文案.md      可貼 LINE 的確認文案＋內部備註
```

改法：改 `0X_*.html` → 跑 `bash build.sh` → `open index.html`。

## 檔期與門檻

| 項目 | 設定 | 改哪裡 |
|---|---|---|
| 開團／結團 | 2026/9/21（一）00:00 — 9/27（日）23:59 | `00_header.html` 的 `START`／`END` ＋ `date-badge` 文字；`_shell_head/_foot`、`_pdf_source` |
| 免運 | 單筆滿 **$1,000** | `01_perks.html`、`05_notice.html` |
| 限量禮 | **前 200 名下單**送旅行組（洗面乳 15ml ＋ 水安瓶 15ml） | 同上 |
| 滿額禮 | 單筆滿 **$4,000** 送妝前智能 5GF 柔敏膠囊 **1 盒** | 同上 |

## 形象照（已上傳 Shopline 圖床，頁面用絕對網址）

| 用途 | 網址 |
|---|---|
| 首屏 | `https://img.shoplineapp.com/media/image_clips/6aacee5916a427000b4480e7/original.jpg?1789718105=&owner_id=648be21890a1b5008d602f77` |
| 名牌頭像 | `https://img.shoplineapp.com/media/image_clips/6aacee5a963f6b09e0a16319/original.jpg?1789718106=&owner_id=648be21890a1b5008d602f77` |

原檔 `~/Downloads/S__36266296.jpg`（1045×1567）。桌機版首屏用 `object-position:50% 18%` 把臉留在框內，換照片要重調。

## 配色（香檳生日）

每支區塊檔的 `<style>` 最上面都有一份相同的變數宣告，改色要**每支都改**（或整批 sed）：

| 變數 | 色值 | 用途 |
|---|---|---|
| `--gold` | `#C9A15C` 香檳金 | 主色：標題色塊、編號圓、NEW 標籤 |
| `--gold-dk` | `#8F6A2E` | 標題字、倒數數字 |
| `--gold-soft` / `--gold-mist` | `#F4E4C8` / `#FCF6EC` | 淺底 |
| `--rose` / `--rose-soft` | `#DDA089` / `#FBE8E0` | 副色：「限量」標籤、新品卡片 |
| `--ink` / `--muted` / `--line` | `#3A2E25` / `#8A7565` / `#F0E4D3` | 文字與線 |

body 底色 `#FFF8EE` 在 `_shell_head.html`；首屏文字帶漸層 `#FBF3E6 → #F3DCBF` 接照片頂端的奶油牆。

## 已確認（2026-09-18）

- 前 200 名依**下單順序**（不看付款時間）
- 旅行組與膠囊**可疊加**
- 品名「妝前智能 5GF 柔敏膠囊」

## ⚠️ 待補

1. **高端精華水安瓶的開團價**還沒給：團購頁品項區已列，但確認書 PDF 的價格表沒有它，拿到價格後補進 `_pdf_source.html` 重產。
2. `04_picks.html` 之後要接 Shopline 的全部商品。
