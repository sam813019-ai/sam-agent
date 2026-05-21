import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetValues } = vi.hoisted(() => ({ mockGetValues: vi.fn() }));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(function() { return {}; }),
    },
    sheets: vi.fn().mockReturnValue({
      spreadsheets: { values: { get: mockGetValues } },
    }),
  },
}));

import { getKnowledgeBase, formatKnowledgeForPrompt, getHandoffKeywords, clearCache } from '@/lib/sheets';

describe('getKnowledgeBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
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
