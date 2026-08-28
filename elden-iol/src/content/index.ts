import { fillForm } from './fill';
import { ASCRS_FIELD_MAP } from './selectors';
import type { FillRequest, FillResponse } from '../lib/messages';

/**
 * content script 以 all_frames 注入，同一個分頁裡每個 frame 都會收到訊息。
 * 只有真的載著計算器表單的那個 frame 該回應，否則空白 frame 會搶先回一個空結果。
 */
function hasCalculatorForm(): boolean {
  return document.getElementById(ASCRS_FIELD_MAP.al.id ?? '') !== null;
}

chrome.runtime.onMessage.addListener((message: FillRequest, _sender, sendResponse) => {
  if (message.type !== 'FILL_FORM') return false;
  if (!hasCalculatorForm()) return false;

  const report = fillForm(message.values, document);
  const response: FillResponse = { type: 'FILL_RESULT', report };
  sendResponse(response);
  return true;
});
