import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  setNativeValue, fireInputEvents, locateField, fillForm, detectKOrientation,
} from './fill';
import { ASCRS_FIELD_MAP } from './selectors';
import type { FormValues } from '../lib/mapping';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = fs.readFileSync(path.join(here, 'fixtures/apacrs-form.html'), 'utf8');

const sampleValues: FormValues = {
  patientName: '', patientId: '',
  surgeonName: '中慈 Dr彭',
  flatK: 43.08, flatKAxis: 96,
  steepK: 45.58, steepKAxis: 6,
  al: 24.49, acd: 3.15,
  lt: 4.99, wtw: 11.6,
  sia: 0.2, siaAxis: 180,
  targetRefraction: 0,
};

const $ = (id: string) => document.querySelector<HTMLInputElement>(`#${id}`)!;

beforeEach(() => { document.body.innerHTML = fixture; });

describe('locateField', () => {
  it('用真實 id 找到欄位', () => {
    expect(locateField(ASCRS_FIELD_MAP.al, document)?.id).toBe('MainContent_AxLength');
  });

  it('id 失效時退回旁邊的說明文字（官網改版的後備路徑）', () => {
    $('MainContent_OpticalACD').id = 'id-已經被官網改掉';
    const el = locateField(ASCRS_FIELD_MAP.acd, document);
    expect(el?.id).toBe('id-已經被官網改掉');
  });

  it('兩種都找不到時回 null', () => {
    expect(locateField({ id: '不存在', labelPattern: /^絕對不會命中$/ }, document)).toBeNull();
  });

  it('文字定位時 Axial Length 不會誤命中 Lens Thickness', () => {
    $('MainContent_AxLength').id = 'x1';
    expect(locateField(ASCRS_FIELD_MAP.al, document)?.id).toBe('x1');
  });
});

describe('setNativeValue', () => {
  it('寫入一般 input', () => {
    setNativeValue($('MainContent_AxLength'), '24.49');
    expect($('MainContent_AxLength').value).toBe('24.49');
  });

  it('繞過框架覆寫的 setter（模擬受控元件）', () => {
    const el = $('MainContent_AxLength');
    let intercepted = '';
    Object.defineProperty(el, 'value', {
      configurable: true,
      get: () => intercepted,
      set: (v: string) => { intercepted = `框架吃掉了:${v}`; },
    });
    setNativeValue(el, '24.49');
    expect(intercepted).not.toContain('框架吃掉了');
  });
});

describe('fireInputEvents', () => {
  it('派發 input 與 change 事件', () => {
    const el = $('MainContent_AxLength');
    const seen: string[] = [];
    el.addEventListener('input', () => seen.push('input'));
    el.addEventListener('change', () => seen.push('change'));
    fireInputEvents(el);
    expect(seen).toContain('input');
    expect(seen).toContain('change');
  });

  it('欄位帶 __doPostBack 的 onchange 時不派發 change，避免整頁回傳沖掉已填欄位', () => {
    const el = $('MainContent_AxLength');
    el.setAttribute('onchange', "javascript:setTimeout('__doPostBack(\\'ctl00$MainContent$AxLength\\',\\'\\')', 0)");
    const seen: string[] = [];
    el.addEventListener('input', () => seen.push('input'));
    el.addEventListener('change', () => seen.push('change'));
    fireInputEvents(el);
    expect(seen).toContain('input');
    expect(seen).not.toContain('change');
  });
});

describe('detectKOrientation', () => {
  it('頁面沒有平／陡字樣時回 unknown（真實 APACRS 頁面就是這樣）', () => {
    expect(detectKOrientation(document)).toBe('unknown');
  });

  it('第一組 K 標示為 Flat 時回 flat-first', () => {
    $('MainContent_MeasuredK').closest('tr')!.querySelector('td')!.textContent = 'Flat K';
    $('MainContent_MeasuredK0').closest('tr')!.querySelector('td')!.textContent = 'Steep K';
    expect(detectKOrientation(document)).toBe('flat-first');
  });

  it('第一組 K 標示為 Steep 時回 steep-first（官網對調了）', () => {
    $('MainContent_MeasuredK').closest('tr')!.querySelector('td')!.textContent = 'Steep K';
    $('MainContent_MeasuredK0').closest('tr')!.querySelector('td')!.textContent = 'Flat K';
    expect(detectKOrientation(document)).toBe('steep-first');
  });
});

describe('fillForm', () => {
  it('把數值正確寫進真實 id 的欄位', () => {
    fillForm(sampleValues, document);
    expect($('MainContent_MeasuredK').value).toBe('43.08');
    expect($('MainContent_MeasuredAxis').value).toBe('96');
    expect($('MainContent_MeasuredK0').value).toBe('45.58');
    expect($('MainContent_MeasuredAxis0').value).toBe('6');
    expect($('MainContent_AxLength').value).toBe('24.49');
    expect($('MainContent_OpticalACD').value).toBe('3.15');
    expect($('MainContent_LensThickness').value).toBe('4.99');
    expect($('MainContent_WTW').value).toBe('11.6');
    expect($('MainContent_InducedCyl').value).toBe('0.2');
    expect($('MainContent_IncisionAxis').value).toBe('180');
    expect($('MainContent_Refraction').value).toBe('0');
    expect($('MainContent_DoctorName').value).toBe('中慈 Dr彭');
  });

  it('沒有任何失敗，filled 等於實際要填的欄位數', () => {
    const report = fillForm(sampleValues, document);
    expect(report.failures).toEqual([]);
    expect(report.filled).toBe(report.total);
  });

  it('絕不觸發 Calculate 或 Reset', () => {
    let clicked = '';
    document.querySelector('#MainContent_Button1')!.addEventListener('click', () => { clicked = 'calc'; });
    document.querySelector('#MainContent_btnReset')!.addEventListener('click', () => { clicked = 'reset'; });
    fillForm(sampleValues, document);
    expect(clicked).toBe('');
  });

  it('絕不改動 ASP.NET 的 __VIEWSTATE / __EVENTVALIDATION', () => {
    fillForm(sampleValues, document);
    expect($('__VIEWSTATE').value).toBe('原始狀態');
    expect($('__EVENTVALIDATION').value).toBe('原始驗證');
  });

  it('絕不寫入唯讀的 Net Corneal Astig', () => {
    fillForm(sampleValues, document);
    expect($('MainContent_NetCornealAstig').value).toBe('');
  });

  it('不碰 A Constant 與 Lens Factor（客戶決定由醫師自選）', () => {
    fillForm(sampleValues, document);
    expect($('MainContent_Aconstant').value).toBe('');
    expect($('MainContent_LensFactor').value).toBe('');
  });

  it('病患姓名與病歷號是空字串時完全不碰那兩個欄位，也不算失敗', () => {
    $('MainContent_PatientName').value = '原本就有的字';
    const report = fillForm(sampleValues, document);
    expect($('MainContent_PatientName').value).toBe('原本就有的字');
    expect(report.failures.some((f) => f.field === 'patientName')).toBe(false);
  });

  it('LT／WTW 為 null 時留空不寫，且不算失敗（官網選填欄位）', () => {
    const report = fillForm({ ...sampleValues, lt: null, wtw: null }, document);
    expect($('MainContent_LensThickness').value).toBe('');
    expect($('MainContent_WTW').value).toBe('');
    expect(report.failures.some((f) => f.field === 'lt' || f.field === 'wtw')).toBe(false);
  });

  it('欄位不存在時記錄失敗而非拋錯', () => {
    $('MainContent_OpticalACD').remove();
    document.querySelectorAll('td').forEach((td) => {
      if (td.textContent?.includes('ACD') === true) td.textContent = '';
    });
    const report = fillForm(sampleValues, document);
    expect(report.failures.some((f) => f.field === 'acd')).toBe(true);
    expect(report.filled).toBeLessThan(report.total);
  });

  it('頁面顯示第一組 K 是 Steep 時，拒填四個 K 欄位而不是填反', () => {
    $('MainContent_MeasuredK').closest('tr')!.querySelector('td')!.textContent = 'Steep K';
    $('MainContent_MeasuredK0').closest('tr')!.querySelector('td')!.textContent = 'Flat K';
    const report = fillForm(sampleValues, document);
    expect($('MainContent_MeasuredK').value).toBe('');
    expect($('MainContent_MeasuredK0').value).toBe('');
    expect(report.kOrientation).toBe('steep-first');
    expect(report.failures.filter((f) => f.field.includes('K') || f.field.includes('Axis')).length).toBeGreaterThan(0);
    expect(report.failures.some((f) => f.reason?.includes('平') === true)).toBe(true);
  });

  it('頁面標示與預設一致時照常填入', () => {
    $('MainContent_MeasuredK').closest('tr')!.querySelector('td')!.textContent = 'Flat K';
    $('MainContent_MeasuredK0').closest('tr')!.querySelector('td')!.textContent = 'Steep K';
    const report = fillForm(sampleValues, document);
    expect($('MainContent_MeasuredK').value).toBe('43.08');
    expect(report.kOrientation).toBe('flat-first');
  });
});
