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
export function clearCache() { _cache = null; }

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
