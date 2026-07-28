# HEIWEI 美容展「現場即抽即中」轉盤 — 設計規格

- 日期：2026-07-28
- 專案：`heiwei-expo-wheel`（原始碼 `/Users/mac/Documents/何謂美/2026美容展/heiwei-expo-wheel/`）
- 關聯：[[project_heiwei_expo_wheel]]、[[project_beauty_expo_2026]]

## 目標

在現有美容展轉盤專案中，新增一個**現場即抽即中**的轉盤入口：客人現場消費即可轉，
**不需 Email/LINE 登入認證、不發兌換碼、不需櫃檯核銷**，轉到什麼店員就現場給什麼。
後台的獎項與中獎機率**完全沿用現有 LINE 轉盤那份設定**（同一份 Google 表格分頁、同一套限量庫存）。

## 決策紀錄（已與使用者確認）

| 項目 | 決定 |
|---|---|
| 部署方式 | 現有 `heiwei-expo-wheel` 專案新增頁面與 API（共用同一 Vercel/Redis/表格）|
| 網址 | `https://heiwei-expo-wheel.vercel.app/onsite` |
| 認證 | 無。開頁即可轉 |
| 兌換/核銷 | 無。轉到即給 |
| 重轉控制 | 完全不鎖，可連續轉（平台由現場店員掌控）|
| 獎項/機率設定 | **完全共用**現有「獎品設定」分頁，改一處兩邊一起改 |
| 限量庫存 | **完全共用**同一套每日限量計數（現場抽走大獎，LINE 版同步扣，不會超發）|
| 中獎紀錄 | 寫入新分頁「現場中獎紀錄」，只記「時間 + 獎項」，不存任何個資 |

## 架構

現場版與 LINE 版共用底層設定與庫存，只差在「入口」與「產出」：

| | 現場版（新）| LINE 版（現有，不動）|
|---|---|---|
| 入口 | `/onsite`（純網頁，無 SDK）| `/`（LIFF）|
| 認證 | 無 | LINE 登入 + Email |
| 抽獎 API | `POST /api/onsite-draw` | `POST /api/draw` |
| 產出 | 畫面顯示獎項，店員現場發 | 兌換碼 + LINE 推播 + `/staff` 核銷 |
| 重轉 | 不鎖 | 每人限一次（`draw:<userId>` 冪等）|
| 獎項設定 | `getPrizeConfig()` ← 同「獎品設定」分頁 | 同左 |
| 限量計數 | `takeStock(id, cap)` ← 同 `stock:<日>:<id>` key | 同左 |

## 元件與檔案異動

### 1. `public/onsite.html`（新增）
- 純網頁，**不載入 LINE SDK、不需 Email**，開頁即可用。
- 進頁 `GET /api/prizes`（沿用現有端點）取得轉盤格子（名稱/顯示文字/顏色），動態畫盤，
  與 LINE 版轉盤外觀一致；改表格約 60 秒生效免部署。
- 中央大按鈕「開始抽獎」→ `POST /api/onsite-draw`（不帶任何身分）→ 指針轉到回傳的獎項 →
  **大字顯示中獎獎項名稱**（讓店員知道要發什麼）。
- 結果下方一顆「再抽一次／下一位」按鈕，點了回到待轉狀態，不鎖、可連續轉。
- 全螢幕、字大、按鈕大，適合現場觸控；沿用 HEIWEI 灰綠色系。
- 可用 query 參數控制，例如 `?demo=1` 走前端假抽（測試用），預設正式。

### 2. `api/onsite-draw.js`（新增）
`POST /api/onsite-draw`，body 可為空：
1. `getPrizeConfig()` 讀「獎品設定」分頁（含快取）。
2. 依 `weight` 權重隨機抽一個獎（沿用 LINE 版 `pickPrize` 演算法）。
3. `takeStock(prize.id, prize.dailyCap)` 扣共用庫存；發完 → 改給保底獎（`fallbackId`）。
4. `logOnsiteDraw({ prizeFull })` 寫一列到「現場中獎紀錄」。
5. 回傳 `{ prizeId, prizeFull, label }` 給前端轉盤定位與顯示。

**不做**：不驗身分、不發兌換碼、不寫 `draw:<userId>`、不推播 LINE、不做冪等。

### 3. `lib/sheets.js`（新增一個函式，不動既有）
```js
// 現場即抽即中：只記時間 + 獎項，不存個資。分頁「現場中獎紀錄」欄位 A中獎時間 B獎項
export async function logOnsiteDraw({ prizeFull }) { ... append `現場中獎紀錄!A:B` ... }
```
寫入失敗只記 log，不影響抽獎主流程（與既有 `logDraw` 相同容錯策略）。

### 4. Google 表格（同一份 `EXPO_SHEET_ID`）
- 新增分頁「**現場中獎紀錄**」，第一列表頭：`A 中獎時間`、`B 獎項`。
- 若分頁不存在，append 會失敗；上線步驟需先建好此分頁（部署時一併以 Sheets API 建立或手動建立）。

### 不需異動
`api/draw.js`、`lib/prize-config.js`、`lib/store.js`、`lib/line.js`、`api/prizes.js`、
`public/index.html`、`public/staff.html`、`public/delivery.html` 全部**不動** → LINE 轉盤零風險。

## 資料流

```
現場平板開 /onsite
  → GET /api/prizes → 畫盤（同 LINE 版外觀）
  → 點「開始抽獎」→ POST /api/onsite-draw
       ├─ getPrizeConfig()（同一份設定）
       ├─ pickPrize()（權重隨機）
       ├─ takeStock()（共用限量，發完改保底）
       └─ logOnsiteDraw()（寫「現場中獎紀錄」時間+獎項）
  → 指針轉到結果，大字顯示獎項 → 店員現場發
  → 點「再抽一次」→ 回待轉，可連續轉
```

## 錯誤處理
- `/api/onsite-draw` 任一步失敗回 400/500 並帶訊息；前端顯示「請再試一次」不當機。
- Google 表格/Redis 失效時：`getPrizeConfig()` 有內建預設備援；`logOnsiteDraw` 失敗不擋抽獎；
  `takeStock` 在 Redis 失效時預設放行（沿用現有行為），確保現場不因後端小問題卡住。

## 測試
- `/api/onsite-draw` 正常回傳結構（`prizeId/prizeFull`）。
- 限量發完 → 回保底獎（把某獎 dailyCap 設 0 驗證）。
- 與 LINE 版共用庫存：現場抽走一個限量獎後，`stock:<日>:<id>` 計數同步下降。
- `logOnsiteDraw` 正確寫入「現場中獎紀錄」；分頁不存在時不影響抽獎。
- LINE 版 `/api/draw`、`/staff` 核銷流程回歸未壞。

## 上線步驟
1. 建 Google 表格分頁「現場中獎紀錄」（A中獎時間 B獎項）。
2. `vercel deploy --prod --yes` 部署整包（新增 2 檔 + sheets.js 小改）。
3. 開 `https://heiwei-expo-wheel.vercel.app/onsite` 現場實測：連轉數次、限量發完轉保底、
   確認表格有紀錄、LINE 轉盤仍正常。
4. 現場平板/手機加到主畫面全螢幕使用（可另做 QR code 給現場工作人員）。
