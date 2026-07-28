# 美容展轉盤 獎項管理後台 — 設計規格

- 日期：2026-07-28
- 專案：`heiwei-expo-wheel`（原始碼 `/Users/mac/Documents/何謂美/2026美容展/heiwei-expo-wheel/`）
- 關聯：[[project_heiwei_expo_wheel]]

## 目標

做一個 PIN 保護的網頁管理後台 `/admin`，讓使用者不用進 Google 試算表，就能在網頁上**新增/刪除獎項、調整權重、每日限量、總量限制、啟用停用、保底**，並**即時看到每個獎項的發出數量與剩餘量**。試算表仍是唯一真實來源，後台只是它的網頁介面，改完即時同步現場轉盤與 LINE 轉盤。

## 決策紀錄（已確認）

| 項目 | 決定 |
|---|---|
| 網址 | `https://heiwei-expo-wheel.vercel.app/admin` |
| 登入 | 沿用核銷 PIN（環境變數 `STAFF_PIN`，目前 4523），每次請求後端驗證 |
| 編輯範圍 | 完整管理：代碼/啟用/名稱/轉盤文字/權重/每日限量/兌換說明/保底/總量限制，可新增列、刪除列 |
| 庫存顯示 | 每列即時顯示發出/剩餘（總量或每日，依該獎設定）＋重新整理鈕 |
| 資料來源 | Google 試算表「獎品設定」分頁（唯一真實來源）；儲存後清 KV 快取即時生效 |

## 架構

```
/admin (public/admin.html)
  → 輸入 PIN → GET /api/admin/prizes?pin=  → 載入整張獎項表(含停用列)+ 各列庫存計數
  → 表格編輯(改欄位/新增列/刪除列)
  → 儲存 → POST /api/admin/prizes {pin, rows} → 寫回試算表 A2:I + 清快取
  → 🔄 重新整理 → 重新 GET(拿最新庫存數字)
```

後端一支檔案 `api/admin/prizes.js` 用 method 分流（GET 讀 / POST 寫）。讀寫都用既有 service account（同 `lib/sheets.js` 的 JWT），庫存數字讀 `@vercel/kv`。

## 元件與檔案

### 1. `api/admin/prizes.js`（新增）
共用一個 `sheetsClient()`（同現有 JWT 樣式）與 PIN 驗證（`process.env.STAFF_PIN`）。

**`GET /api/admin/prizes?pin=<PIN>`**
1. 驗 PIN，錯→401。
2. 直接讀「獎品設定」`A2:I`（**原始列，含停用中的**，不經 `getPrizeConfig` 的過濾/配色/快取）。
3. 對每一列，依其設定讀 KV 庫存計數：
   - 有總量限制(I)：讀 `stock:total:<id>` → `remaining = 該值(無此鍵則=總量)`、`used = 總量 - remaining`、`mode:'total'`。
   - 否則有每日限量(F)：讀 `stock:<今日YYYYMMDD>:<id>` → `remaining`/`used`、`mode:'daily'`。
   - 皆無：`mode:'none'`（不限量，不回數字）。
   - 剩餘顯示一律 `Math.max(0, remaining)`；used 一律 `cap - max(0,remaining)`（夾在 0..cap）。
4. 回 `{ prizes: [{ code, enabled, name, label, weight, dailyCap, redeem, fallback, totalCap, stock:{mode, cap, used, remaining} }] }`。

**`POST /api/admin/prizes`** body `{ pin, rows:[...] }`
1. 驗 PIN，錯→401。
2. 驗證 rows：每列 `code` 非空且**全表不重複**；`weight` 為 ≥0 數字；至少一個 `enabled`。任何不合→400 附訊息，不寫入。
3. 組出二維陣列（A..I 欄，順序：代碼/啟用(是或空)/名稱/轉盤文字/權重/每日限量/兌換說明/保底(是或空)/總量限制；空值寫空字串）。
4. **安全寫回（無資料遺失視窗）**：
   - 先讀目前 `A2:A` 得 `oldN`。
   - `values.update` `A2:I{1+newN}` 寫入新內容。
   - 若 `oldN > newN`：`values.clear` `A{2+newN}:I{1+oldN}` 清掉多餘舊列。
5. `kv.del('prizes:config')` 清快取。
6. 回 `{ ok:true, count:newN }`。

### 2. `public/admin.html`（新增）
- PIN 輸入畫面（未驗證前不顯示表格）。PIN 存在前端記憶體變數，隨每次請求送出，不寫死。
- 表格欄位：代碼｜啟用(checkbox)｜名稱｜轉盤文字｜權重(number)｜每日限量(number)｜兌換說明｜總量限制(number)｜保底(checkbox)｜**庫存(唯讀)**｜刪除(🗑)。
  - 庫存欄依 `stock.mode` 顯示：`total`→「已發 {used} / 剩 {remaining}（總量 {cap}）」；`daily`→「今日已發 {used} / 剩 {remaining}（每日 {cap}）」；`none`→「不限量」。
- 按鈕：➕ 新增一列（插入空白列，代碼可編輯）、💾 儲存、🔄 重新整理。
- 儲存後顯示成功訊息並自動重新載入（拿回最新庫存）；失敗顯示後端錯誤訊息。
- HEIWEI 灰綠色系，響應式（表格在窄螢幕可橫向捲動）。

### 不需異動
現場轉盤、LINE 轉盤、抽獎與庫存邏輯（`onsite-draw.js`/`draw.js`/`store.js`/`prize-config.js`/`sheets.js`）全部不動——後台只是「獎品設定」分頁的另一個編輯介面。

## 錯誤處理
- PIN 錯 → 401，前端提示「PIN 錯誤」。
- 驗證失敗（代碼空/重複、權重非數字、無啟用項）→ 400 附中文訊息，前端顯示、**不寫入**。
- Sheets/KV 讀取失敗 → 500 附訊息；庫存讀取單列失敗不影響其他列（該列 stock 顯示「—」）。

## 測試
- GET 無 PIN / 錯 PIN → 401；對 PIN → 回整張表含停用列與庫存數字。
- 庫存：對有總量的獎（massage2 總量34）確認 used/remaining 正確；每日限量獎確認以今日鍵計算。
- POST：改權重→存→GET 反映且轉盤 `/api/prizes` 生效；新增一列→存→出現在轉盤；刪除一列→存→消失且無殘留舊列；代碼重複/空→400 不寫入。
- 回歸：現場轉盤 `/onsite`、`/api/onsite-draw`、LINE `/api/draw`、`/api/prizes` 皆正常。

## 上線步驟
1. 部署整包（新增 2 檔）。
2. 開 `/admin` 輸 PIN 4523 → 改一個權重存 → 確認 `/api/prizes` 生效、庫存數字正確。
3. 測新增/刪除各一次。
4. 更新 `部署資訊.md` 記錄後台網址與用途。
