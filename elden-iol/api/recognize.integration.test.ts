// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POST, OPTIONS } from './recognize';

const here = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = 'test-token-not-for-production';
process.env['ELDEN_ACCESS_TOKEN'] = TOKEN;
const samplePath = path.join(here, '../docs/samples/iolmaster700_report_sample.jpg');
const hasKey = typeof process.env['ANTHROPIC_API_KEY'] === 'string';

function recognizeSample(): Promise<Response> {
  const imageBase64 = fs.readFileSync(samplePath).toString('base64');
  return POST(
    new Request('http://localhost/api/recognize', {
      method: 'POST',
      headers: { 'x-elden-token': TOKEN },
      body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg' }),
    }),
  );
}

describe.skipIf(!hasKey)('POST /api/recognize（真實呼叫 Claude）', () => {
  it('從樣本報告單抽出正確的右眼數值', async () => {
    const res = await recognizeSample();
    expect(res.status).toBe(200);

    const result = await res.json();
    const od = result.eyes.find((e: { laterality: string }) => e.laterality === 'OD');

    expect(od.al.value).toBeCloseTo(24.49, 2);
    expect(od.acd.value).toBeCloseTo(3.15, 2);
    expect(od.k1.value).toBeCloseTo(43.08, 2);
    expect(od.k2.value).toBeCloseTo(45.58, 2);
    expect(od.k1Axis.value).toBe(96);
    expect(od.k2Axis.value).toBe(6);
  }, 180_000);

  it('抽出客戶指定要帶入的 LT 與 WTW', async () => {
    const res = await recognizeSample();
    const result = await res.json();
    const od = result.eyes.find((e: { laterality: string }) => e.laterality === 'OD');
    expect(od.lt.value).toBeCloseTo(4.99, 2);
    expect(od.wtw.value).toBeCloseTo(11.6, 1);
  }, 180_000);

  it('抓到眼軸不一致的警告訊息', async () => {
    const res = await recognizeSample();
    const result = await res.json();
    expect(result.warnings.join(' ')).toMatch(/[Aa]xial length/);
  }, 180_000);

  it('把 AL 的 (!) 標記為 borderline', async () => {
    const res = await recognizeSample();
    const result = await res.json();
    const od = result.eyes.find((e: { laterality: string }) => e.laterality === 'OD');
    expect(od.al.borderline).toBe(true);
  }, 180_000);

  it('逐字記錄儀器名稱到 deviceRawText', async () => {
    const res = await recognizeSample();
    const result = await res.json();
    expect(result.device).toBe('IOLMaster700');
    expect(result.deviceRawText).toMatch(/IOLMaster/i);
  }, 180_000);

  it('不把病患姓名或病歷號帶進結果', async () => {
    const res = await recognizeSample();
    const body = JSON.stringify(await res.json());
    expect(body).not.toMatch(/patientName|patientId|病歷/);
  }, 180_000);
});

describe('POST /api/recognize — 存取權杖（不需 API key）', () => {
  const body = JSON.stringify({ imageBase64: 'abc', mediaType: 'image/jpeg' });

  it('沒帶權杖時回 401，且不會走到辨識', async () => {
    const res = await POST(
      new Request('http://localhost/api/recognize', { method: 'POST', body }),
    );
    expect(res.status).toBe(401);
  });

  it('權杖錯誤時回 401', async () => {
    const res = await POST(
      new Request('http://localhost/api/recognize', {
        method: 'POST', headers: { 'x-elden-token': 'wrong-guess-value-here' }, body,
      }),
    );
    expect(res.status).toBe(401);
  });

  it('權杖長度相同但內容不同也要回 401', async () => {
    const res = await POST(
      new Request('http://localhost/api/recognize', {
        method: 'POST', headers: { 'x-elden-token': 'x'.repeat(TOKEN.length) }, body,
      }),
    );
    expect(res.status).toBe(401);
  });

  it('伺服器沒設定權杖時一律擋下，不可預設開放', async () => {
    const saved = process.env['ELDEN_ACCESS_TOKEN'];
    delete process.env['ELDEN_ACCESS_TOKEN'];
    const res = await POST(
      new Request('http://localhost/api/recognize', {
        method: 'POST', headers: { 'x-elden-token': saved ?? '' }, body,
      }),
    );
    process.env['ELDEN_ACCESS_TOKEN'] = saved;
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain('存取權杖');
  });

  it('OPTIONS 預檢不需要權杖，且允許帶 x-elden-token 標頭', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('x-elden-token');
  });
});

describe('POST /api/recognize — 輸入驗證（不需 API key）', () => {
  it('缺少 imageBase64 時回 400', async () => {
    const res = await POST(
      new Request('http://localhost/api/recognize', {
        method: 'POST',
        headers: { 'x-elden-token': TOKEN },
        body: JSON.stringify({ mediaType: 'image/jpeg' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('不支援的 mediaType 回 400', async () => {
    const res = await POST(
      new Request('http://localhost/api/recognize', {
        method: 'POST',
        headers: { 'x-elden-token': TOKEN },
        body: JSON.stringify({ imageBase64: 'abc', mediaType: 'image/gif' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('body 不是合法 JSON 時回 400', async () => {
    const res = await POST(
      new Request('http://localhost/api/recognize', {
        method: 'POST',
        headers: { 'x-elden-token': TOKEN },
        body: '不是 JSON',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('圖片超過 8 MB 時回 413', async () => {
    const res = await POST(
      new Request('http://localhost/api/recognize', {
        method: 'POST',
        headers: { 'x-elden-token': TOKEN },
        body: JSON.stringify({ imageBase64: 'A'.repeat(12 * 1024 * 1024), mediaType: 'image/jpeg' }),
      }),
    );
    expect(res.status).toBe(413);
  });

  it('OPTIONS 預檢回 204 並帶 CORS 標頭', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});
