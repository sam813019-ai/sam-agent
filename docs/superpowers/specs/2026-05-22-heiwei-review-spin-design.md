# HEIWEI 評價轉盤抽獎系統 — 設計文件

**日期**：2026-05-22  
**品牌**：HEIWEI（何謂美護膚品）  
**專案名稱**：`heiwei-review`（獨立新專案）

---

## 1. 系統概述

讓購買 HEIWEI 官網（Shopline）的客人，透過 LINE 填寫評價後玩轉盤抽獎，增加回購黏著度與 UGC 評價數量。

**完整流程：**
```
店主發送 LINE 訊息（含 LIFF 連結）給購買客人
  ↓
客人點連結 → LINE 內開啟 LIFF（全螢幕）
  ↓
① 自動取得 LINE UID
  ↓
② 輸入 Shopline 訂單編號 → Search API 驗證
  ↓
③ 填寫評價（1–5 顆星 + 文字）→ 存入 Google Sheets
  ↓
④ 8 格轉盤動畫（後端抽獎，前端只做動畫）
  ↓
⑤ LINE Messaging API 推播中獎通知
  ↓
中獎紀錄存入 Google Sheets（店主可直接管理）
```

---

## 2. 技術架構

| 層級 | 技術 |
|---|---|
| 前端框架 | Next.js 14（App Router）|
| 部署 | Vercel（獨立新專案，免費方案）|
| LINE 串接 | LIFF SDK + Messaging API |
| 訂單驗證 | Shopline Open API |
| 資料儲存 | Google Sheets（Service Account）|
| 樣式 | Tailwind CSS |
| 轉盤動畫 | Canvas API |

---

## 3. 頁面路由

```
/review                ← LIFF 入口，自動取 LINE UID，導向 verify
/review/verify         ← 輸入訂單編號，Shopline 驗證
/review/form           ← 填寫評價（星評 + 文字）
/review/spin           ← 轉盤遊戲畫面
/review/result         ← 中獎結果頁
```

---

## 4. API Routes

| 端點 | 方法 | 功能 |
|---|---|---|
| `/api/review/verify` | POST | 查 Shopline 訂單 + 防重複（查 LINE UID 是否已抽過此訂單）|
| `/api/review/submit` | POST | 儲存評價到 Google Sheets |
| `/api/review/spin` | POST | 後端抽獎 + 推 LINE 通知 + 寫中獎紀錄 |

### 4.1 `/api/review/verify` 邏輯
1. 接收 `{ lineUid, orderNumber }`
2. 呼叫 `GET https://open.shopline.io/v1/orders/search?order_number={orderNumber}`
3. 確認訂單存在且 `status` 為 `confirmed` 或 `completed`（兩者皆為有效訂單）
4. 查 Google Sheets 評價紀錄，確認此 `lineUid + orderNumber` 組合未抽過
5. 回傳 `{ valid: true }` 或錯誤訊息

### 4.2 `/api/review/spin` 機率邏輯
- 後端根據 Sheets 設定表讀取 8 格機率
- 使用加權隨機抽選決定結果
- 前端收到目標格數後，播放轉盤動畫停在該格
- 防止前端偽造結果

---

## 5. Google Sheets 結構

### Sheet 1：評價紀錄
| 欄位 | 說明 |
|---|---|
| 時間戳記 | 填寫時間（ISO 8601）|
| LINE UID | 自動取得 |
| 訂單編號 | 客人輸入 |
| 星評 | 1–5 |
| 評價內容 | 文字 |
| 已抽獎 | TRUE / FALSE |

### Sheet 2：中獎紀錄
| 欄位 | 說明 |
|---|---|
| 時間戳記 | 抽獎時間 |
| LINE UID | 自動取得 |
| 訂單編號 | 對應訂單 |
| 獎品名稱 | 抽到的獎 |
| 兌獎狀態 | 待處理 / 已寄出 |

### Sheet 3：獎品設定（店主可直接修改）
| 格號 | 獎品名稱 | 機率（%）|
|---|---|---|
| 1 | 正裝產品乙件 | 3 |
| 2 | 精華液體驗組 | 7 |
| 3 | 面膜 × 3 片 | 10 |
| 4 | 小樣組合包 | 15 |
| 5 | 85 折優惠券 | 15 |
| 6 | 9 折優惠券 | 20 |
| 7 | 生日加碼禮 | 10 |
| 8 | 積分 × 200 點 | 20 |

---

## 6. LINE 串接

### LIFF 設定
- 尺寸：`Full`（全螢幕）
- LIFF URL：`https://liff.line.me/{LIFF_ID}`
- 自動取得 `lineUid`，不需客人手動輸入

### 中獎推播訊息範本
```
🎉 恭喜您！HEIWEI 抽獎結果

您抽到了：{獎品名稱}

📦 兌獎方式：
我們會在 3 個工作天內，
用 LINE 聯繫您確認收件地址。

感謝您的評價，讓 HEIWEI 越來越好 💕
```

### 店主邀請訊息範本
```
嗨！感謝您購買 HEIWEI 何謂美 💕

您的訂單 #{訂單編號} 已確認。

📝 填寫評價就能抽獎！
點下方連結，30 秒填完評價
就有機會抽到好禮 🎁

👉 [立即評價抽好禮]
https://liff.line.me/{LIFF_ID}?order={訂單編號}

（每筆訂單限抽一次）
```

---

## 7. Shopline API

- **Base URL**：`https://open.shopline.io/v1/`
- **搜尋訂單**：`GET /orders/search?order_number={number}`
- **認證**：`Authorization: Bearer {SHOPLINE_ACCESS_TOKEN}`
- **已驗證**：Token 連線測試 ✅，Search API 精確回傳 1 筆 ✅

---

## 8. 環境變數

```env
# LIFF
NEXT_PUBLIC_LIFF_ID=

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=

# Shopline
SHOPLINE_ACCESS_TOKEN=
```

---

## 9. 防作弊機制

| 風險 | 防護方式 |
|---|---|
| 同一人多次抽獎 | LINE UID + 訂單編號組合唯一，驗證時查 Sheets |
| 偽造訂單編號 | Shopline API 實際驗證，找不到訂單直接拒絕 |
| 前端篡改獎品 | 後端抽獎，前端只收「停在第幾格」指令 |
| 未填評價直接抽獎 | `/api/review/spin` 需要先完成 `/api/review/submit` |

---

## 10. 前置作業清單（開發前需備妥）

- [ ] Shopline 後台：撤銷舊 Token，重新產生新 Token
- [ ] LINE Developers Console：建立新 LIFF App（`heiwei-review` Channel）
- [ ] Google Sheets：建立新試算表，設定 Service Account 權限
- [ ] Vercel：建立新專案 `heiwei-review`
