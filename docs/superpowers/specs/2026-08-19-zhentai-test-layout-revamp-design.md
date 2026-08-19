# 振太機械網站 zhentai-test 版面調整設計

日期：2026-08-19
目標部署：`/srv/htdocs/wp-content/uploads/zhentai-test/`
線上驗證網址：`https://waynebear20996-mlebi.wpcomstaging.com/wp-content/uploads/zhentai-test/portal.html`

## 背景

客戶檢視 `zhentai-test/`（工程師自包含上傳包，全站相對路徑）後提出六項調整。
本次**只改 `zhentai-test/`**，不動 `zhentai/`。

工作目錄：`/Users/mac/Downloads/sam-agent/zhentai-test-work/`
（已用 curl 從線上抓下最新 7 個檔：index.html / products.html / contact.html / portal.html / jt-data.js / jt-ui.js / jt-ui.css）

受影響檔案：`index.html`、`products.html`、`contact.html`、`jt-ui.js`、`jt-ui.css`
（`jt-data.js`、`portal.html` 不動）

### ⚠️ 共用檔載入現況（實作前必讀）

實際檢查線上檔案後確認，三頁載入的資源**並不一致**：

| 檔案 | jt-data.js | jt-ui.js | jt-ui.css |
|---|---|---|---|
| `index.html` | `?v=4` | `?v=7` | `?v=6` |
| `products.html` | `?v=4` | `?v=7` | **未載入** |
| `contact.html` | `?v=4` | 未載入 | 未載入 |

**`products.html` 不載入 `jt-ui.css`，而是有一份自己內嵌的卡片／modal CSS**
（`.prod-card`、`.prod-card .mdl`、`.prod-card .foot`、`.jt-desc-list` 等都在 `products.html` 的
`<style>` 內，約 line 540–840）。`jt-ui.css` 只服務 `index.html`。

**因此凡是卡片或 modal 的 CSS 改動，都必須「改兩處」：**
1. `jt-ui.css`（給首頁用）
2. `products.html` 內嵌 `<style>`（給產品頁用）

只改一處會造成兩頁樣式不一致。JS 改動（`jt-ui.js`）則兩頁共用，改一次即可。

---

## 一、Hero 標題縮小

**檔案**：`index.html`

| 選擇器 | 現值 | 新值 |
|---|---|---|
| `.hero-h1`（line 876） | `font-size:clamp(2.4rem,6.2vw,5.2rem)` | `font-size:clamp(1.9rem,4.2vw,3.4rem)` |
| `.hero-h1`（line 814，手機 media query） | `font-size:2rem` | `font-size:1.7rem` |

文案「品質第一，信譽至上。」內容不變（此項未要求去標點）。
`line-height`、`letter-spacing`、`text-shadow`、`.hero-h1 .y` 黃字皆不動。
副標、CTA 按鈕不動。

---

## 二、最新產品 ↔ 公司簡介 對調，公司簡介整區重做

**檔案**：`index.html`

### 2.1 區塊對調

DOM 順序由：`hero → latest → about → products → cat-news → contact`
改為：**`hero → about → latest → products → cat-news → contact`**

連帶修改：

- 導覽列（line ~818-819）：`02` 對應「公司簡介 `#about`」、`03` 對應「最新產品 `#latest`」，順序互換
- 區塊小標籤 `sec-label`：
  - about 區：`[03] 公司簡介 · About` → `[02] 公司簡介 · About`（三語同步）
  - latest 區：`[02] 最新產品 · Latest Products` → `[03] 最新產品 · Latest Products`（三語同步）
- 錨點 id `#about` / `#latest` **維持不變**（外部連結、手機選單 clone 都靠它）
- `products.html`、`contact.html` 的導覽列同樣是 6 項，**必須同步改順序與編號**，三頁一致

### 2.2 公司簡介新版面（參考 Victor Taichung）

保留現有內容資產，只換排列方式：

**版面結構（由上而下）**

1. **主色塊卡 + 大數字並排**
   - 左：大圓角色塊卡（`border-radius:28px`，底色用品牌鋼藍 `#202830` 系深色），內含
     - 區塊小標 `[02] 公司簡介 · About`
     - 主標題（沿用 1985 年份字 + 現有 about-statement 文案）
     - 圓形箭頭鈕「更多 →」→ 連到 `contact.html`（三語：`More →` / `Thêm →`）
   - 右：一組大數字 **`60+` / 遍布出口國**，字級 `clamp(48px,7vw,110px)`，套用同一支 count-up
     （與下方數據區的 60+ 是刻意的重點呼應，非重複錯誤；數據區四項全部保留不刪）
2. **錯落照片拼貼**
   - 三格照片，高低錯開（第二格 `margin-top` 下沉、第三格上提），色塊卡下緣壓住第一格上緣
   - 照片來源：現有 `media/about-factory.jpg`、`media/hero-poster.jpg`，第三格用 `about-factory.jpg` 以不同 `object-position` 裁切
   - **每格用獨立 class（`.ab-ph-1/2/3`）與獨立 `<img src>`，方便日後單張替換**
3. **三欄卡片**（經營理念 / 製造能力 / 全球市場）
   - 內容文案完全沿用現有三語 `data-*`
   - 樣式由現有 `.about-col`（邊框分隔）改為卡片：淺底、圓角 16px、內距 32px
4. **數據區**（40+ / 60+ / 200+ / 3,500坪）
   - **count-up 動畫（IntersectionObserver + rAF + easeOutCubic）完整保留**，只調樣式間距
5. **時間軸**（1985 / 1994 / 2003 / 2012 / 2019 / 2026）
   - **保留，放在整區最下方**，橫向 `tl-track` 結構與三語文案不動

**背景處理**

現有 `.about::before` 使用 `background-attachment:fixed` 視差 + 深色遮罩。
新版改為**明亮分層**：整區底色改淺（`--paper` 系），視差背景移除，改由色塊卡與照片拼貼提供層次。
連帶移除 `.about .xxx { color:... !important }` 那批深色覆寫規則，並移除已無用的
`@supports (-webkit-touch-callout:none)` iOS 降級規則。

**RWD**

- ≤980px：色塊卡與大數字改上下排列
- ≤820px：照片拼貼改 1 欄（取消錯落位移）、三欄卡片改 1 欄
- 時間軸沿用現有既有的手機處理

---

## 三、產品線標題縮小

**檔案**：`index.html`、`products.html`（兩檔都有同一份 `.prod-title`，line 486）

| 選擇器 | 現值 | 新值 |
|---|---|---|
| `.prod-title` | `font-size:clamp(48px,6.4vw,96px)` | `font-size:clamp(34px,4.2vw,60px)` |

`font-family`、`font-weight:900`、`line-height:.95`、`.prod-title .y` 黃字不動。
文案「產品線 / 四大系列」不變。

---

## 四、產品卡去除四個標記，資料卡放大加粗

### 4.1 卡片移除標記

**檔案**：`jt-ui.js`（`window.jtRenderProducts`，line ~44-66）

移除卡片上這四個東西：

1. 右上角標籤 `PHOTO` / `360°` / `SET ×N` / `準備中` → 刪除 `<div class="pc-top"><div class="mdl">${tag}</div></div>`
2. 底部 `VIEW PHOTO` / `VIEW 360` / `VIEW SET` 文字 → 刪除 `.foot` 內 `<span>${foot}</span>`
3. 底部 `→` 箭頭 → 刪除 `<span class="arr">→</span>`
4. 整個 `<div class="foot">` 容器一併移除

移除後卡片內容為：**左上編號 `[01 / 12]` + 去背產品圖 + 中文名 + 英文名**。

`tag` / `foot` 兩個變數在移除後不再被使用，一併刪除宣告（避免死碼）。
`jtMode(p)` 仍需保留 —— `jtCardThumb(p)` 與 modal 開啟邏輯都依賴它。

**檔案**：`jt-ui.css` **與** `products.html` 內嵌 `<style>`（兩處都要改，見上方「共用檔載入現況」）

移除已無對應 DOM 的規則：`.prod-card .mdl`、`.prod-card .foot`、`.prod-card:hover .foot`、
`.prod-card .arr`、`.prod-card:hover .arr`、`.prod-card .icon`（`.icon` 現行也未被渲染）。
`.pc-top` 若移除後為空，同步刪除規則。

**保留**：`.idx-no`（編號）、`.pc-img`（hover 浮現圖）、`.pc-grad`（底部漸層，保文字可讀）、
`.prod-card h5` / `.en`、群組縮圖上的 `.v3d` 角標（那是 modal 內的群組網格，不在本次範圍）。

### 4.2 Modal 資料卡放大 + 文字加大加粗

**檔案**：`products.html`、`index.html`（兩檔各有一份相同的 modal CSS）

| 選擇器 | 現值 | 新值 |
|---|---|---|
| `.jt-modal-inner`（桌機加大處，line ~843） | `width:min(1180px,96vw)` | `width:min(1320px,96vw)` |
| `.jt-modal-card`（line ~844） | `min-height:560px` | `min-height:640px` |
| `.jt-modal-name-zh` | `font-size:clamp(18px,2.2vw,26px)` | `font-size:clamp(22px,2.6vw,34px)` |
| `.jt-modal-name-en` | `font-size:11px` | `font-size:13px` |

**檔案**：`jt-ui.css` **與** `products.html` 內嵌 `<style>`（兩處都要改）

| 選擇器 | 現值 | 新值 |
|---|---|---|
| `.jt-desc-list li` | `font-size:13.5px; line-height:1.6` | `font-size:16px; font-weight:500; line-height:1.75` |
| `.jt-desc-title` | `font-size:11px` | `font-size:13px` |
| `.jt-spec-row` | `font-size:13px` | `font-size:15px` |

`.jt-desc-list li::before` 黃色菱形 bullet 的 `top` 由 `9px` 調為 `11px` 以對齊放大後的行高。

**手機不動**：`@media(max-width:680px)` 內 `.jt-modal-info-col{padding:28px 24px}`、
`.jt-modal-photo{max-height:300px}` 等既有規則維持，避免手機爆版。

---

## 五、聯絡標題縮小 + 去標點

**檔案**：`index.html`（line ~604 CSS、line ~1190 HTML）、`contact.html`（line ~641 CSS、line ~880 HTML）

### 5.1 字級

| 選擇器 | 現值 | 新值 |
|---|---|---|
| `.contact-title` | `font-size:clamp(52px,7vw,110px)` | `font-size:clamp(34px,4.6vw,64px)` |

### 5.2 文案去標點（三語）

`.contact-title` 的 `data-zh` / `data-en` / `data-vi` 與 fallback 內文同步改：

| 語言 | 現值 | 新值 |
|---|---|---|
| zh | `把你的生產線<br><span class="y">自動化</span>的第<span class="r">一步</span>，<br>從一封信開始。` | `把你的生產線<br><span class="y">自動化</span>的第<span class="r">一步</span><br>從一封信開始` |
| en | `The first <span class="y">step</span> to <span class="r">automate</span><br>your production line<br>starts with one message.` | 同左，**刪除句尾 `.`** |
| vi | `Bước <span class="y">đầu tiên</span> để <span class="r">tự động hóa</span><br>dây chuyền của bạn<br>bắt đầu từ một tin nhắn.` | 同左，**刪除句尾 `.`** |

註：`data-i18n-html="1"` 屬性內的 HTML 用 `&quot;` 逸出，改寫時務必維持逸出格式，
否則 `jtApplyI18n` 塞入的 class 會失效（黃字／紅字消失）。

---

## 六、四間分公司資料

### 6.1 contact.html —— 改成 2×2 四張卡

移除現有兩張卡（`HQ · 總公司` 振太機械、`FASTENER DIV.` 晨泰螺絲機械），
改為下列四張。`.contact-grid` 由 `grid-template-columns:1fr 1fr` 保持 2 欄（自然形成 2×2），
`@media(max-width:820px)` 改 1 欄。

每張卡欄位：`badge`（據點標籤）、中文公司名、英文公司名、中文地址、英文地址、Tel、Fax、Email。
Tel 用 `<a href="tel:">`、Email 用 `<a href="mailto:">`。
中文名／中文地址掛 `data-zh/data-en/data-vi`；英文名與英文地址為固定英文，不需 i18n。
現有卡片的 `Hours`（營業時間）欄位僅台灣總公司保留，其餘三間不列（客戶未提供）。

**卡 1 — 台灣總公司**
```
badge:   HQ · 台灣總公司 / Taiwan
中文名:  振太機械企業股份有限公司
英文名:  JENN TAI MACHINE ENTERPRISE CO., LTD.
中文址:  高雄市岡山區岡山路 610 巷 23 號
英文址:  No.23, Lane 610, Gangshan Rd, Gangshan Dist, Kaohsiung City, Taiwan
Tel:     +886-7-6210108 / 6210109
Fax:     +886-7-6216766
Email:   chentai@jenntai.com.tw
Email:   chentai.chentai@msa.hinet.net
```

**卡 2 — 上海分公司**
```
badge:   上海分公司 / Shanghai
中文名:  上海振好機械有限公司
英文名:  Shanghai Chenhao Machinery Co., Ltd.
中文址:  上海市嘉定區安亭鎮杭桂路 1112 號
英文址:  No.1112, Hanggui Rd, Anting Town, Jiading District, Shanghai
Tel:     +86-21-69592750 / 69592751
Fax:     +86-21-69592752
Email:   zhenhaojixie@vip.126.com
```

**卡 3 — 浙江分公司**
```
badge:   浙江分公司 / Zhejiang
中文名:  嘉興振太機械有限公司
英文名:  Jiaxing Jenntai Machine Co., Ltd.
中文址:  浙江省嘉興市嘉善縣姚莊鎮福源路 66 號
英文址:  No.66, Fuyuan Rd, Yaozhuang Town, Jiashan County, Jiaxing City, Zhejiang Province
Tel:     +86-573-84566588 / 84566589
Fax:     +86-573-84566586
Email:   jiaxingjenntai@jenntai.com.cn
```

**卡 4 — 越南分公司**
```
badge:   越南分公司 / Vietnam
中文名:  平陽振太責任有限公司
英文名:  Binh Duong Jenn Tai Limited Liability Company
中文址:  越南胡志明市平陽坊神浪 3 工業區 N1 路旁 6B 地塊 CN19
英文址:  CN19, Lo 6B, Giap Duong N1, KCN Song Than 3, Phuong Binh Duong, TP. Ho Chi Minh, Vietnam
Tel:     +84-274-3810082 / +84-961236588
Fax:     +84-274-3819983
Email:   zhentai118.vn@gmail.com
```

**資料訂正說明**（客戶原稿 typo，實作時採正確拼法）：
- 浙江「Emal:」→ `Email:`
- 越南「Emai:」→ `Email:`
- 越南「limited liabity company」→ `Limited Liability Company`
- 中國兩間地址原稿為簡體，中文版統一改繁體（英文址照原稿）

**中文地址三語處理**：`data-zh` 用上表中文址，`data-en` 用英文址，`data-vi` 沿用英文址
（越南文地址由越南分公司後續校對，與現有越南文機翻待校對狀態一致）。

### 6.2 contact.html —— 頁尾 footer

footer 現寫死台灣總公司地址一行，**維持不變**（不列四間，避免頁尾過長）。

### 6.3 index.html —— 首頁聯絡區

首頁 `<section class="contact">` **只留台灣總公司**一張卡，
下方加一個文字連結 **「查看全部據點 →」**（三語：`View all offices →` / `Xem tất cả văn phòng →`）
連到 `contact.html`。首頁不放另外三間。

---

## 部署與驗證

### 部署方式

沿用既有 Novamira MCP `execute-php` 流程（`scratchpad/nova.py` 用戶端）：

1. 檔案 base64 分塊 → `file_put_contents($tmp, $chunk, FILE_APPEND)`
2. `base64_decode` 寫入 `/srv/htdocs/wp-content/uploads/zhentai-test/<檔名>`
3. **逐檔比對 `filesize()` 與本機一致**

上傳前先把伺服器原檔備份成 `*.bak-20260819`（index.html / products.html / contact.html / jt-ui.js / jt-ui.css）。

### 快取處理（必做，否則客戶看到舊版）

1. **版本號 bump**，依各頁實際載入的資源（見上方「共用檔載入現況」表）：
   - `index.html`：`jt-ui.js?v=7 → v=8`、`jt-ui.css?v=6 → v=8`
   - `products.html`：`jt-ui.js?v=7 → v=8`（此頁無 jt-ui.css）
   - `contact.html`：只有 `jt-data.js?v=4`，本次不改 jt-data.js，**版本號維持不變**
   - 三頁 HTML 本身為同名覆蓋，靠下方整域 purge 生效
2. 部署後執行整域 purge：`Edge_Cache_Plugin::get_instance()->purge_domain_now('manual')`
   （單 URI 的 `purge_uris_now` 會 Authorization failed，不可用）

### 驗證

用 Playwright（`playwright-core` + 系統 Chrome，`scratchpad/pw/`）跑真瀏覽器，**不用 curl**
（curl 可能命中不同 CDN cache variant 導致誤判）。逐項確認：

| # | 驗證項目 |
|---|---|
| 1 | 首頁 hero 標題字級縮小，未斷行破版 |
| 2 | 首頁區塊順序為 公司簡介 → 最新產品；導覽 02/03 對調；三頁導覽一致；`#about`/`#latest` 錨點可跳 |
| 3 | 公司簡介新版面渲染正常；count-up 數字有跑；時間軸在最下方 |
| 4 | 產品線標題縮小（index + products 兩頁） |
| 5 | 產品卡無 PHOTO/360°/VIEW/箭頭四個標記；點卡片仍能開 modal |
| 6 | modal 加大、產品名與說明字放大加粗；360° 產品仍能轉動（241 影格載入 0 錯誤） |
| 7 | 聯絡標題縮小且無標點（zh/en/vi 三語各驗） |
| 8 | contact.html 四張分公司卡內容正確、tel/mailto 可點 |
| 9 | 首頁聯絡區只有台灣總公司 + 「查看全部據點」連結可跳 contact.html |
| 10 | 三語切換（中/EN/VI）全站 0 JS 錯誤 |
| 11 | 390px 手機視窗：≡ 選單開合正常、四張卡 1 欄、modal 不爆版 |

---

## 不做（本次範圍外）

- `zhentai/`（舊版）不同步修改
- `jt-data.js` 產品資料不動
- `portal.html`、`360tour/` 3D 展覽館不動
- 越南文校對（維持機翻，待越南分公司處理）
- 轉正式網域 `jenntai.com.tw`（等客戶確認後另案處理）

---

## 已知風險

1. **公司簡介整區重做**是本次最大改動，深色視差背景改明亮分層後，
   與上下相鄰區塊（hero 深色、最新產品淺色）的銜接需實際檢視調整。
2. **區塊對調牽動三頁導覽列**，漏改任一頁會造成編號不一致。
3. **CDN edge cache 是歷史踩雷點**，`?v` 未 bump 或未 purge 會讓客戶看到舊版並誤判沒改。
