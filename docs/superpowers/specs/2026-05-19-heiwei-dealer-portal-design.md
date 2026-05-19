# HEIWEI 何謂美 — 經銷商平台設計 Spec

**日期**：2026-05-19  
**版本**：v1.0  
**狀態**：待實作

---

## 1. 目標

建立一個統一的 HEIWEI 授權經銷商入口網站，取代目前分散的多個連結（Tally 申請表、GitHub 授權書表單、Google Drive 素材連結、合約文件），讓整個流程從申請到日常使用全部收斂在同一個品牌化網站內。

---

## 2. 整體架構：兩層網站

### 公開層（任何人可訪問）
URL：`heiwei-dealer.vercel.app/`

| 頁面 | 功能 |
|------|------|
| 品牌介紹 | HEIWEI 故事、合作優勢、適合對象說明 |
| 申請表單 | 取代 Tally，品牌化表單，送出後寫入 Google Sheet 並 LINE 推播通知陳育慶 |

### 私密層（需要專屬 Token URL）
URL：`heiwei-dealer.vercel.app/?token=xxxxxx`

| 頁面 / 功能 | 說明 |
|-------------|------|
| 歡迎首頁 | 顯示經銷商姓名/店名、授權狀態、最新公告摘要、功能卡片導覽 |
| 公告欄 | 最新活動、新品上市、重要通知 |
| 制度 & 合約 | 折扣結構說明、合作規範、PDF 下載（合約書、授權書範本） |
| 授權書申請 | 線上填表，送出後 LINE 推播通知陳育慶確認 |
| 素材庫 | 嵌入 Google Drive 資料夾瀏覽，商品圖、Logo、Banner、影片 |
| 訂購出貨 | 嵌入現有 Tally 訂購表單（`https://tally.so/r/xXPxOd`） |
| 聯絡窗口 | 一鍵開啟 HEIWEI 官方 LINE@ |

---

## 3. 申請與核准流程

```
1. 有意願者前往公開層填寫申請表單
2. 表單資料寫入 Google Sheet（申請者名單）
3. Google Apps Script 透過 LINE Messaging API 推播申請摘要給陳育慶
4. 陳育慶審核，決定核准或婉拒
5. 核准 → 陳育慶手動將該經銷商的專屬 Token URL 用 LINE 發給對方
6. 對方開啟 Token URL，進入私密層
7. 對方在入口內填寫授權書申請表
8. GAS 透過 LINE Messaging API 再次推播通知陳育慶，陳育慶確認後正式合作
```

---

## 4. Token 機制

- 每位核准經銷商有一組唯一 token（8 碼隨機字串，例如 `hw-a3f9bc12`）
- Token 白名單存放在 Google Sheet（經銷商管理表）
- 使用者開啟 URL 時，前端用 token 呼叫 Google Apps Script Web App API 驗證
- API 回傳：有效 → 回傳經銷商基本資料（姓名、店名）；無效 → 顯示「連結無效或已過期」
- Token 可追溯：若連結外洩，查 Sheet 可知是哪位經銷商的 token

**Google Sheet 結構（經銷商管理表）：**

| token | 姓名 | 店名 | 聯絡電話 | LINE ID | 申請日期 | 狀態 | 備註 |
|-------|------|------|----------|---------|----------|------|------|
| hw-a3f9bc12 | 陳小美 | 美麗日記 | 0912xxx | @xxx | 2026-05-20 | 核准 | |

---

## 5. 視覺設計規範

**風格**：暖白簡約（Warm Minimal）

| 變數 | 值 |
|------|----|
| 主背景 | `#FDFCFA` |
| 輔助背景 | `#F5F3EF` |
| 深色（文字/按鈕） | `#1A1A1A` |
| 金色點綴 | `#C4A45A` |
| 邊框 | `#EDE9E3` |
| 字體 | `-apple-system, "PingFang TC", sans-serif` |

**入口主畫面**：卡片首頁式
- 頂部黑色 Hero bar 顯示歡迎詞 + 授權狀態
- 最新公告摘要（2 則）
- 2x3 功能卡片格線（最後一格聯絡跨兩欄）

---

## 6. 技術架構

| 元件 | 技術選型 | 說明 |
|------|----------|------|
| 前端 | 純靜態 HTML + CSS + Vanilla JS | 無框架，維護簡單 |
| 部署 | Vercel（免費方案） | GitHub push 自動部署 |
| 後端 | Google Apps Script Web App | Token 驗證、表單送出、LINE 推播 |
| 資料庫 | Google Sheets | 經銷商名單、公告內容 |
| 推播通知 | LINE Messaging API（Push Message） | 申請通知、授權書申請通知；LINE Notify 已於 2025-03-31 停止服務 |
| 素材庫 | Google Drive 嵌入 | 不需另建儲存，直接用現有 Drive |
| 訂購表單 | Tally iframe 嵌入 | 保留現有 `tally.so/r/xXPxOd` |

---

## 7. 檔案結構

```
heiwei-dealer-portal/
├── index.html          # 公開層：品牌介紹 + 申請表單
├── portal.html         # 私密層：主入口（token 驗證後顯示）
├── css/
│   └── style.css       # 共用樣式
├── js/
│   ├── auth.js         # Token 驗證邏輯
│   └── portal.js       # 入口互動邏輯
└── gas/
    └── Code.gs         # Google Apps Script（部署為 Web App）
```

---

## 8. Google Apps Script API 端點

**URL 路由邏輯**：
- `heiwei-dealer.vercel.app/` → 載入 `index.html`（公開層，品牌介紹 + 申請表）
- `heiwei-dealer.vercel.app/?token=xxx` → 載入 `index.html`，JS 偵測到 token 參數後呼叫 GAS 驗證，驗證成功則隱藏公開層、顯示私密入口內容（動態切換，無需跳頁）；驗證失敗顯示錯誤畫面

---

## 8. Google Apps Script API 端點

**GET `/api?action=verify&token=xxx`**
- 驗證 token，回傳經銷商資料或錯誤

**POST `/api?action=apply`**
- 接收公開申請表資料，寫入 Sheet，推播 LINE

**POST `/api?action=auth-form`**
- 接收授權書申請資料，寫入 Sheet，推播 LINE

---

## 9. 不在本次範圍內

- 後台管理介面（公告由陳育慶直接編輯 Sheet）
- 電子郵件通知（全用 LINE Notify）
- 手機 App
- 多語言

---

## 10. 成功定義

- 有意願者填完申請表，陳育慶能在 LINE 收到通知
- 核准的經銷商打開 token URL 能看到完整入口
- 入口內可瀏覽素材、下載合約 PDF、填授權書申請、跳訂購表單
- 無效 token 顯示錯誤頁，不洩漏任何內容
