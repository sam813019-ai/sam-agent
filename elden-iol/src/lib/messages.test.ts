import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendFillRequest } from './messages';
import type { FormValues, FormOptions } from './mapping';

const values: FormValues = {
  patientName: '', patientId: '', surgeonName: '中慈 Dr彭',
  flatK: 43.08, flatKAxis: 96, steepK: 45.58, steepKAxis: 6,
  al: 24.49, acd: 3.15, lt: 4.99, wtw: 11.6,
  sia: 0.2, siaAxis: 180, targetRefraction: 0,
};
const options: FormOptions = { kIndex: 1.3375, cylinderConvention: 'negative' };

const okReport = { filled: 12, total: 12, failures: [], kOrientation: 'unknown' as const };

beforeEach(() => vi.restoreAllMocks());

describe('sendFillRequest', () => {
  it('把訊息送到開著計算器的分頁', async () => {
    const sendMessage = vi.fn(async () => ({ type: 'FILL_RESULT', report: okReport }));
    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [{ id: 7, url: 'https://calc.apacrs.org/toric_calculator20/Toric%20Calculator.aspx' }]),
        sendMessage,
      },
    });
    const report = await sendFillRequest(values, options);
    expect(sendMessage).toHaveBeenCalledWith(7, expect.objectContaining({ type: 'FILL_FORM' }));
    expect(report.filled).toBe(12);
  });

  it('也認得從 ascrs.org 嵌入的情況（計算器在跨域 iframe 內）', async () => {
    const query = vi.fn(async ({ url }: { url: string[] }) =>
      url.some((u) => u.includes('ascrs.org'))
        ? [{ id: 9, url: 'https://www.ascrs.org/tools/barrett-toric-calculator' }]
        : []);
    vi.stubGlobal('chrome', {
      tabs: { query, sendMessage: vi.fn(async () => ({ type: 'FILL_RESULT', report: okReport })) },
    });
    await expect(sendFillRequest(values, options)).resolves.toMatchObject({ filled: 12 });
  });

  it('找不到計算器分頁時，給出可行動的錯誤訊息', async () => {
    vi.stubGlobal('chrome', { tabs: { query: vi.fn(async () => []), sendMessage: vi.fn() } });
    await expect(sendFillRequest(values, options)).rejects.toThrow(/Toric Calculator/);
  });

  it('分頁在但沒有任何 frame 回應時，說明可能還沒載完或被 Cloudflare 擋著', async () => {
    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [{ id: 7, url: 'https://calc.apacrs.org/x.aspx' }]),
        sendMessage: vi.fn(async () => undefined),
      },
    });
    await expect(sendFillRequest(values, options)).rejects.toThrow(/載入|重新整理/);
  });
});
