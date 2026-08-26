import { describe, it, expect } from 'vitest';
import { RecognitionResultSchema } from './schema';

const sample = {
  device: 'IOLMaster700',
  reportDate: '2026-07-17',
  warnings: ['OD: Axial length measurements slightly inconsistent. Please check fixation.'],
  overallConfidence: 0.94,
  eyes: [
    {
      laterality: 'OD',
      status: 'Phakic',
      hasData: true,
      al:  { value: 24.49, confidence: 0.97, borderline: true,  rawText: '24.49 mm (!)' },
      acd: { value: 3.15,  confidence: 0.98, borderline: false, rawText: '3.15 mm' },
      lt:  { value: 4.99,  confidence: 0.96, borderline: false, rawText: '4.99 mm' },
      wtw: { value: 11.6,  confidence: 0.93, borderline: true,  rawText: '11.6 mm (!)' },
      k1:     { value: 43.08, confidence: 0.97, borderline: false, rawText: '43.08 D' },
      k1Axis: { value: 96,    confidence: 0.97, borderline: false, rawText: '96°' },
      k2:     { value: 45.58, confidence: 0.97, borderline: false, rawText: '45.58 D' },
      k2Axis: { value: 6,     confidence: 0.97, borderline: false, rawText: '6°' },
      tk1:     { value: 43.0,  confidence: 0.95, borderline: false, rawText: '43.00 D' },
      tk1Axis: { value: 95,    confidence: 0.95, borderline: false, rawText: '95°' },
      tk2:     { value: 45.53, confidence: 0.95, borderline: false, rawText: '45.53 D' },
      tk2Axis: { value: 5,     confidence: 0.95, borderline: false, rawText: '5°' },
      targetRefraction: { value: 0, confidence: 0.99, borderline: false, rawText: '+0.00 D' },
      lensModel:  { value: 'AMO Tecnic 1 ZCB00-1', confidence: 0.9, borderline: false, rawText: 'AMO Tecnic 1 ZCB00-1' },
      aConstant:  { value: 119.3, confidence: 0.96, borderline: false, rawText: 'A const.: 119.30' },
    },
  ],
};

describe('RecognitionResultSchema', () => {
  it('接受樣本報告單的辨識結果', () => {
    const parsed = RecognitionResultSchema.parse(sample);
    expect(parsed.eyes[0]!.al.value).toBe(24.49);
    expect(parsed.warnings).toHaveLength(1);
  });

  it('缺少 warnings 欄位時拒絕（警告是必要欄位，不得省略）', () => {
    const { warnings, ...withoutWarnings } = sample;
    expect(() => RecognitionResultSchema.parse(withoutWarnings)).toThrow();
  });

  it('信心值超出 0–1 範圍時拒絕', () => {
    const bad = structuredClone(sample);
    bad.eyes[0]!.al.confidence = 1.5;
    expect(() => RecognitionResultSchema.parse(bad)).toThrow();
  });

  it('未測量的欄位允許 value 為 null', () => {
    const bad = structuredClone(sample);
    bad.eyes[0]!.tk1.value = null as unknown as number;
    expect(() => RecognitionResultSchema.parse(bad)).not.toThrow();
  });
});
