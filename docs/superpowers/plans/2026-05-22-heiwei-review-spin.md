# HEIWEI 評價轉盤抽獎系統 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立獨立 Next.js 專案 `heiwei-review`，讓 HEIWEI Shopline 客人透過 LINE LIFF 填評價並玩轉盤抽獎，中獎後自動推 LINE 通知。

**Architecture:** LIFF 全螢幕網頁串接 Shopline Search API 驗證訂單、Google Sheets 儲存評價與中獎紀錄、LINE Messaging API 推播通知。後端抽獎邏輯防止前端作弊，獎品機率由 Sheets 設定表控制。

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Google Sheets API (googleapis), LINE LIFF SDK, LINE Messaging API, Shopline Open API, Vitest

---

## 檔案結構總覽

```
/Users/mac/Downloads/sam-agent/heiwei-review/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    ← 全域 layout（載入 Tailwind）
│   │   ├── globals.css
│   │   ├── review/
│   │   │   ├── layout.tsx               ← LIFF 初始化 wrapper
│   │   │   ├── page.tsx                 ← 入口：取 UID → redirect verify
│   │   │   ├── verify/page.tsx          ← 訂單編號輸入 + Shopline 驗證
│   │   │   ├── form/page.tsx            ← 星評 + 文字評價
│   │   │   ├── spin/page.tsx            ← 轉盤動畫頁
│   │   │   └── result/page.tsx          ← 中獎結果顯示
│   │   └── api/
│   │       └── review/
│   │           ├── verify/route.ts      ← POST：Shopline 驗證 + 防重複
│   │           ├── submit/route.ts      ← POST：儲存評價到 Sheets
│   │           └── spin/route.ts        ← POST：抽獎 + LINE 推播 + 寫紀錄
│   ├── lib/
│   │   ├── shopline.ts                  ← Shopline API client
│   │   ├── sheets.ts                    ← Google Sheets client（評價/中獎/設定）
│   │   ├── line-messaging.ts            ← LINE push 通知
│   │   └── lottery.ts                   ← 加權隨機抽獎邏輯
│   └── types/
│       └── index.ts                     ← 共用 TypeScript 型別
├── __tests__/
│   ├── lottery.test.ts
│   └── shopline.test.ts
├── .env.local                           ← 本地環境變數（不 commit）
├── .env.example
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## Task 1: 建立專案與安裝依賴

**Files:**
- Create: `heiwei-review/` (new Next.js project)
- Create: `heiwei-review/package.json`
- Create: `heiwei-review/vitest.config.ts`
- Create: `heiwei-review/.env.example`

- [ ] **Step 1: 在 sam-agent 目錄下建立 Next.js 專案**

```bash
cd /Users/mac/Downloads/sam-agent
npx create-next-app@latest heiwei-review \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --no-eslint \
  --import-alias "@/*"
```

選項確認：TypeScript ✅ Tailwind ✅ App Router ✅ src/ ✅

- [ ] **Step 2: 安裝依賴套件**

```bash
cd /Users/mac/Downloads/sam-agent/heiwei-review
npm install googleapis @line/liff
npm install -D vitest @vitest/ui
```

- [ ] **Step 3: 建立 vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 4: 在 package.json 新增 test script**

在 `package.json` 的 `scripts` 區塊加入：
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: 建立 .env.example**

```bash
cat > .env.example << 'EOF'
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
EOF
```

- [ ] **Step 6: 建立 .env.local（填入真實值，不 commit）**

```bash
cp .env.example .env.local
# 然後用編輯器填入以下值（稍後設定好再填）：
# NEXT_PUBLIC_LIFF_ID=（建立 LIFF App 後取得）
# LINE_CHANNEL_ACCESS_TOKEN=（HEIWEI LINE@ 的 Messaging API token）
# GOOGLE_SERVICE_ACCOUNT_EMAIL=
# GOOGLE_PRIVATE_KEY=
# GOOGLE_SHEET_ID=（新建 Google Sheets 的 ID）
# SHOPLINE_ACCESS_TOKEN=（重新產生的 Token）
```

- [ ] **Step 7: 確認 .gitignore 包含 .env.local**

```bash
grep -q ".env.local" .gitignore && echo "已存在" || echo ".env.local" >> .gitignore
```

- [ ] **Step 8: Commit**

```bash
git add heiwei-review/
git commit -m "feat: init heiwei-review Next.js project"
```

---

## Task 2: TypeScript 型別定義

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: 建立型別檔案**

```typescript
// src/types/index.ts

export interface Prize {
  index: number
  name: string
  probability: number  // 0–100，全部加總必須等於 100
  color: string        // CSS hex color
}

export interface ReviewSession {
  lineUid: string
  orderNumber: string
}

export interface VerifyResponse {
  valid: boolean
  error?: string
}

export interface SubmitReviewPayload {
  lineUid: string
  orderNumber: string
  stars: number        // 1–5
  comment: string
}

export interface SpinPayload {
  lineUid: string
  orderNumber: string
}

export interface SpinResult {
  prizeIndex: number
  prizeName: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: 抽獎邏輯（lottery.ts）

**Files:**
- Create: `src/lib/lottery.ts`
- Create: `__tests__/lottery.test.ts`

- [ ] **Step 1: 寫失敗測試**

```typescript
// __tests__/lottery.test.ts
import { selectPrize } from '../src/lib/lottery'
import type { Prize } from '../src/types'

const prizes: Prize[] = [
  { index: 0, name: '大獎', probability: 10, color: '#FFD700' },
  { index: 1, name: '小獎', probability: 90, color: '#FF69B4' },
]

describe('selectPrize', () => {
  it('回傳的 prize 必須存在於 prizes 陣列中', () => {
    const result = selectPrize(prizes)
    expect(prizes.map(p => p.index)).toContain(result.index)
  })

  it('機率總和不等於 100 時拋出錯誤', () => {
    const bad: Prize[] = [
      { index: 0, name: 'A', probability: 50, color: '#000' },
    ]
    expect(() => selectPrize(bad)).toThrow('機率總和必須等於 100')
  })

  it('只有一個選項時永遠回傳該選項', () => {
    const single: Prize[] = [
      { index: 0, name: '唯一獎', probability: 100, color: '#000' },
    ]
    for (let i = 0; i < 10; i++) {
      expect(selectPrize(single).index).toBe(0)
    }
  })

  it('機率分佈：10000 次抽獎中大獎比例接近 10%', () => {
    let bigPrizeCount = 0
    for (let i = 0; i < 10000; i++) {
      if (selectPrize(prizes).index === 0) bigPrizeCount++
    }
    const ratio = bigPrizeCount / 10000
    expect(ratio).toBeGreaterThan(0.07)
    expect(ratio).toBeLessThan(0.13)
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
cd /Users/mac/Downloads/sam-agent/heiwei-review
npm test
```

預期：FAIL（`selectPrize` 未定義）

- [ ] **Step 3: 實作 lottery.ts**

```typescript
// src/lib/lottery.ts
import type { Prize } from '@/types'

export function selectPrize(prizes: Prize[]): Prize {
  const total = prizes.reduce((sum, p) => sum + p.probability, 0)
  if (Math.abs(total - 100) > 0.001) {
    throw new Error('機率總和必須等於 100')
  }

  const rand = Math.random() * 100
  let cumulative = 0
  for (const prize of prizes) {
    cumulative += prize.probability
    if (rand < cumulative) return prize
  }
  return prizes[prizes.length - 1]
}
```

- [ ] **Step 4: 執行測試，確認通過**

```bash
npm test
```

預期：4 個 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/lottery.ts __tests__/lottery.test.ts
git commit -m "feat: add weighted lottery engine with tests"
```

---

## Task 4: Shopline API Client

**Files:**
- Create: `src/lib/shopline.ts`
- Create: `__tests__/shopline.test.ts`

- [ ] **Step 1: 寫失敗測試**

```typescript
// __tests__/shopline.test.ts
import { verifyOrder } from '../src/lib/shopline'

describe('verifyOrder', () => {
  it('訂單存在且 confirmed → 回傳 valid: true', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ order_number: 'ORD001', status: 'confirmed' }],
      }),
    }) as any

    const result = await verifyOrder('ORD001')
    expect(result.valid).toBe(true)
  })

  it('訂單存在但 status 非 confirmed/completed → valid: false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ order_number: 'ORD002', status: 'pending' }],
      }),
    }) as any

    const result = await verifyOrder('ORD002')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('尚未付款')
  })

  it('找不到訂單 → valid: false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    }) as any

    const result = await verifyOrder('NOTEXIST')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('找不到訂單')
  })

  it('API 回傳錯誤 → valid: false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as any

    const result = await verifyOrder('ORD001')
    expect(result.valid).toBe(false)
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
npm test
```

預期：FAIL（`verifyOrder` 未定義）

- [ ] **Step 3: 實作 shopline.ts**

```typescript
// src/lib/shopline.ts

const BASE_URL = 'https://open.shopline.io/v1'

interface ShoplineOrder {
  order_number: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
}

interface VerifyResult {
  valid: boolean
  error?: string
}

export async function verifyOrder(orderNumber: string): Promise<VerifyResult> {
  const token = process.env.SHOPLINE_ACCESS_TOKEN
  if (!token) return { valid: false, error: '系統設定錯誤' }

  try {
    const res = await fetch(
      `${BASE_URL}/orders/search?order_number=${encodeURIComponent(orderNumber)}`,
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
          'User-Agent': 'HEIWEI-review',
        },
      }
    )

    if (!res.ok) return { valid: false, error: '系統暫時無法驗證，請稍後再試' }

    const data = await res.json()
    const orders: ShoplineOrder[] = data.items || []

    const order = orders.find(o => o.order_number === orderNumber)
    if (!order) return { valid: false, error: '找不到訂單，請確認訂單編號是否正確' }

    if (order.status === 'confirmed' || order.status === 'completed') {
      return { valid: true }
    }
    if (order.status === 'cancelled') {
      return { valid: false, error: '此訂單已取消，無法參與抽獎' }
    }
    return { valid: false, error: '訂單尚未付款完成，請確認付款狀態' }
  } catch {
    return { valid: false, error: '網路錯誤，請稍後再試' }
  }
}
```

- [ ] **Step 4: 執行測試，確認通過**

```bash
npm test
```

預期：4 個 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/shopline.ts __tests__/shopline.test.ts
git commit -m "feat: add Shopline order verification client with tests"
```

---

## Task 5: Google Sheets Client

**Files:**
- Create: `src/lib/sheets.ts`

- [ ] **Step 1: 建立 sheets.ts**

```typescript
// src/lib/sheets.ts
import { google } from 'googleapis'
import type { Prize } from '@/types'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!
const REVIEWS_TAB = '評價紀錄'
const PRIZES_TAB = '中獎紀錄'
const CONFIG_TAB = '獎品設定'

function getClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

/** 檢查此 lineUid + orderNumber 組合是否已經抽過獎 */
export async function checkAlreadyPlayed(
  lineUid: string,
  orderNumber: string
): Promise<boolean> {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${REVIEWS_TAB}!B2:F`,
  })
  const rows = res.data.values || []
  return rows.some(
    r => r[0] === lineUid && r[1] === orderNumber && r[4] === 'TRUE'
  )
}

/** 儲存評價（已抽獎 = FALSE，等 spin 完成後更新） */
export async function appendReview(
  lineUid: string,
  orderNumber: string,
  stars: number,
  comment: string
): Promise<void> {
  const sheets = getClient()
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${REVIEWS_TAB}!A:F`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[now, lineUid, orderNumber, stars, comment, 'FALSE']],
    },
  })
}

/** 將評價紀錄的「已抽獎」欄位更新為 TRUE */
export async function markAsPlayed(
  lineUid: string,
  orderNumber: string
): Promise<void> {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${REVIEWS_TAB}!B2:F`,
  })
  const rows = res.data.values || []
  const idx = rows.findIndex(
    r => r[0] === lineUid && r[1] === orderNumber
  )
  if (idx === -1) return
  const rowNum = idx + 2
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${REVIEWS_TAB}!F${rowNum}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [['TRUE']] },
  })
}

/** 儲存中獎紀錄 */
export async function appendPrizeRecord(
  lineUid: string,
  orderNumber: string,
  prizeName: string
): Promise<void> {
  const sheets = getClient()
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${PRIZES_TAB}!A:E`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[now, lineUid, orderNumber, prizeName, '待處理']],
    },
  })
}

/** 從獎品設定表讀取 8 格獎品設定 */
export async function getPrizes(): Promise<Prize[]> {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${CONFIG_TAB}!A2:D9`,
  })
  const rows = res.data.values || []
  return rows
    .filter(r => r[0])
    .map((r, i) => ({
      index: i,
      name: String(r[1] || ''),
      probability: Number(r[2] || 0),
      color: String(r[3] || '#FFB6C1'),
    }))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sheets.ts
git commit -m "feat: add Google Sheets client for reviews and prizes"
```

---

## Task 6: LINE Messaging Client

**Files:**
- Create: `src/lib/line-messaging.ts`

- [ ] **Step 1: 建立 line-messaging.ts**

```typescript
// src/lib/line-messaging.ts

const PUSH_URL = 'https://api.line.me/v2/bot/message/push'

export async function pushPrizeNotification(
  lineUid: string,
  prizeName: string
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN 未設定，略過推播')
    return
  }

  const text =
    `🎉 恭喜您！HEIWEI 抽獎結果\n\n` +
    `您抽到了：${prizeName} 🎁\n\n` +
    `📦 兌獎方式：\n` +
    `我們會在 3 個工作天內，\n` +
    `用 LINE 聯繫您確認收件地址。\n\n` +
    `感謝您的評價，讓 HEIWEI 越來越好 💕`

  const res = await fetch(PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUid,
      messages: [{ type: 'text', text }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('LINE push 失敗:', res.status, body)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/line-messaging.ts
git commit -m "feat: add LINE messaging client for prize notifications"
```

---

## Task 7: API Route — verify

**Files:**
- Create: `src/app/api/review/verify/route.ts`

- [ ] **Step 1: 建立 verify route**

```typescript
// src/app/api/review/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyOrder } from '@/lib/shopline'
import { checkAlreadyPlayed } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  try {
    const { lineUid, orderNumber } = await req.json()

    if (!lineUid || !orderNumber) {
      return NextResponse.json(
        { valid: false, error: '缺少必要資訊' },
        { status: 400 }
      )
    }

    // 1. Shopline 驗證訂單
    const shoplineResult = await verifyOrder(orderNumber)
    if (!shoplineResult.valid) {
      return NextResponse.json({ valid: false, error: shoplineResult.error })
    }

    // 2. 防重複：此 lineUid + orderNumber 是否已抽過
    const alreadyPlayed = await checkAlreadyPlayed(lineUid, orderNumber)
    if (alreadyPlayed) {
      return NextResponse.json({
        valid: false,
        error: '這筆訂單已經參加過抽獎囉！',
      })
    }

    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error('verify error:', err)
    return NextResponse.json(
      { valid: false, error: '系統錯誤，請稍後再試' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/review/verify/
git commit -m "feat: add verify API route with Shopline + duplicate check"
```

---

## Task 8: API Route — submit review

**Files:**
- Create: `src/app/api/review/submit/route.ts`

- [ ] **Step 1: 建立 submit route**

```typescript
// src/app/api/review/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { appendReview } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  try {
    const { lineUid, orderNumber, stars, comment } = await req.json()

    if (!lineUid || !orderNumber || !stars) {
      return NextResponse.json({ ok: false, error: '缺少必要欄位' }, { status: 400 })
    }

    if (stars < 1 || stars > 5) {
      return NextResponse.json({ ok: false, error: '星評須為 1–5' }, { status: 400 })
    }

    await appendReview(lineUid, orderNumber, stars, comment || '')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('submit error:', err)
    return NextResponse.json({ ok: false, error: '儲存失敗，請稍後再試' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/review/submit/
git commit -m "feat: add submit review API route"
```

---

## Task 9: API Route — spin（抽獎核心）

**Files:**
- Create: `src/app/api/review/spin/route.ts`

- [ ] **Step 1: 建立 spin route**

```typescript
// src/app/api/review/spin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPrizes, markAsPlayed, appendPrizeRecord } from '@/lib/sheets'
import { selectPrize } from '@/lib/lottery'
import { pushPrizeNotification } from '@/lib/line-messaging'

export async function POST(req: NextRequest) {
  try {
    const { lineUid, orderNumber } = await req.json()

    if (!lineUid || !orderNumber) {
      return NextResponse.json({ error: '缺少必要資訊' }, { status: 400 })
    }

    // 1. 讀取獎品設定
    const prizes = await getPrizes()
    if (prizes.length === 0) {
      return NextResponse.json({ error: '獎品設定未建立' }, { status: 500 })
    }

    // 2. 後端抽獎
    const prize = selectPrize(prizes)

    // 3. 標記已抽獎 + 寫中獎紀錄（並行執行）
    await Promise.all([
      markAsPlayed(lineUid, orderNumber),
      appendPrizeRecord(lineUid, orderNumber, prize.name),
    ])

    // 4. LINE 推播（失敗不影響結果）
    pushPrizeNotification(lineUid, prize.name).catch(e =>
      console.error('LINE 推播失敗:', e)
    )

    return NextResponse.json({
      prizeIndex: prize.index,
      prizeName: prize.name,
    })
  } catch (err) {
    console.error('spin error:', err)
    return NextResponse.json({ error: '抽獎失敗，請稍後再試' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/review/spin/
git commit -m "feat: add spin API route with lottery, sheets, and LINE push"
```

---

## Task 10: LIFF Layout + 入口頁

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/review/layout.tsx`
- Create: `src/app/review/page.tsx`

- [ ] **Step 1: 修改全域 layout.tsx，加入 HEIWEI 品牌 meta**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HEIWEI 評價抽獎',
  description: '填寫評價，轉動幸運轉盤！',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="bg-[#FFF5F7] min-h-screen">{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: 建立 review layout（LIFF 初始化）**

```typescript
// src/app/review/layout.tsx
'use client'
import { useEffect, useState } from 'react'

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (!liffId) {
      setError('LIFF ID 未設定')
      return
    }
    import('@line/liff').then(({ default: liff }) => {
      liff.init({ liffId }).then(() => setReady(true)).catch(() => {
        setError('LINE 初始化失敗，請透過 LINE 開啟此頁面')
      })
    })
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <p className="text-center text-red-500">{error}</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
```

- [ ] **Step 3: 建立 review 入口頁（取 LINE UID → 存 sessionStorage → redirect）**

```typescript
// src/app/review/page.tsx
'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ReviewEntry() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    import('@line/liff').then(({ default: liff }) => {
      if (!liff.isLoggedIn()) {
        liff.login()
        return
      }
      const profile = liff.getProfile().then(p => {
        sessionStorage.setItem('lineUid', p.userId)
        // 如果 URL 帶有 ?order=XXX，預填入 sessionStorage
        const order = searchParams.get('order')
        if (order) sessionStorage.setItem('prefilledOrder', order)
        router.replace('/review/verify')
      })
    })
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
    </div>
  )
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" /></div>}>
      <ReviewEntry />
    </Suspense>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/review/
git commit -m "feat: add LIFF layout and entry page with LINE UID capture"
```

---

## Task 11: 驗證頁（verify）

**Files:**
- Create: `src/app/review/verify/page.tsx`

- [ ] **Step 1: 建立 verify 頁面**

```typescript
// src/app/review/verify/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifyPage() {
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const prefilled = sessionStorage.getItem('prefilledOrder')
    if (prefilled) setOrderNumber(prefilled)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const lineUid = sessionStorage.getItem('lineUid')
    if (!lineUid) {
      setError('無法取得 LINE 資訊，請重新開啟連結')
      setLoading(false)
      return
    }

    const res = await fetch('/api/review/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUid, orderNumber: orderNumber.trim() }),
    })
    const data = await res.json()

    if (data.valid) {
      sessionStorage.setItem('orderNumber', orderNumber.trim())
      router.push('/review/form')
    } else {
      setError(data.error || '驗證失敗，請稍後再試')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-pink-700 mb-2">HEIWEI 評價抽獎</h1>
          <p className="text-gray-500 text-sm">填寫評價，轉動幸運轉盤 🎡</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shopline 訂單編號
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="例：20260521175042296"
              className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-center text-lg tracking-wider"
              required
            />
            <p className="text-xs text-gray-400 mt-1 text-center">
              訂單編號可在購買確認信中找到
            </p>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !orderNumber.trim()}
            className="w-full py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200 text-white font-bold rounded-xl transition-colors"
          >
            {loading ? '驗證中...' : '驗證訂單'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/review/verify/
git commit -m "feat: add order verification page with Shopline integration"
```

---

## Task 12: 評價表單頁（form）

**Files:**
- Create: `src/app/review/form/page.tsx`

- [ ] **Step 1: 建立 form 頁面**

```typescript
// src/app/review/form/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STAR_LABELS = ['', '非常不滿意', '不滿意', '普通', '滿意', '非常滿意']

export default function FormPage() {
  const router = useRouter()
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (stars === 0) { setError('請選擇星評'); return }
    setError('')
    setLoading(true)

    const lineUid = sessionStorage.getItem('lineUid')
    const orderNumber = sessionStorage.getItem('orderNumber')

    if (!lineUid || !orderNumber) {
      router.replace('/review')
      return
    }

    const res = await fetch('/api/review/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUid, orderNumber, stars, comment }),
    })
    const data = await res.json()

    if (data.ok) {
      router.push('/review/spin')
    } else {
      setError(data.error || '提交失敗，請稍後再試')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-pink-700 mb-2">填寫評價</h1>
          <p className="text-gray-500 text-sm">填完就能轉轉盤抽好禮！</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 星評 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              您對這次購物的整體評價
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  className={`text-4xl transition-transform hover:scale-110 ${
                    n <= stars ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>
            {stars > 0 && (
              <p className="text-center text-sm text-pink-600 mt-2">
                {STAR_LABELS[stars]}
              </p>
            )}
          </div>

          {/* 文字評價 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分享您的心得（選填）
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="使用感受、推薦的朋友類型…"
              rows={4}
              className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || stars === 0}
            className="w-full py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200 text-white font-bold rounded-xl transition-colors"
          >
            {loading ? '提交中...' : '提交評價，開始抽獎！🎡'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/review/form/
git commit -m "feat: add review form page with star rating"
```

---

## Task 13: 轉盤頁（spin）— Canvas 動畫

**Files:**
- Create: `src/app/review/spin/page.tsx`

- [ ] **Step 1: 建立轉盤頁**

```typescript
// src/app/review/spin/page.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const SEGMENT_COLORS = [
  '#FF6B9D', '#FFB347', '#87CEEB', '#98FB98',
  '#DDA0DD', '#F0E68C', '#20B2AA', '#FF8C69',
]

const SEGMENT_COUNT = 8

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5)
}

function drawWheel(
  ctx: CanvasRenderingContext2D,
  prizes: { name: string }[],
  angle: number,
  size: number
) {
  const cx = size / 2, cy = size / 2
  const radius = size / 2 - 10
  const segAngle = (Math.PI * 2) / SEGMENT_COUNT

  ctx.clearRect(0, 0, size, size)

  prizes.forEach((prize, i) => {
    const start = angle + i * segAngle
    const end = start + segAngle

    // 扇形
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, start, end)
    ctx.closePath()
    ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    // 文字
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(start + segAngle / 2)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${size / 20}px sans-serif`
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 4
    const text = prize.name.length > 6 ? prize.name.slice(0, 5) + '…' : prize.name
    ctx.fillText(text, radius - 10, 5)
    ctx.restore()
  })

  // 中心圓
  ctx.beginPath()
  ctx.arc(cx, cy, size / 10, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.strokeStyle = '#FFB6C1'
  ctx.lineWidth = 3
  ctx.stroke()
}

interface PrizeConfig { name: string; color: string }

export default function SpinPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [prizes, setPrizes] = useState<PrizeConfig[]>([])
  const [spinning, setSpinning] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const angleRef = useRef(0)

  // 從 spin API 取得預設獎品顯示名（在抽獎前就要顯示轉盤）
  useEffect(() => {
    // 轉盤先用預設獎品名稱渲染，讓 canvas 顯示出來
    const defaultPrizes = [
      '正裝乙件', '精華液組', '面膜×3', '小樣組',
      '85折券', '9折券', '生日禮', '積分×200',
    ].map(name => ({ name, color: '' }))
    setPrizes(defaultPrizes)
  }, [])

  // 初始 canvas 繪製
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || prizes.length === 0) return
    const ctx = canvas.getContext('2d')!
    const size = canvas.width
    drawWheel(ctx, prizes, angleRef.current, size)
  }, [prizes])

  async function handleSpin() {
    if (spinning || done) return
    setSpinning(true)
    setError('')

    const lineUid = sessionStorage.getItem('lineUid')
    const orderNumber = sessionStorage.getItem('orderNumber')

    if (!lineUid || !orderNumber) {
      router.replace('/review')
      return
    }

    const res = await fetch('/api/review/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUid, orderNumber }),
    })
    const data = await res.json()

    if (!res.ok || data.error) {
      setError(data.error || '抽獎失敗，請稍後再試')
      setSpinning(false)
      return
    }

    const { prizeIndex, prizeName } = data
    sessionStorage.setItem('prizeName', prizeName)

    // 計算目標角度：讓 prizeIndex 對應的扇形停在指針下方（頂部 = -π/2）
    const segAngle = (Math.PI * 2) / SEGMENT_COUNT
    const targetSegCenter = prizeIndex * segAngle + segAngle / 2
    // 指針在頂部（-π/2），所以需要讓 targetSegCenter 轉到 -π/2
    const finalAngle = -Math.PI / 2 - targetSegCenter + Math.PI * 2 * 6 // 6 圈

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const size = canvas.width
    const startAngle = angleRef.current
    const startTime = performance.now()
    const duration = 4500 // ms

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutQuint(progress)
      const currentAngle = startAngle + (finalAngle - startAngle) * eased
      angleRef.current = currentAngle
      drawWheel(ctx, prizes, currentAngle, size)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setSpinning(false)
        setDone(true)
        router.push(`/review/result?prize=${encodeURIComponent(prizeName)}`)
      }
    }

    requestAnimationFrame(animate)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-2xl font-bold text-pink-700 mb-6">轉動幸運轉盤！</h1>

      {/* 指針 */}
      <div className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-10 text-3xl">
          ▼
        </div>
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="rounded-full shadow-xl"
        />
      </div>

      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

      <button
        onClick={handleSpin}
        disabled={spinning || done}
        className="mt-8 px-10 py-4 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200 text-white font-bold text-lg rounded-full shadow-lg transition-all active:scale-95"
      >
        {spinning ? '轉動中...' : done ? '已抽獎' : 'GO 🎯'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/review/spin/
git commit -m "feat: add Canvas spin wheel with easing animation"
```

---

## Task 14: 結果頁（result）

**Files:**
- Create: `src/app/review/result/page.tsx`

- [ ] **Step 1: 建立 result 頁面**

```typescript
// src/app/review/result/page.tsx
'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ResultContent() {
  const searchParams = useSearchParams()
  const prizeName = searchParams.get('prize') || sessionStorage.getItem('prizeName') || '好禮'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="text-6xl mb-6 animate-bounce">🎉</div>

      <h1 className="text-3xl font-bold text-pink-700 mb-4">恭喜您！</h1>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 w-full max-w-sm">
        <p className="text-gray-500 text-sm mb-2">您抽到了</p>
        <p className="text-2xl font-bold text-pink-600">{prizeName}</p>
      </div>

      <div className="bg-pink-50 rounded-xl p-4 w-full max-w-sm text-left">
        <p className="text-sm font-medium text-pink-700 mb-2">📦 兌獎方式</p>
        <p className="text-sm text-gray-600">
          我們會在 3 個工作天內，透過 LINE 聯繫您確認收件地址。請記得保持 LINE 開啟接收通知！
        </p>
      </div>

      <p className="text-gray-400 text-xs mt-8">
        感謝您的評價，讓 HEIWEI 越來越好 💕
      </p>
    </div>
  )
}

export default function ResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/review/result/
git commit -m "feat: add prize result page"
```

---

## Task 15: Google Sheets 初始設定 & 部署

**Files:**
- Modify: `.env.local`（填入真實值）

- [ ] **Step 1: 建立 Google Sheets（3 個分頁）**

在 Google Sheets 建立新試算表，新增三個分頁：

**分頁 1：評價紀錄**（第一列 = 標題列）
```
A1: 時間戳記  B1: LINE UID  C1: 訂單編號  D1: 星評  E1: 評價內容  F1: 已抽獎
```

**分頁 2：中獎紀錄**（第一列 = 標題列）
```
A1: 時間戳記  B1: LINE UID  C1: 訂單編號  D1: 獎品名稱  E1: 兌獎狀態
```

**分頁 3：獎品設定**（第一列 = 標題列，第 2–9 列 = 8 格設定）
```
A1: 格號  B1: 獎品名稱  C1: 機率  D1: 顏色
A2: 1     B2: 正裝產品乙件  C2: 3   D2: #FF6B9D
A3: 2     B3: 精華液體驗組  C3: 7   D3: #FFB347
A4: 3     B4: 面膜×3片     C4: 10  D4: #87CEEB
A5: 4     B5: 小樣組合包   C5: 15  D5: #98FB98
A6: 5     B6: 85折優惠券   C6: 15  D6: #DDA0DD
A7: 6     B7: 9折優惠券    C7: 20  D7: #F0E68C
A8: 7     B8: 生日加碼禮   C8: 10  D8: #20B2AA
A9: 8     B9: 積分×200點   C9: 20  D9: #FF8C69
```

- [ ] **Step 2: 設定 Service Account**

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立專案 → 啟用 Google Sheets API
3. 建立 Service Account → 產生 JSON 金鑰
4. 將 Service Account 的 email 加入 Sheets 的「共用」（編輯者權限）
5. 將金鑰的 `client_email` 和 `private_key` 填入 `.env.local`

- [ ] **Step 3: Shopline 重新產生 Token**

1. 登入 Shopline 後台
2. 找到 API Auth 頁面
3. 撤銷舊 Token
4. 重新產生 → 填入 `.env.local` 的 `SHOPLINE_ACCESS_TOKEN`

- [ ] **Step 4: LINE LIFF App 設定**

1. 前往 [LINE Developers Console](https://developers.line.biz)
2. 選擇 HEIWEI 的 Messaging API Channel
3. 建立 LIFF App：尺寸選 Full，Endpoint URL 暫填 `https://heiwei-review.vercel.app/review`
4. 複製 LIFF ID → 填入 `.env.local` 的 `NEXT_PUBLIC_LIFF_ID`

- [ ] **Step 5: 部署到 Vercel**

```bash
cd /Users/mac/Downloads/sam-agent/heiwei-review
npx vercel --prod
```

依照提示：
- 專案名稱：`heiwei-review`
- Framework：Next.js（自動偵測）
- 不需調整其他設定

- [ ] **Step 6: 設定 Vercel 環境變數**

```bash
npx vercel env add NEXT_PUBLIC_LIFF_ID production
npx vercel env add LINE_CHANNEL_ACCESS_TOKEN production
npx vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production
npx vercel env add GOOGLE_PRIVATE_KEY production
npx vercel env add GOOGLE_SHEET_ID production
npx vercel env add SHOPLINE_ACCESS_TOKEN production
```

每個指令執行後貼入對應值。

- [ ] **Step 7: 更新 LIFF Endpoint URL**

取得 Vercel 部署網址後（例如 `https://heiwei-review.vercel.app`），回到 LINE Developers Console 更新 LIFF 的 Endpoint URL：
```
https://heiwei-review.vercel.app/review
```

- [ ] **Step 8: 端對端測試**

1. 複製 LIFF URL：`https://liff.line.me/{LIFF_ID}`
2. 在手機 LINE 中開啟
3. 確認 LINE 登入 → 進入驗證頁
4. 輸入一個真實的 Shopline 訂單編號
5. 填寫評價 → 點「提交」
6. 確認轉盤旋轉並停下
7. 確認 LINE 收到中獎推播
8. 確認 Google Sheets 評價紀錄 & 中獎紀錄都有新增一列

- [ ] **Step 9: Final commit**

```bash
git add .
git commit -m "feat: heiwei-review complete — review spin lottery system"
```

---

## 上線前快速清單

- [ ] Shopline Token 已更新（舊 token 已撤銷）
- [ ] Google Sheets 3 個分頁名稱正確（評價紀錄 / 中獎紀錄 / 獎品設定）
- [ ] 獎品機率加總 = 100
- [ ] LINE LIFF Endpoint URL 已更新為 Vercel 正式網址
- [ ] 測試用真實訂單編號做過完整流程
- [ ] LINE 推播確認有收到
