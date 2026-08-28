import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recognizeImage } from './api';

const validResult = {
  device: 'IOLMaster700',
  deviceRawText: 'IOLMaster 700',
  reportDate: '2026-07-17',
  warnings: [],
  overallConfidence: 0.95,
  eyes: [],
};

// 遮蔽邏輯已在 Task 6 完整測過；這裡把它換掉，讓本測試專注在上傳與回應驗證。
// （jsdom 的 createImageBitmap 產物餵不進 canvas 的 drawImage，硬接會失敗。）
vi.mock('../lib/redact', () => ({
  IOLMASTER_PII_REGIONS: [{ x: 0, y: 0, w: 1, h: 0.05 }],
  redactImage: vi.fn(() => ({ __redacted: true })),
  canvasToBase64Jpeg: vi.fn(() => 'REDACTED_BASE64'),
}));

beforeEach(() => {
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 100, height: 100 })));
});

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

const fakeFile = () => new File([new Uint8Array([1, 2, 3])], 'r.jpg', { type: 'image/jpeg' });

describe('recognizeImage', () => {
  it('回傳通過 schema 驗證的辨識結果', async () => {
    mockFetch(validResult);
    await expect(recognizeImage(fakeFile())).resolves.toMatchObject({ device: 'IOLMaster700' });
  });

  it('上傳的是遮蔽後的圖，不是原檔', async () => {
    const spy = vi.fn(
      async (_url: string, init: RequestInit) =>
        new Response(JSON.stringify(validResult), { status: 200 }),
    );
    vi.stubGlobal('fetch', spy);
    await recognizeImage(fakeFile());
    const body = JSON.parse(spy.mock.calls[0]![1].body as string);
    expect(body.imageBase64).toBe('REDACTED_BASE64');
    expect(body.imageBase64.startsWith('data:')).toBe(false);
    expect(body.mediaType).toBe('image/jpeg');
  });

  it('送出的內容不含檔名等原始檔案資訊', async () => {
    const spy = vi.fn(
      async (_url: string, init: RequestInit) =>
        new Response(JSON.stringify(validResult), { status: 200 }),
    );
    vi.stubGlobal('fetch', spy);
    await recognizeImage(new File([new Uint8Array([1])], '林許謹_病歷12345.jpg', { type: 'image/jpeg' }));
    expect(spy.mock.calls[0]![1].body as string).not.toContain('林許謹');
  });

  it('每次請求都帶上存取權杖標頭', async () => {
    const spy = vi.fn(
      async (_url: string, init: RequestInit) =>
        new Response(JSON.stringify(validResult), { status: 200 }),
    );
    vi.stubGlobal('fetch', spy);
    await recognizeImage(fakeFile());
    const headers = spy.mock.calls[0]![1].headers as Record<string, string>;
    expect(headers).toHaveProperty('x-elden-token');
  });

  it('伺服器回錯誤時，把錯誤訊息拋出來給 UI 顯示', async () => {
    mockFetch({ error: '辨識服務忙碌中，請稍後再試' }, 429);
    await expect(recognizeImage(fakeFile())).rejects.toThrow('辨識服務忙碌中');
  });

  it('回應不符合 schema 時拋錯，不讓壞資料流進 UI', async () => {
    mockFetch({ device: 'IOLMaster700' }, 200);
    await expect(recognizeImage(fakeFile())).rejects.toThrow();
  });
});
