import type { FormValues } from '../lib/mapping';
import { ASCRS_FIELD_MAP, READONLY_IDS, ASPNET_STATE_PREFIX, type FieldLocator } from './selectors';

export interface FillOutcome {
  field: string;
  ok: boolean;
  reason?: string;
}

/** 頁面上第一組 K 欄位到底是平軸還是陡軸 */
export type KOrientation = 'flat-first' | 'steep-first' | 'unknown';

export interface FillReport {
  filled: number;
  total: number;
  failures: FillOutcome[];
  kOrientation: KOrientation;
}

const K_FIELDS = ['flatK', 'flatKAxis', 'steepK', 'steepKAxis'] as const;

/**
 * 直接呼叫原生 value setter，繞過框架在實例上覆寫的 setter。
 * 實測 APACRS 是 ASP.NET Web Forms 沒有受控元件，這層保險留著以防官網改版。
 */
export function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): void {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
    : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype
    : HTMLInputElement.prototype;

  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  const instanceSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;

  if (nativeSetter !== undefined && instanceSetter !== nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }
}

/**
 * 派發事件讓頁面同步狀態。
 *
 * ⚠️ ASP.NET 的 AutoPostBack 欄位會在 change 時呼叫 __doPostBack 觸發整頁回傳，
 * 把我們已經填好的其他欄位全部沖掉。因此偵測到 onchange 帶 __doPostBack 的欄位
 * 就只派發 input，不派發 change —— 值已經寫進 DOM，送出表單時仍會帶上。
 */
export function fireInputEvents(el: Element): void {
  const onchange = el.getAttribute('onchange') ?? '';
  const willPostBack = onchange.includes('__doPostBack');

  el.dispatchEvent(new Event('focus', { bubbles: true }));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  if (!willPostBack) {
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

/** 取一個元素的直接文字（不含子元素內的文字），用來判斷它是不是欄位說明 */
function ownText(el: Element): string {
  return Array.from(el.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent ?? '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 從說明文字元素往外找到它描述的那個輸入框 */
function inputNear(labelEl: Element): HTMLInputElement | null {
  const own = labelEl.querySelector('input');
  if (own instanceof HTMLInputElement) return own;

  let sibling = labelEl.nextElementSibling;
  for (let hops = 0; sibling !== null && hops < 3; hops += 1) {
    if (sibling instanceof HTMLInputElement) return sibling;
    const nested = sibling.querySelector('input');
    if (nested instanceof HTMLInputElement) return nested;
    sibling = sibling.nextElementSibling;
  }
  return null;
}

export function locateField(locator: FieldLocator, root: Document): HTMLInputElement | null {
  if (locator.id !== undefined) {
    const byId = root.getElementById(locator.id);
    if (byId instanceof HTMLInputElement) return byId;
  }

  for (const label of Array.from(root.querySelectorAll('label'))) {
    if (!locator.labelPattern.test(ownText(label))) continue;
    const forId = label.getAttribute('for');
    if (forId !== null) {
      const target = root.getElementById(forId);
      if (target instanceof HTMLInputElement) return target;
    }
    const nested = inputNear(label);
    if (nested !== null) return nested;
  }

  // ASP.NET 頁面沒有 <label>，欄位說明只是同一列的一個 td/span
  for (const cell of Array.from(root.querySelectorAll('td, th, span, div, p, b, strong'))) {
    if (!locator.labelPattern.test(ownText(cell))) continue;
    const near = inputNear(cell);
    if (near !== null) return near;
  }

  return null;
}

/**
 * 反向驗證：頁面上第一組 K 欄位究竟標示為平軸還是陡軸。
 *
 * 實測的 APACRS 頁面兩個 K 欄位旁只印 "(30~60 D)"，讀不出平/陡 —— 此時回 unknown，
 * 由呼叫端依設定的預設（第一組 = 平軸，客戶 2026-08-27 確認）填入。
 * 只要頁面上讀得到相反的字樣，就回 steep-first，呼叫端必須拒填而不是填反。
 */
export function detectKOrientation(root: Document): KOrientation {
  const first = root.getElementById(ASCRS_FIELD_MAP.flatK.id ?? '');
  const second = root.getElementById(ASCRS_FIELD_MAP.steepK.id ?? '');
  if (first === null || second === null) return 'unknown';

  const contextOf = (el: Element): string =>
    (el.closest('tr') ?? el.parentElement ?? el).textContent?.replace(/\s+/g, ' ').trim() ?? '';

  const firstText = contextOf(first);
  const secondText = contextOf(second);

  const firstFlat = /flat|\bK1\b/i.test(firstText);
  const firstSteep = /steep|\bK2\b/i.test(firstText);
  const secondFlat = /flat|\bK1\b/i.test(secondText);
  const secondSteep = /steep|\bK2\b/i.test(secondText);

  if (firstFlat && !firstSteep) return 'flat-first';
  if (firstSteep && !firstFlat) return 'steep-first';
  if (secondSteep && !secondFlat) return 'flat-first';
  if (secondFlat && !secondSteep) return 'steep-first';
  return 'unknown';
}

function isWritable(el: HTMLInputElement): boolean {
  if (el.readOnly || el.disabled) return false;
  if (el.id.startsWith(ASPNET_STATE_PREFIX)) return false;
  if ((READONLY_IDS as readonly string[]).includes(el.id)) return false;
  return true;
}

export function fillForm(values: FormValues, root: Document): FillReport {
  const failures: FillOutcome[] = [];
  let filled = 0;
  let total = 0;

  const kOrientation = detectKOrientation(root);
  const kReversed = kOrientation === 'steep-first';

  const entries = Object.entries(ASCRS_FIELD_MAP) as [keyof FormValues, FieldLocator][];

  for (const [field, locator] of entries) {
    const value = values[field];

    // null（LT/WTW 讀不到）與空字串（病患姓名/病歷號）一律不碰，也不計入分母
    if (value === null || value === '') continue;

    total += 1;

    if (kReversed && (K_FIELDS as readonly string[]).includes(field)) {
      failures.push({
        field,
        ok: false,
        reason: '頁面上第一組 K 欄位標示為陡軸，與預設的平軸相反。已停止填入 K 值，請人工填寫並回報此狀況。',
      });
      continue;
    }

    const el = locateField(locator, root);
    if (el === null) {
      failures.push({ field, ok: false, reason: '在頁面上找不到這個欄位' });
      continue;
    }
    if (!isWritable(el)) {
      failures.push({ field, ok: false, reason: '這個欄位唯讀或已停用，不得寫入' });
      continue;
    }

    setNativeValue(el, String(value));
    fireInputEvents(el);
    filled += 1;
  }

  return { filled, total, failures, kOrientation };
}
