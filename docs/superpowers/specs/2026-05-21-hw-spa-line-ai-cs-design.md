# HW SPA LINE AI 客服系統 — 設計文件

**日期：** 2026-05-21  
**專案名稱：** hw-spa  
**目標：** 為 HEIWEI SPA 獨立 LINE 官方帳號建立 AI 自動客服，處理產品諮詢與預約諮詢，並在需要時無縫轉交真人。

---

## 1. 背景與目標

HEIWEI SPA 目前所有客服由人工在 LINE@ 手動回覆，耗時且重複性高。本系統以 Claude AI 接手初步諮詢，讓美容師和客服專注在高價值的人工互動（預約確認、客訴處理）。

預約最終仍由人工輸入 IOSPOS 內部系統（無開放 API），本系統不串接 IOSPOS。

---

## 2. 系統架構

```
顧客傳訊到 HEIWEI SPA LINE@
        ↓
Vercel Function 接收 LINE Webhook
        ↓
    讀取對話歷史（Upstash Redis，per userId）
        ↓
  載入知識庫 Context（Google Sheet，快取 5 分鐘）
        ↓
   組成 Prompt 送給 Claude API（claude-haiku-4-5）
        ↓
  ┌─────────────────────────────┐
  │  判斷是否觸發人工接管？      │
  │  - 預約意圖                 │
  │  - 抱怨/客訴關鍵字          │
  │  - AI 連續 2 次無法回答      │
  └─────────────────────────────┘
        ↙                    ↘
  直接回覆顧客          推播通知管理員 LINE ID
                        （附對話摘要）
```

---

## 3. 技術棧

| 元件 | 技術 | 費用 |
|------|------|------|
| 前端/後端 | Next.js App Router | 免費（Vercel） |
| 部署 | Vercel（新獨立專案） | 免費方案 |
| AI 模型 | Claude Haiku（claude-haiku-4-5） | ~NT$50–200/月 |
| 對話記憶 | Upstash Redis | 免費方案 |
| 知識庫 | Google Sheets | 免費 |
| LINE 整合 | LINE Messaging API SDK | 免費 |

---

## 4. 專案結構

```
hw-spa/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── webhook/
│   │       │   └── route.ts      # 接收 LINE Webhook，驗簽，分派訊息
│   │       ├── chat/
│   │       │   └── route.ts      # 呼叫 Claude API，組 prompt，判斷轉人工
│   │       └── knowledge/
│   │           └── route.ts      # 讀取 Google Sheet，回傳知識庫 JSON
│   └── lib/
│       ├── line.ts               # LINE SDK：回覆訊息、推播管理員
│       ├── claude.ts             # Claude API：送 prompt、解析回應
│       ├── redis.ts              # Upstash：讀寫對話歷史（TTL 24hr）
│       └── sheets.ts             # Google Sheets：讀取知識庫，快取 5 分鐘
├── .env.local                    # 本地環境變數（不 commit）
├── .env.example                  # 環境變數範本（commit 用）
└── package.json
```

---

## 5. 知識庫 Google Sheet 格式

Sheet 名稱：`HW SPA 知識庫`，包含三個分頁：

### 分頁 1：療程與服務

| 欄位 | 說明 |
|------|------|
| 療程名稱 | 如「深層清潔護理」 |
| 時間 | 如「90 分鐘」 |
| 價格 | 如「NT$2,800」 |
| 適合膚質 | 如「油肌、混合肌」 |
| 療程說明 | 詳細描述 |
| 注意事項 | 如「敏感期請提前告知」 |

### 分頁 2：產品 FAQ

| 欄位 | 說明 |
|------|------|
| 問題 | 顧客常問的問題 |
| 答案 | 標準回覆內容 |
| 分類 | 如「防曬」「保濕」「成分」 |

### 分頁 3：轉人工關鍵字

| 欄位 | 說明 |
|------|------|
| 關鍵字或情境描述 | 如「要預約」「退費」「過敏」 |
| 原因 | 如「需確認時段」「客訴處理」 |

---

## 6. 人工接管邏輯

觸發條件（任一滿足即觸發）：
1. 顧客訊息命中「轉人工關鍵字」分頁的任一項目
2. 顧客明確表達預約意圖（AI 判斷）
3. AI 連續 2 次回覆包含「無法回答」或「建議諮詢」

觸發後行為：
- 回覆顧客：「感謝您的詢問！我們的專員將盡快與您聯繫，請稍候 ☺️」
- 推播管理員 LINE ID：附上顧客名稱 + 最近 5 則對話摘要

---

## 7. 環境變數

```env
# LINE
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
ADMIN_LINE_USER_ID=          # 管理員 LINE ID，轉人工時推播

# Claude
ANTHROPIC_API_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Google Sheets
GOOGLE_SHEET_ID=             # HW SPA 知識庫的 Sheet ID
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

---

## 8. 對話記憶設計

- Key：`chat:{lineUserId}`
- 儲存最近 **10 則**對話（5 來回）
- TTL：**24 小時**（超過視為新對話）
- 格式：`[{role: "user"|"assistant", content: "..."}]`

---

## 9. 不在範圍內（本版本）

- 串接 IOSPOS 預約系統
- 後台管理介面
- 多語言支援（本版本繁體中文）
- 圖片/語音訊息處理（僅處理文字）

---

## 10. 成功標準

- 顧客傳訊後 **3 秒內**收到 AI 回覆
- 常見問題（FAQ 分頁命中）正確率 > 90%
- 轉人工通知管理員延遲 < 5 秒
- 知識庫由美容師/客服可自行維護，無需工程師介入
