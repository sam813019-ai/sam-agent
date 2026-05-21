import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function() {
    return { messages: { create: mockCreate } };
  }),
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
