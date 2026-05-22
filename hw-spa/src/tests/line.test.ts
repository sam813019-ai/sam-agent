import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockReply, mockPush, mockValidate } = vi.hoisted(() => ({
  mockReply: vi.fn(),
  mockPush: vi.fn(),
  mockValidate: vi.fn(),
}));

vi.mock('@line/bot-sdk', () => ({
  messagingApi: {
    MessagingApiClient: vi.fn().mockImplementation(function() {
      return { replyMessage: mockReply, pushMessage: mockPush };
    }),
  },
  validateSignature: mockValidate,
}));

import { verifySignature, replyMessage, replyWithHandoffOption, pushToAdmin } from '@/lib/line';

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
    await replyMessage('reply-token-123', '您好！');
    expect(mockReply).toHaveBeenCalledWith({
      replyToken: 'reply-token-123',
      messages: [{ type: 'text', text: '您好！' }],
    });
  });
});

describe('replyWithHandoffOption', () => {
  beforeEach(() => vi.clearAllMocks());

  it('回覆訊息附帶兩個 Quick Reply 按鈕', async () => {
    await replyWithHandoffOption('token-abc', '您好，這是回覆');
    expect(mockReply).toHaveBeenCalledWith({
      replyToken: 'token-abc',
      messages: [expect.objectContaining({
        type: 'text',
        text: '您好，這是回覆',
        quickReply: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ action: expect.objectContaining({ label: '請專人協助', text: '請專人協助' }) }),
            expect.objectContaining({ action: expect.objectContaining({ label: '不用，謝謝', text: '不用，謝謝' }) }),
          ]),
        }),
      })],
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
