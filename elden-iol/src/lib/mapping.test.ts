import { describe, it, expect } from 'vitest';
import { mapToFormValues } from './mapping';
import { DEFAULT_PROFILE } from './profile';
import type { EyeData, NumericMeasurement, TextMeasurement } from './schema';

const num = (value: number | null, borderline = false): NumericMeasurement =>
  ({ value, confidence: 0.97, borderline, rawText: String(value ?? '---') });
const text = (value: string | null): TextMeasurement =>
  ({ value, confidence: 0.9, borderline: false, rawText: value ?? '---' });

/** 樣本報告單的右眼資料 */
const sampleEye = (): EyeData => ({
  laterality: 'OD',
  status: 'Phakic',
  hasData: true,
  al: num(24.49, true),
  acd: num(3.15),
  lt: num(4.99),
  wtw: num(11.6, true),
  k1: num(43.08), k1Axis: num(96),
  k2: num(45.58), k2Axis: num(6),
  tk1: num(43.0), tk1Axis: num(95),
  tk2: num(45.53), tk2Axis: num(5),
  targetRefraction: num(0),
  lensModel: text('AMO Tecnic 1 ZCB00-1'),
  aConstant: num(119.3),
});

const profile = { ...DEFAULT_PROFILE, surgeonName: '中慈 Dr彭', defaultSIA: 0.2, defaultSIAAxis: 180 };

describe('mapToFormValues — 樣本報告單', () => {
  it('產出與 barrett_toric_result_sample.jpg 完全一致的輸入值', () => {
    const { values } = mapToFormValues(sampleEye(), profile);
    expect(values).toEqual({
      patientName: '',
      patientId: '',
      surgeonName: '中慈 Dr彭',
      flatK: 43.08,
      flatKAxis: 96,
      steepK: 45.58,
      steepKAxis: 6,
      al: 24.49,
      acd: 3.15,
      lt: 4.99,
      wtw: 11.6,
      sia: 0.2,
      siaAxis: 180,
      targetRefraction: 0,
    });
  });

  it('沒有任何阻斷問題', () => {
    expect(mapToFormValues(sampleEye(), profile).blockers).toEqual([]);
  });

  it('記錄 SIA 來自設定檔而非報告單', () => {
    const { substitutions } = mapToFormValues(sampleEye(), profile);
    expect(substitutions.some((s) => s.field === 'sia')).toBe(true);
  });
});

describe('mapToFormValues — 鏡片常數不代填（2026-08-27 客戶決定：由醫師在官網自選 IOL Model）', () => {
  it('FormValues 不含 aConstant 與 lensFactor', () => {
    const { values } = mapToFormValues(sampleEye(), profile);
    expect(values).not.toHaveProperty('aConstant');
    expect(values).not.toHaveProperty('lensFactor');
  });

  it('不產生任何鏡片常數的替換記錄', () => {
    const { substitutions } = mapToFormValues(sampleEye(), profile);
    expect(substitutions.some((s) => String(s.field) === 'aConstant')).toBe(false);
    expect(substitutions.some((s) => String(s.field) === 'lensFactor')).toBe(false);
  });

  it('認不出鏡片型號時不再阻斷代填（常數本來就不填）', () => {
    const eye = sampleEye();
    eye.lensModel = text('某個沒見過的鏡片');
    const { blockers } = mapToFormValues(eye, profile);
    expect(blockers.some((b) => b.includes('鏡片'))).toBe(false);
  });

  it('完全讀不到鏡片型號時也不阻斷', () => {
    const eye = sampleEye();
    eye.lensModel = text(null);
    eye.aConstant = num(null);
    const { blockers } = mapToFormValues(eye, profile);
    expect(blockers).toEqual([]);
  });
});

describe('mapToFormValues — LT / WTW（客戶指定需帶入，官網為選填欄位）', () => {
  it('讀到時直接帶入', () => {
    const { values } = mapToFormValues(sampleEye(), profile);
    expect(values.lt).toBe(4.99);
    expect(values.wtw).toBe(11.6);
  });

  it('讀不到時為 null 代表留空，絕不寫入 0（0 落在官網合法範圍外）', () => {
    const eye = sampleEye();
    eye.lt = num(null);
    eye.wtw = num(null);
    const { values } = mapToFormValues(eye, profile);
    expect(values.lt).toBeNull();
    expect(values.wtw).toBeNull();
  });

  it('讀不到時記錄留空說明，且不視為阻斷（選填欄位）', () => {
    const eye = sampleEye();
    eye.lt = num(null);
    eye.wtw = num(null);
    const { substitutions, blockers } = mapToFormValues(eye, profile);
    expect(substitutions.some((s) => s.field === 'lt')).toBe(true);
    expect(substitutions.some((s) => s.field === 'wtw')).toBe(true);
    expect(blockers).toEqual([]);
  });
});

describe('mapToFormValues — flat/steep 判定', () => {
  it('依數值大小判定平陡，不信任 K1/K2 的編號順序', () => {
    const eye = sampleEye();
    // 故意顛倒：K1 放陡的、K2 放平的
    eye.k1 = num(45.58); eye.k1Axis = num(6);
    eye.k2 = num(43.08); eye.k2Axis = num(96);
    const { values } = mapToFormValues(eye, profile);
    expect(values.flatK).toBe(43.08);
    expect(values.flatKAxis).toBe(96);
    expect(values.steepK).toBe(45.58);
    expect(values.steepKAxis).toBe(6);
  });
});

describe('mapToFormValues — K / TK 來源切換', () => {
  it('設定為 TK 時改用 TK1/TK2', () => {
    const { values } = mapToFormValues(sampleEye(), { ...profile, keratometrySource: 'TK' });
    expect(values.flatK).toBe(43.0);
    expect(values.flatKAxis).toBe(95);
    expect(values.steepK).toBe(45.53);
    expect(values.steepKAxis).toBe(5);
  });

});

describe('mapToFormValues — 阻斷情境', () => {
  it('沒有資料的眼睛回報阻斷（整隻眼都不能填）', () => {
    const eye = { ...sampleEye(), hasData: false, status: 'Pseudophakic' as const };
    expect(mapToFormValues(eye, profile).blockers.length).toBeGreaterThan(0);
  });
});

// 客戶 2026-09-01：「判別如果有疑慮，請他空下來，我手動填」
// 讀不到的欄位留白就好，不該連帶擋掉其他讀得到的欄位。
describe('mapToFormValues — 讀不到的欄位留白，不擋其他欄位', () => {
  it('AL 讀不到時該欄為 null，其他欄位照樣帶入，且不阻斷', () => {
    const eye = sampleEye();
    eye.al = num(null);
    const { values, blockers, substitutions } = mapToFormValues(eye, profile);
    expect(values.al).toBeNull();
    expect(values.acd).toBe(3.15);
    expect(values.flatK).toBe(43.08);
    expect(blockers).toEqual([]);
    expect(substitutions.some((s) => s.field === 'al' && s.to === '(留空)')).toBe(true);
  });

  it('ACD 讀不到時同樣只留白該欄', () => {
    const eye = sampleEye();
    eye.acd = num(null);
    const { values, blockers } = mapToFormValues(eye, profile);
    expect(values.acd).toBeNull();
    expect(values.al).toBe(24.49);
    expect(blockers).toEqual([]);
  });

  it('K 值缺一邊時，四個 K 欄位全部留白 —— 分不出平陡就不能只填一半', () => {
    const eye = sampleEye();
    eye.k2 = num(null);
    const { values, blockers, substitutions } = mapToFormValues(eye, profile);
    expect(values.flatK).toBeNull();
    expect(values.flatKAxis).toBeNull();
    expect(values.steepK).toBeNull();
    expect(values.steepKAxis).toBeNull();
    expect(values.al).toBe(24.49);
    expect(blockers).toEqual([]);
    expect(substitutions.some((s) => s.field === 'flatK' && s.reason.includes('平'))).toBe(true);
  });

  it('軸位缺失時，度數也一起留白 —— 有度數沒軸位的散光是錯的', () => {
    const eye = sampleEye();
    eye.k1Axis = num(null);
    const { values, blockers } = mapToFormValues(eye, profile);
    expect(values.flatK).toBeNull();
    expect(values.steepK).toBeNull();
    expect(blockers).toEqual([]);
  });

  it('設定為 TK 但報告單沒有 TK 時，K 欄位留白並說明，不靜默改用 K 也不阻斷', () => {
    const eye = sampleEye();
    eye.tk1 = num(null); eye.tk2 = num(null);
    const { values, blockers, substitutions } = mapToFormValues(eye, { ...profile, keratometrySource: 'TK' });
    expect(values.flatK).toBeNull();
    expect(values.al).toBe(24.49);
    expect(blockers).toEqual([]);
    expect(substitutions.some((s) => s.reason.includes('TK'))).toBe(true);
  });
});

describe('mapToFormValues — 目標屈光度', () => {
  it('讀到目標屈光度時直接帶入', () => {
    const { values } = mapToFormValues(sampleEye(), profile);
    expect(values.targetRefraction).toBe(0);
  });

  it('讀不到目標屈光度時採用平光 0 D 並記錄替換，不視為阻斷', () => {
    const eye = sampleEye();
    eye.targetRefraction = num(null);
    const { values, substitutions, blockers } = mapToFormValues(eye, profile);
    expect(values.targetRefraction).toBe(0);
    expect(substitutions.some((s) => s.field === 'targetRefraction')).toBe(true);
    expect(blockers.some((b) => b.includes('屈光度'))).toBe(false);
  });
});

describe('mapToFormValues — 選項', () => {
  it('K Index 與正負柱鏡取自設定檔（預設值）', () => {
    const { options } = mapToFormValues(sampleEye(), profile);
    expect(options.kIndex).toBe(1.3375);
    expect(options.cylinderConvention).toBe('negative');
  });

  it('選項與 SIA 確實來自設定檔而非寫死', () => {
    const custom = { ...profile, kIndex: 1.332 as const, cylinderConvention: 'positive' as const, defaultSIA: 0.5, defaultSIAAxis: 90 };
    const { values, options } = mapToFormValues(sampleEye(), custom);
    expect(options.kIndex).toBe(1.332);
    expect(options.cylinderConvention).toBe('positive');
    expect(values.sia).toBe(0.5);
    expect(values.siaAxis).toBe(90);
  });
});
