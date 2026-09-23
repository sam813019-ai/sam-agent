# 美容展宅配申請系統 — 設計規格

日期：2026-07-10
專案：`/Users/mac/Documents/何謂美/2026美容展/heiwei-expo-wheel/`（沿用美容展抽獎轉盤同一 Vercel 專案 heiwei-expo-wheel）

## 目的
台北美容展（8/13–8/17）現場：客人結帳後若無現貨、或購買量大無法帶回，掃 QR 填宅配表單，由倉庫出貨。系統自動抓 LINE userId，發兩則通知：①收到申請（含商品明細）②已出貨。

## 使用流程
```
結帳 → 櫃檯 QR code → LINE 開 LIFF 表單（自動抓 userId、姓名預填 LINE 名稱）
 → 填：姓名/電話/宅配地址/備註 + 勾選商品+數量
 → 送出 → 產生配送單號 DL-XXXXX → 寫入試算表「配送申請」→ 推播①
 → 倉庫出貨後在試算表把狀態下拉改「已出貨」→ GAS onEdit → /api/ship-notify → 推播② + 回填出貨時間
```

## 元件

### 1. `public/delivery.html`（客人表單，LIFF）
- 沿用轉盤 HEIWEI 灰綠極簡視覺與 LIFF 流程（channel `2000280599`）。
- **需新開一個 LIFF**：Endpoint `https://heiwei-expo-wheel.vercel.app/delivery`、Size Full、scope profile+openid（使用者在 LINE Developers 操作，LIFF ID 拿到後填入 CONFIG）。
- 欄位：
  - 姓名（required，預填 LINE displayName，可改）
  - 電話（required，`tel` 鍵盤，台灣手機格式粗驗 `09xxxxxxxx`）
  - 宅配地址（required）
  - 備註（optional）
  - 商品勾選＋數量（檔案開頭 `DELIVERY_PRODUCTS` 陣列維護，9 支正品，含中文名；展場組合品項可隨時加，改完 redeploy）
- 至少勾 1 項才能送出；送出後顯示成功畫面＋配送單號（推播失敗也看得到單號）。

### 2. `api/delivery.js`
1. `verifyIdToken`（沿用 lib/line.js）→ userId、name。
2. 驗證：items 非空、電話格式、地址非空。
3. 生成配送單號 `DL-` + 5 碼（沿用 genCode 字元集）。
4. 寫試算表（沿用 lib/sheets.js 的 service account，同一份試算表 `1jKz4O...`）新分頁 **「配送申請」**，欄位：
   `A申請時間 B LINE名稱 C LINE userId D姓名 E電話 F宅配地址 G商品明細 H備註 I配送單號 J狀態 K出貨時間`
   - 商品明細為文字：「爆白防曬噴霧×1、5D面膜×3」
   - 狀態初始「待出貨」
5. 推播①（沿用 pushDrawResult 模式，新函式 `pushDeliveryReceived`）：收到申請＋明細＋單號＋「我們將由倉庫為您出貨」。
6. 容錯：試算表/推播失敗不擋主流程（console.error），回傳成功＋單號。

### 3. 倉庫端 = 試算表直接操作（不做管理頁）
- 「配送申請」J欄（狀態）設**資料驗證下拉**：待出貨／已出貨（由 seed 腳本用 Sheets API batchUpdate 設定）。
- **試算表綁定 Apps Script**（使用者貼上，程式碼由本專案提供）：
  - installable **onEdit** 觸發：偵測「配送申請」分頁 J 欄變為「已出貨」且 K（出貨時間）為空
  - `UrlFetchApp.fetch` POST `https://heiwei-expo-wheel.vercel.app/api/ship-notify`，body `{code, userId, items, secret}`
  - 成功後回填 K 出貨時間（台北時間）
  - 防重：K 已有值不動作；API 回錯誤時在 K 填「通知失敗」供人工判讀
- **`api/ship-notify.js`**：驗 `secret === process.env.SHIP_SECRET`（新 env，隨機生成）→ 推播②「您的商品已出貨，請留意收件 📦（單號 DL-XXXXX）」→ 回 200。

### 4. QR code
- 產生 `https://liff.line.me/<新LIFF_ID>` 的 QR 圖檔（PNG，給現場櫃檯印製）。

## 不做（YAGNI）
- 不做倉庫管理頁／核銷頁擴充（使用者明確要求試算表操作即可）。
- 不做物流單號回填、金額計算、庫存扣減。
- 不擋同一人多次申請（客人可分批寄送，屬正常）。

## 前置與風險
- **LINE 推播額度**：每單 2 則＋抽獎每抽 1 則，免費 200 則/月必爆；展前需升級中用量方案（使用者已知）。
- 新 env：`SHIP_SECRET`（Vercel production）。
- LIFF ID 未拿到前 delivery.html 以 DEMO 模式先行預覽。

## 測試
1. 本機：表單渲染／勾選數量互動／驗證擋空值。
2. 部署後：`/api/delivery` 空 body 應 400；假 secret 打 `/api/ship-notify` 應 401。
3. 端到端（使用者配合）：真 LIFF 填單 → 試算表出現列＋收到推播① → 手動改狀態「已出貨」→ 收到推播②＋K 欄回填。
4. 防重：再改回待出貨→已出貨，K 已有值不重發。
