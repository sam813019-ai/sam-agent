# LINE 下單系統

群組成員點連結 → LIFF 登入 → 選商品數量 → Google Sheet 紀錄 → LINE 即時通知你

## 技術棧

- **前端/後端**：Next.js 14 (App Router) + TypeScript + Tailwind，部署 Vercel
- **登入**：LINE LIFF（自動取得顧客名稱，免註冊）
- **資料庫**：Google Sheets（商品表 + 訂單表）
- **通知**：LINE Messaging API push 到你的個人帳號

## 你要準備的 6 樣東西

依序完成，每完成一項把值填進 `.env.local`（複製 `.env.example`）。

---

### ① Google Sheet（資料庫）

1. 到 https://sheets.google.com 新增一份試算表
2. 建立 **兩個分頁**（tab）：
   - `商品表`：第一列標題 `id | name | spec | price | stock | image | description | active`
   - `訂單表`：第一列標題 `訂單時間 | 訂單編號 | LINE UserId | 顧客名稱 | 商品明細 | 總金額 | 備註 | 狀態`
3. 商品表從第 2 列開始填商品，`active` 欄位填 `TRUE` 會顯示、`FALSE` 會隱藏
4. 取 **Sheet ID**：網址 `https://docs.google.com/spreadsheets/d/【這一串】/edit` → 填 `GOOGLE_SHEET_ID`

### ② Google Service Account（讓程式有權讀寫 Sheet）

1. 到 https://console.cloud.google.com → 新增專案 `line-order`
2. 左側選單 → **API 和服務 → 程式庫** → 搜尋 `Google Sheets API` → 啟用
3. 左側選單 → **API 和服務 → 憑證** → 建立憑證 → **服務帳戶**
4. 名稱隨便取（如 `sheet-bot`）→ 建立並繼續 → 略過其他步驟
5. 點剛建立的服務帳戶 → **金鑰** 分頁 → 新增金鑰 → **JSON** → 下載
6. 打開 JSON 檔，找：
   - `client_email`（`xxx@xxx.iam.gserviceaccount.com`）→ 填 `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key`（整段 `-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----\n`）→ 填 `GOOGLE_PRIVATE_KEY`（**用雙引號包起來**）
7. 回到 Google Sheet → 點右上 **共用** → 把 `client_email` 加為 **編輯者**（關鍵！不加就 403）

### ③ LINE Messaging API Channel（訂單通知）

1. 到 https://developers.line.biz/console/
2. 新建 Provider（組織）→ 新建 **Messaging API** Channel
3. 填品牌名稱（如「HEIWEI 下單通知」）
4. 建好後進入 Channel → **Messaging API** 分頁：
   - `Channel access token (long-lived)` → 點 Issue → 複製 → 填 `LINE_CHANNEL_ACCESS_TOKEN`
5. **Basic settings** 分頁 → 下方掃 Bot 的 QR code 把這個 Bot 加為好友（不加的話 push 會失敗）
6. 取 **你的 User ID**：
   - 方法 A：Bot 分頁中「Your user ID」（如果顯示）
   - 方法 B：打開 LINE → 設定 → 個人檔案 → 分享 → 可取到 userId
   - 填 `LINE_ADMIN_USER_ID`

### ④ LINE Login Channel + LIFF（顧客登入）

1. 同一個 Provider 下 → 新建 **LINE Login** Channel
2. App types 勾 **Web app**
3. 建好後進入 Channel → **LIFF** 分頁 → Add
   - Size: `Full`
   - Endpoint URL: 先填 `https://example.com`（部署後會改）
   - Scope: 勾 `profile`、`openid`
   - Bot link feature: Off
4. 建立後會得到 **LIFF ID**（格式 `1234567890-abcdefgh`）→ 填 `NEXT_PUBLIC_LIFF_ID`

---

## 本機測試

```bash
cd line-order
npm install
cp .env.example .env.local   # 填入上面 6 樣東西
npm run dev
```

注意：LIFF 必須在 **LINE App 內** 或 **https** 才能正常運作，本機 `http://localhost:3000` 會卡在登入。本機先測 API 即可：

```bash
curl http://localhost:3000/api/products
```

## 部署到 Vercel

```bash
npm install -g vercel
vercel login
vercel          # 首次部署
vercel --prod   # 正式部署
```

1. 在 Vercel 專案設定 → **Environment Variables** 貼入 `.env.local` 所有欄位
2. 取得正式網址（如 `https://line-order.vercel.app`）
3. 回 LINE Developers Console → LIFF → 編輯 Endpoint URL 改成正式網址
4. 你的 LIFF URL 是 `https://liff.line.me/{NEXT_PUBLIC_LIFF_ID}`，把這個連結貼到 LINE 群組即可

## 日常操作

- **新增商品**：直接在 `商品表` 加一列，`active` 填 `TRUE`，顧客下次刷新就看得到
- **下架商品**：`active` 改 `FALSE`
- **看訂單**：`訂單表` 自動累加；你的 LINE 也會即時收到通知
- **改價格/庫存**：改 Sheet 即可，免重新部署

## 架構圖

```
群組連結 https://liff.line.me/xxx
    ↓
LIFF 頁面 (Next.js on Vercel)
    ├─ GET /api/products ─→ Google Sheet 商品表
    └─ LINE Login 取 userId + displayName
    ↓ 選數量 + 備註 + 送出
POST /api/order
    ├─ 驗證並寫入 Google Sheet 訂單表
    └─ LINE Messaging API push → 你的個人 LINE
```

## 常見問題

- **403 Permission denied**：Service Account email 沒加入 Sheet 共用
- **LINE push 失敗**：Bot 沒加你為好友，或 token 錯
- **LIFF 白畫面**：Endpoint URL 沒更新成正式網址
- **中文亂碼**：確認 Sheet 存為 UTF-8（Google Sheet 預設就是）
