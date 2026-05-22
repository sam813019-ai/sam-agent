import { google } from 'googleapis';
import { Redis } from '@upstash/redis';

const MEM_TTL = 5 * 60 * 1000;   // in-memory: 5 min (同一 instance 熱快取)
const REDIS_TTL = 30 * 60;        // Redis: 30 min，跨 cold start 存活

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

const redis = Redis.fromEnv();
const KB_KEY = 'kb:cache';

let _mem: { data: KnowledgeBase; ts: number } | null = null;
export function clearCache() { _mem = null; }

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
  // L1: in-memory（同一 Vercel instance 內不打網路）
  if (_mem && Date.now() - _mem.ts < MEM_TTL) return _mem.data;

  // L2: Redis（跨 cold start，避免每次都打 Google Sheets API）
  const cached = await redis.get<KnowledgeBase>(KB_KEY);
  if (cached) {
    _mem = { data: cached, ts: Date.now() };
    return cached;
  }

  // L3: Google Sheets（真正的 source of truth）
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

  _mem = { data, ts: Date.now() };
  await redis.set(KB_KEY, data, { ex: REDIS_TTL });
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
