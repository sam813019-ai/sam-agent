import type { FormValues, FormOptions } from './mapping';
import type { FillReport } from '../content/fill';

export interface FillRequest {
  type: 'FILL_FORM';
  values: FormValues;
  options: FormOptions;
}

export interface FillResponse {
  type: 'FILL_RESULT';
  report: FillReport;
}

/**
 * 兩種開法都要認得：
 * 1. 直接開計算器網址 → 分頁 URL 就是 calc.apacrs.org
 * 2. 從 ascrs.org 的工具頁進去 → 分頁 URL 是 ascrs.org，計算器在跨域 iframe 內
 *    （content script 以 all_frames 注入，訊息會送到分頁裡的每個 frame，
 *      只有真的有計算器表單的那個 frame 會回應）
 */
const CALCULATOR_URL_PATTERNS = [
  'https://calc.apacrs.org/*',
  'https://www.ascrs.org/tools/barrett-toric-calculator*',
];

export async function sendFillRequest(
  values: FormValues,
  options: FormOptions,
): Promise<FillReport> {
  const tabs = await chrome.tabs.query({ url: CALCULATOR_URL_PATTERNS });
  const tab = tabs[0];

  if (tab?.id === undefined) {
    throw new Error('請先在另一個分頁打開 Barrett Toric Calculator，再按填入。');
  }

  const request: FillRequest = { type: 'FILL_FORM', values, options };
  const response = (await chrome.tabs.sendMessage(tab.id, request)) as FillResponse | undefined;

  if (response === undefined) {
    throw new Error('計算器分頁還沒有載入完成，或頁面停在 Cloudflare 驗證。請切過去確認畫面已顯示表單，重新整理後再試。');
  }

  return response.report;
}
