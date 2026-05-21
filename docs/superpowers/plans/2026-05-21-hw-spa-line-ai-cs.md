# HW SPA LINE AI 客服系統實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/Users/mac/Downloads/sam-agent/hw-spa/` 建立全新 Next.js 專案，串接 LINE Messaging API、Claude Haiku、Upstash Redis 與 Google Sheets，實現 HEIWEI SPA 的 AI 自動客服。

**Architecture:** LINE Webhook → Vercel Function（`next/server` after()）→ [Upstash Redis 對話歷史 + Google Sheets 知識庫] → Claude Haiku → LINE 回覆。觸發人工接管條件時推播管理員 LINE ID。

**Tech Stack:** Next.js 16, @line/bot-sdk v8, @anthropic-ai/sdk, @upstash/redis, googleapis v144, Vitest

---

## 前置條件（動工前先確認）

下列服務帳號需要準備好，把 key 填入 `.env.local` 後才能本地測試：

| 服務 | 取得方式 |
|------|---------|
| LINE Channel Access Token & Secret | LINE Developers Console → HEIWEI SPA 頻道 |
| ADMIN_LINE_USER_ID | LINE Developers Console → 管理員自己的 userId |
| Anthropic API Key | console.anthropic.com |
| Upstash Redis URL & Token | upstash.com → 建一個 Redis database → REST API |
| Google Service Account | Google Cloud Console → 建 Service Account → 下載 JSON key |
| Google Sheet ID | 建立「HW SPA 知識庫」試算表後從 URL 取得 |

---

## 檔案結構總覽

```
hw-spa/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 最簡 layout（不改）
│   │   ├── page.tsx                # 簡單佔位頁
│   │   └── api/
│   │       └── webhook/
│   │           └── route.ts        # LINE Webhook 入口
│   └── lib/
│       ├── sheets.ts               # Google Sheets 知識庫（含快取）
│       ├── redis.ts                # Upstash Redis 對話歷史
│       ├── claude.ts               # Claude Haiku 呼叫與 handoff 判斷
│       └── line.ts                 # LINE SDK：回覆 & 推播管理員
├── src/tests/
│   ├── sheets.test.ts
│   ├── redis.test.ts
│   ├── claude.test.ts
│   └── line.test.ts
├── .env.local                      # 本地環境變數（不 commit）
├── .env.example                    # 環境變數範本（commit）
├── vitest.config.ts
├── next.config.ts
└── package.json
```

---

## Task 1：專案初始化

**Files:**
- Create: `/Users/mac/Downloads/sam-agent/hw-spa/` (整個專案)

- [ ] **Step 1: 用 create-next-app 建立專案**

```bash
cd /Users/mac/Downloads/sam-agent
npx create-next-app@latest hw-spa \
  --typescript \
  --no-tailwind \
  --app \
  --src-dir \
  --no-eslint \
  --import-alias "@/*"
```

等候完成（約 1 分鐘）。

- [ ] **Step 2: 安裝依賴**

```bash
cd /Users/mac/Downloads/sam-agent/hw-spa
npm install @line/bot-sdk @anthropic-ai/sdk @upstash/redis googleapis@144
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 3: 建立 vitest.config.ts**

建立 `/Users/mac/Downloads/sam-agent/hw-spa/vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: 在 package.json 加入 test 指令**

在 `scripts` 區塊加入：

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: 建立 .env.example**

建立 `/Users/mac/Downloads/sam-agent/hw-spa/.env.example`：

```env
# LINE
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
ADMIN_LINE_USER_ID=

# Claude
ANTHROPIC_API_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Google Sheets
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

- [ ] **Step 6: 建立 .env.local（填入實際值，之後補）**

```bash
cp .env.example .env.local
```

- [ ] **Step 7: 確認 .gitignore 包含 .env.local**

```bash
grep ".env.local" .gitignore
```

預期輸出包含 `.env.local`（create-next-app 預設已加）。

- [ ] **Step 8: 替換 src/app/page.tsx 為簡單佔位頁**

將 `src/app/page.tsx` 內容全部替換為：

```tsx
export default function Page() {
  return <main style={{ fontFamily: 'sans-serif', padding: 32 }}><h1>HW SPA Bot</h1><p>LINE 客服機器人運作中</p></main>;
}
```

- [ ] **Step 9: 建立 src/tests 目錄**

```bash
mkdir -p src/tests
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: init hw-spa Next.js project with LINE AI CS stack"
```

---

## Task 2：Google Sheets 知識庫（lib/sheets.ts）

**Files:**
- Create: `src/lib/sheets.ts`
- Create: `src/tests/sheets.test.ts`

- [ ] **Step 1: 先建立 sheets.test.ts**

建立 `src/tests/sheets.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetValues = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => ({})),
    },
    sheets: vi.fn().mockReturnValue({
      spreadsheets: {
        values: {
          get: mockGetValues,
        },
      },
    }),
  },
}));

import { getKnowledgeBase, formatKnowledgeForPrompt, getHandoffKeywords } from '@/lib/sheets';

describe('getKnowledgeBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_SHEET_ID = 'test-sheet-id';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = 'test-key';
  });

  it('解析療程、FAQ、轉人工關鍵字三個分頁', async () => {
    mockGetValues
      .mockResolvedValueOnce({ data: { values: [['深層清潔', '90分鐘', 'NT$2800', '油肌', '去除老廢角質', '敏感期告知']] } })
      .mockResolvedValueOnce({ data: { values: [['防曬可補噴嗎', '可以', '防曬']] } })
      .mockResolvedValueOnce({ data: { values: [['要預約', '需確認時段']] } });

    const kb = await getKnowledgeBase();

    expect(kb.services).toHaveLength(1);
    expect(kb.services[0].name).toBe('深層清潔');
    expect(kb.faqs).toHaveLength(1);
    expect(kb.faqs[0].question).toBe('防曬可補噴嗎');
    expect(kb.handoffKeywords).toHaveLength(1);
    expect(kb.handoffKeywords[0].keyword).toBe('要預約');
  });

  it('空 Sheet 時回傳空陣列（不噴錯）', async () => {
    mockGetValues.mockResolvedValue({ data: { values: null } });
    const kb = await getKnowledgeBase();
    expect(kb.services).toHaveLength(0);
    expect(kb.faqs).toHaveLength(0);
    expect(kb.handoffKeywords).toHaveLength(0);
  });
});

describe('formatKnowledgeForPrompt', () => {
  it('格式化成可讀的 prompt 字串', () => {
    const kb = {
      services: [{ name: '深層清潔', duration: '90分鐘', price: 'NT$2800', skinType: '油肌', description: '去角質', notes: '敏感期告知' }],
      faqs: [{ question: '可以補噴嗎', answer: '可以', category: '防曬' }],
      handoffKeywords: [],
    };
    const result = formatKnowledgeForPrompt(kb);
    expect(result).toContain('深層清潔');
    expect(result).toContain('可以補噴嗎');
  });
});

describe('getHandoffKeywords', () => {
  it('回傳關鍵字字串陣列', () => {
    const kb = {
      services: [],
      faqs: [],
      handoffKeywords: [{ keyword: '要預約', reason: '確認時段' }, { keyword: '退費', reason: '客訴' }],
    };
    expect(getHandoffKeywords(kb)).toEqual(['要預約', '退費']);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npm test -- src/tests/sheets.test.ts
```

預期：FAIL（模組尚未建立）

- [ ] **Step 3: 建立 src/lib/sheets.ts**

```typescript
import { google } from 'googleapis';

const CACHE_TTL = 5 * 60 * 1000;

export type ServiceItem = {
  name: string; duration: string; price: string;
  skinType: string; description: string; notes: string;
};
export type FaqItem = { question: string; answer: string; category: string };
export type HandoffKeyword = { keyword: string; reason: string };
export type KnowledgeBase = {
  services: ServiceItem[];
  faqs: FaqItem[];
  handoffKeywords: HandoffKeyword[];
};

let _cache: { data: KnowledgeBase; ts: number } | null = null;

function auth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

export async function getKnowledgeBase(): Promise<KnowledgeBase> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.data;

  const sheets = google.sheets({ version: 'v4', auth: auth() });
  const id = process.env.GOOGLE_SHEET_ID!;

  const [svc, faq, ho] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: id, range: '療程與服務!A2:F' }),
    sheets.spreadsheets.values.get({ spreadsheetId: id, range: '產品FAQ!A2:C' }),
    sheets.spreadsheets.values.get({ spreadsheetId: id, range: '轉人工關鍵字!A2:B' }),
  ]);

  const row = (r: string[] | undefined, i: number) => r?.[i] ?? '';

  const data: KnowledgeBase = {
    services: (svc.data.values ?? []).map(r => ({
      name: row(r, 0), duration: row(r, 1), price: row(r, 2),
      skinType: row(r, 3), description: row(r, 4), notes: row(r, 5),
    })),
    faqs: (faq.data.values ?? []).map(r => ({
      question: row(r, 0), answer: row(r, 1), category: row(r, 2),
    })),
    handoffKeywords: (ho.data.values ?? []).map(r => ({
      keyword: row(r, 0), reason: row(r, 1),
    })),
  };

  _cache = { data, ts: Date.now() };
  return data;
}

export function formatKnowledgeForPrompt(kb: KnowledgeBase): string {
  const services = kb.services.map(s =>
    `【${s.name}】時間：${s.duration}｜價格：${s.price}｜適合：${s.skinType}\n說明：${s.description}\n注意：${s.notes}`
  ).join('\n\n');
  const faqs = kb.faqs.map(f => `Q：${f.question}\nA：${f.answer}`).join('\n\n');
  return `=== 療程與服務 ===\n${services}\n\n=== 產品 FAQ ===\n${faqs}`;
}

export function getHandoffKeywords(kb: KnowledgeBase): string[] {
  return kb.handoffKeywords.map(h => h.keyword);
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npm test -- src/tests/sheets.test.ts
```

預期：PASS（3 個 tests）

- [ ] **Step 5: Commit**

```bash
git add src/lib/sheets.ts src/tests/sheets.test.ts
git commit -m "feat: Google Sheets knowledge base with 5-min cache"
```

---

## Task 3：Redis 對話歷史（lib/redis.ts）

**Files:**
- Create: `src/lib/redis.ts`
- Create: `src/tests/redis.test.ts`

- [ ] **Step 1: 先建立 redis.test.ts**

建立 `src/tests/redis.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn().mockReturnValue({
      get: mockGet,
      set: mockSet,
      del: mockDel,
    }),
  },
}));

import { getHistory, appendMessages, clearHistory, type Message } from '@/lib/redis';

describe('getHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Redis 有資料時回傳訊息陣列', async () => {
    const msgs: Message[] = [{ role: 'user', content: '你好' }];
    mockGet.mockResolvedValue(msgs);
    const result = await getHistory('user-123');
    expect(result).toEqual(msgs);
    expect(mockGet).toHaveBeenCalledWith('chat:user-123');
  });

  it('Redis 無資料時回傳空陣列', async () => {
    mockGet.mockResolvedValue(null);
    expect(await getHistory('user-456')).toEqual([]);
  });
});

describe('appendMessages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('新增訊息並保留最多 10 則', async () => {
    const existing: Message[] = Array.from({ length: 9 }, (_, i) => ({
      role: 'user', content: `msg${i}`,
    }));
    mockGet.mockResolvedValue(existing);

    await appendMessages('user-123', [
      { role: 'user', content: '新訊息' },
      { role: 'assistant', content: '回覆' },
    ]);

    const saved = mockSet.mock.calls[0][1] as Message[];
    expect(saved).toHaveLength(10);
    expect(saved[saved.length - 1].content).toBe('回覆');
    expect(mockSet).toHaveBeenCalledWith('chat:user-123', expect.any(Array), { ex: 86400 });
  });
});

describe('clearHistory', () => {
  it('刪除指定 userId 的 key', async () => {
    await clearHistory('user-123');
    expect(mockDel).toHaveBeenCalledWith('chat:user-123');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npm test -- src/tests/redis.test.ts
```

預期：FAIL

- [ ] **Step 3: 建立 src/lib/redis.ts**

```typescript
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const KEY = (userId: string) => `chat:${userId}`;
const MAX = 10;
const TTL = 86400;

export type Message = { role: 'user' | 'assistant'; content: string };

export async function getHistory(userId: string): Promise<Message[]> {
  return (await redis.get<Message[]>(KEY(userId))) ?? [];
}

export async function appendMessages(userId: string, messages: Message[]): Promise<void> {
  const history = await getHistory(userId);
  const updated = [...history, ...messages].slice(-MAX);
  await redis.set(KEY(userId), updated, { ex: TTL });
}

export async function clearHistory(userId: string): Promise<void> {
  await redis.del(KEY(userId));
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npm test -- src/tests/redis.test.ts
```

預期：PASS（4 個 tests）

- [ ] **Step 5: Commit**

```bash
git add src/lib/redis.ts src/tests/redis.test.ts
git commit -m "feat: Upstash Redis conversation history (10 msgs, 24hr TTL)"
```

---

## Task 4：Claude AI 整合（lib/claude.ts）

**Files:**
- Create: `src/lib/claude.ts`
- Create: `src/tests/claude.test.ts`

- [ ] **Step 1: 先建立 claude.test.ts**

建立 `src/tests/claude.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

import { chat } from '@/lib/claude';

const mockHistory = [{ role: 'user' as const, content: '你好' }];
const mockKnowledge = '=== 療程 ===\n深層清潔\n=== FAQ ===\nQ:可以補噴嗎\nA:可以';
const mockKeywords = ['要預約', '退費', '過敏'];

describe('chat', () => {
  beforeEach(() => vi.clearAllMocks());

  it('正常回覆時回傳 shouldHandoff=false', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '您好！我是小薇，請問有什麼可以幫您？' }],
    });

    const result = await chat('你好', mockHistory, mockKnowledge, mockKeywords);

    expect(result.reply).toBe('您好！我是小薇，請問有什麼可以幫您？');
    expect(result.shouldHandoff).toBe(false);
  });

  it('回覆含 [HANDOFF] 時回傳 shouldHandoff=true 且移除標記', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '感謝您的詢問！我們的專員將盡快與您聯繫，請稍候 ☺️ [HANDOFF]' }],
    });

    const result = await chat('我要預約', mockHistory, mockKnowledge, mockKeywords);

    expect(result.shouldHandoff).toBe(true);
    expect(result.reply).not.toContain('[HANDOFF]');
    expect(result.reply).toContain('感謝您的詢問');
  });

  it('使用正確的模型與訊息格式', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '好的' }],
    });

    await chat('測試', [], mockKnowledge, mockKeywords);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
      })
    );
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npm test -- src/tests/claude.test.ts
```

預期：FAIL

- [ ] **Step 3: 建立 src/lib/claude.ts**

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const HANDOFF = '[HANDOFF]';

function systemPrompt(knowledge: string, keywords: string[]): string {
  return `你是 HEIWEI SPA 的專業客服助理，名字是小薇。

【品牌介紹】
HEIWEI 何謂美是一個專注台灣市場的保養品牌，旗下設有實體 SPA 美容院與線上通路。產品針對台灣氣候與敏弱肌調配，秉持「少即是多」的極簡保養哲學。

【知識庫】
${knowledge}

【需要轉交專員的情境】
${keywords.join('、')}

【回覆規則】
1. 使用繁體中文，語氣親切專業，帶有溫度
2. 回覆簡潔，不超過 150 字
3. 不捏造知識庫以外的資訊；若問題超出範圍，誠實說明
4. 當對話觸及上方任一轉交情境，或連續 2 次無法回答時，回覆：「感謝您的詢問！我們的專員將盡快與您聯繫，請稍候 ☺️」，並在回覆末尾加上 ${HANDOFF}`;
}

export type ChatResult = { reply: string; shouldHandoff: boolean };

export async function chat(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  knowledge: string,
  handoffKeywords: string[],
): Promise<ChatResult> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt(knowledge, handoffKeywords),
    messages: [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  return {
    reply: raw.replace(HANDOFF, '').trim(),
    shouldHandoff: raw.includes(HANDOFF),
  };
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npm test -- src/tests/claude.test.ts
```

預期：PASS（3 個 tests）

- [ ] **Step 5: Commit**

```bash
git add src/lib/claude.ts src/tests/claude.test.ts
git commit -m "feat: Claude Haiku integration with handoff detection"
```

---

## Task 5：LINE 訊息整合（lib/line.ts）

**Files:**
- Create: `src/lib/line.ts`
- Create: `src/tests/line.test.ts`

- [ ] **Step 1: 先建立 line.test.ts**

建立 `src/tests/line.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReply = vi.fn();
const mockPush = vi.fn();
const mockValidate = vi.fn();

vi.mock('@line/bot-sdk', () => ({
  messagingApi: {
    MessagingApiClient: vi.fn().mockImplementation(() => ({
      replyMessage: mockReply,
      pushMessage: mockPush,
    })),
  },
  validateSignature: mockValidate,
}));

import { verifySignature, replyMessage, pushToAdmin } from '@/lib/line';

describe('verifySignature', () => {
  it('委派給 validateSignature 並回傳結果', () => {
    process.env.LINE_CHANNEL_SECRET = 'test-secret';
    mockValidate.mockReturnValue(true);
    expect(verifySignature('body', 'sig')).toBe(true);
    expect(mockValidate).toHaveBeenCalledWith('body', 'test-secret', 'sig');
  });
});

describe('replyMessage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('呼叫 LINE replyMessage API', async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token';
    await replyMessage('reply-token-123', '您好！');
    expect(mockReply).toHaveBeenCalledWith({
      replyToken: 'reply-token-123',
      messages: [{ type: 'text', text: '您好！' }],
    });
  });
});

describe('pushToAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('有設定 ADMIN_LINE_USER_ID 時推播', async () => {
    process.env.ADMIN_LINE_USER_ID = 'U123abc';
    await pushToAdmin('顧客：我要預約\n小薇：感謝您的詢問');
    expect(mockPush).toHaveBeenCalledWith({
      to: 'U123abc',
      messages: [expect.objectContaining({ type: 'text' })],
    });
  });

  it('未設定 ADMIN_LINE_USER_ID 時不呼叫 API', async () => {
    delete process.env.ADMIN_LINE_USER_ID;
    await pushToAdmin('摘要');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npm test -- src/tests/line.test.ts
```

預期：FAIL

- [ ] **Step 3: 建立 src/lib/line.ts**

```typescript
import { messagingApi, validateSignature } from '@line/bot-sdk';

export const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

export function verifySignature(body: string, signature: string): boolean {
  return validateSignature(body, process.env.LINE_CHANNEL_SECRET!, signature);
}

export async function replyMessage(replyToken: string, text: string): Promise<void> {
  await client.replyMessage({
    replyToken,
    messages: [{ type: 'text', text }],
  });
}

export async function pushToAdmin(summary: string): Promise<void> {
  const adminId = process.env.ADMIN_LINE_USER_ID;
  if (!adminId) return;
  await client.pushMessage({
    to: adminId,
    messages: [{ type: 'text', text: `🔔 需要人工接手\n\n${summary}` }],
  });
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npm test -- src/tests/line.test.ts
```

預期：PASS（4 個 tests）

- [ ] **Step 5: Commit**

```bash
git add src/lib/line.ts src/tests/line.test.ts
git commit -m "feat: LINE messaging lib with reply and admin push"
```

---

## Task 6：Webhook 路由（api/webhook/route.ts）

**Files:**
- Create: `src/app/api/webhook/route.ts`

- [ ] **Step 1: 建立 src/app/api/webhook/route.ts**

```typescript
import { after } from 'next/server';
import { verifySignature, replyMessage, pushToAdmin } from '@/lib/line';
import { getHistory, appendMessages } from '@/lib/redis';
import { getKnowledgeBase, formatKnowledgeForPrompt, getHandoffKeywords } from '@/lib/sheets';
import { chat } from '@/lib/claude';
import type { WebhookEvent } from '@line/bot-sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-line-signature') ?? '';

  if (!verifySignature(body, signature)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { events } = JSON.parse(body) as { events: WebhookEvent[] };

  after(async () => {
    for (const event of events) {
      if (event.type !== 'message' || event.message.type !== 'text') continue;

      const userId = event.source.userId ?? 'unknown';
      const userText = event.message.text;
      const replyToken = event.replyToken;

      try {
        const [history, kb] = await Promise.all([
          getHistory(userId),
          getKnowledgeBase(),
        ]);

        const { reply, shouldHandoff } = await chat(
          userText,
          history,
          formatKnowledgeForPrompt(kb),
          getHandoffKeywords(kb),
        );

        await Promise.all([
          replyMessage(replyToken, reply),
          appendMessages(userId, [
            { role: 'user', content: userText },
            { role: 'assistant', content: reply },
          ]),
        ]);

        if (shouldHandoff) {
          const recent = [...history, { role: 'user' as const, content: userText }, { role: 'assistant' as const, content: reply }];
          const summary = recent.slice(-6).map(m => `${m.role === 'user' ? '顧客' : '小薇'}：${m.content}`).join('\n');
          await pushToAdmin(summary);
        }
      } catch (err) {
        console.error('[webhook] Error:', err);
      }
    }
  });

  return new Response('OK', { status: 200 });
}
```

- [ ] **Step 2: 確認 TypeScript 無錯誤**

```bash
npx tsc --noEmit
```

預期：無錯誤輸出（exit code 0）

- [ ] **Step 3: 跑所有測試確認全綠**

```bash
npm test
```

預期：全部 PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/webhook/route.ts
git commit -m "feat: LINE webhook handler with after() background processing"
```

---

## Task 7：建立 Google Sheet 知識庫

**說明：** 這個 Task 是手動操作 Google Sheets。

- [ ] **Step 1: 建立試算表**

前往 Google Sheets → 新建試算表 → 命名為「**HW SPA 知識庫**」

- [ ] **Step 2: 建立三個分頁並設定標題列**

**分頁 1：療程與服務**（Sheet 名稱必須完全一致）

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| 療程名稱 | 時間 | 價格 | 適合膚質 | 療程說明 | 注意事項 |

**分頁 2：產品FAQ**

| A | B | C |
|---|---|---|
| 問題 | 答案 | 分類 |

**分頁 3：轉人工關鍵字**

| A | B |
|---|---|
| 關鍵字或情境 | 原因 |

- [ ] **Step 3: 填入初始資料（範例）**

分頁 1 第 2 列起填入療程；分頁 2 填入常見問題；分頁 3 至少填：

| 關鍵字或情境 | 原因 |
|------------|------|
| 要預約 | 需確認時段 |
| 想預約 | 需確認時段 |
| 退費 | 客訴處理 |
| 過敏 | 醫療相關 |
| 客訴 | 需人工處理 |

- [ ] **Step 4: 將 Service Account 加入試算表**

試算表右上角「共用」→ 加入 `GOOGLE_SERVICE_ACCOUNT_EMAIL` 的值 → 給予「檢視者」權限

- [ ] **Step 5: 複製 Sheet ID 填入 .env.local**

從試算表 URL 取得 Sheet ID（`/spreadsheets/d/<SHEET_ID>/edit`）

---

## Task 8：部署到 Vercel

- [ ] **Step 1: 在 sam-agent repo 確認 hw-spa 已 commit**

```bash
git log --oneline -6
```

- [ ] **Step 2: 登入 Vercel 並建立新專案**

```bash
cd /Users/mac/Downloads/sam-agent/hw-spa
npx vercel
```

選擇：
- Link to existing project? → **No**（建新的）
- Project name: **hw-spa**
- Framework: **Next.js**（自動偵測）

- [ ] **Step 3: 設定環境變數**

```bash
npx vercel env add LINE_CHANNEL_ACCESS_TOKEN
npx vercel env add LINE_CHANNEL_SECRET
npx vercel env add ADMIN_LINE_USER_ID
npx vercel env add ANTHROPIC_API_KEY
npx vercel env add UPSTASH_REDIS_REST_URL
npx vercel env add UPSTASH_REDIS_REST_TOKEN
npx vercel env add GOOGLE_SHEET_ID
npx vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
npx vercel env add GOOGLE_PRIVATE_KEY
```

每個指令都會提示你輸入值，選 **Production + Preview + Development**。

- [ ] **Step 4: 部署 Production**

```bash
npx vercel --prod
```

記下輸出的 URL，格式類似 `https://hw-spa-xxx.vercel.app`

- [ ] **Step 5: 設定 LINE Webhook URL**

前往 LINE Developers Console → HEIWEI SPA 頻道 → Messaging API → Webhook URL 填入：

```
https://hw-spa-xxx.vercel.app/api/webhook
```

點「Verify」確認回傳 200 OK。

- [ ] **Step 6: 開啟 Use webhook、關閉 Auto-reply**

在同一個頁面：
- Use webhook：**ON**
- Auto-reply messages：**OFF**
- Greeting messages：依需求設定

- [ ] **Step 7: 傳送測試訊息確認 AI 回覆正常**

用個人 LINE 帳號傳訊到 HEIWEI SPA LINE@，確認：
- 3 秒內收到小薇回覆
- 傳「我要預約」確認管理員收到推播通知

---

## 完成標準

- [ ] 所有 Vitest 測試通過（`npm test`）
- [ ] TypeScript 無型別錯誤（`npx tsc --noEmit`）
- [ ] LINE Webhook Verify 回傳 200
- [ ] 一般問題 3 秒內收到 AI 回覆
- [ ] 傳「我要預約」管理員收到推播
