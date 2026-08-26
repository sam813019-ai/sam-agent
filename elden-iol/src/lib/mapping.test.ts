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

const profile = { ...DEFAULT_PROFILE, surgeonName: '中慈 Dr彭', defaultSIA: 0.2, defaultSIAAxis: 135 };

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
      aConstant: 119.39,
      lensFactor: 2.09,
      sia: 0.2,
      siaAxis: 135,
      targetRefraction: 0,
    });
  });

  it('沒有任何阻斷問題', () => {
    expect(mapToFormValues(sampleEye(), profile).blockers).toEqual([]);
  });

  it('記錄 A Constant 從報告單值換成散光片值的替換說明', () => {
    const { substitutions } = mapToFormValues(sampleEye(), profile);
    const aConst = substitutions.find((s) => s.field === 'aConstant')!;
    expect(aConst.from).toBe('119.3');
    expect(aConst.to).toBe('119.39');
    expect(aConst.reason).toContain('DIU');
  });

  it('記錄 Lens Factor 從非散光片換成散光片值的替換說明', () => {
    const { substitutions } = mapToFormValues(sampleEye(), profile);
    const lf = substitutions.find((s) => s.field === 'lensFactor');
    expect(lf).toBeDefined();
    expect(lf!.to).toBe('2.09');
  });

  it('報告單常數讀不到時，仍記錄 A Constant 替換說明（不留追溯空白）', () => {
    const eye = sampleEye();
    eye.aConstant = num(null);
    const { substitutions, values } = mapToFormValues(eye, profile);
    const aConst = substitutions.find((s) => s.field === 'aConstant');
    expect(aConst).toBeDefined();
    expect(aConst!.from).toBe('(未讀到)');
    expect(aConst!.to).toBe('119.39');
    expect(values.aConstant).toBe(119.39);
  });

  it('記錄 SIA 來自設定檔而非報告單', () => {
    const { substitutions } = mapToFormValues(sampleEye(), profile);
    expect(substitutions.some((s) => s.field === 'sia')).toBe(true);
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

  it('設定為 TK 但報告單沒有 TK 值時，回報阻斷而不靜默改用 K', () => {
    const eye = sampleEye();
    eye.tk1 = num(null); eye.tk2 = num(null);
    const { blockers } = mapToFormValues(eye, { ...profile, keratometrySource: 'TK' });
    expect(blockers.some((b) => b.includes('TK'))).toBe(true);
  });
});

describe('mapToFormValues — 阻斷情境', () => {
  it('沒有資料的眼睛回報阻斷', () => {
    const eye = { ...sampleEye(), hasData: false, status: 'Pseudophakic' as const };
    expect(mapToFormValues(eye, profile).blockers.length).toBeGreaterThan(0);
  });

  it('AL 缺失時回報阻斷', () => {
    const eye = sampleEye();
    eye.al = num(null);
    expect(mapToFormValues(eye, profile).blockers.some((b) => b.includes('AL'))).toBe(true);
  });

  it('鏡片型號認不出來時回報阻斷，並且不亂猜常數', () => {
    const eye = sampleEye();
    eye.lensModel = text('某個沒見過的鏡片');
    const { blockers } = mapToFormValues(eye, profile);
    expect(blockers.some((b) => b.includes('鏡片'))).toBe(true);
  });

  it('鏡片型號完全讀不到時回報阻斷，不得靜默套用預設常數', () => {
    const eye = sampleEye();
    eye.lensModel = text(null);
    const { blockers, values } = mapToFormValues(eye, profile);
    expect(blockers.length).toBeGreaterThan(0);
    expect(blockers.some((b) => b.includes('鏡片'))).toBe(true);
    expect(values.aConstant).toBe(119.39); // 仍帶入預設值供參考，但 blocker 會擋住填入
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
