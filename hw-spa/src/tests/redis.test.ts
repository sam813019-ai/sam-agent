import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockSet, mockDel } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
  mockDel: vi.fn(),
}));

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn().mockReturnValue({
      get: mockGet,
      set: mockSet,
      del: mockDel,
    }),
  },
}));

import { getHistory, appendMessages, clearHistory, setHandoff, releaseHandoff, isHandoff, type Message } from '@/lib/redis';

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
      role: 'user' as const, content: `msg${i}`,
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

describe('handoff 狀態管理', () => {
  beforeEach(() => vi.clearAllMocks());

  it('setHandoff 寫入 handoff key，TTL 4 小時', async () => {
    await setHandoff('user-123');
    expect(mockSet).toHaveBeenCalledWith('handoff:user-123', '1', { ex: 14400 });
  });

  it('isHandoff 有值時回傳 true', async () => {
    mockGet.mockResolvedValue('1');
    expect(await isHandoff('user-123')).toBe(true);
    expect(mockGet).toHaveBeenCalledWith('handoff:user-123');
  });

  it('isHandoff 無值時回傳 false', async () => {
    mockGet.mockResolvedValue(null);
    expect(await isHandoff('user-123')).toBe(false);
  });

  it('releaseHandoff 刪除 handoff key', async () => {
    await releaseHandoff('user-123');
    expect(mockDel).toHaveBeenCalledWith('handoff:user-123');
  });
});
