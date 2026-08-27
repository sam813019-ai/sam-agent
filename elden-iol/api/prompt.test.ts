// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildExtractionPrompt } from './prompt';

describe('buildExtractionPrompt', () => {
  const prompt = buildExtractionPrompt();

  it('要求同時抓取警告訊息，而不只是數字', () => {
    expect(prompt).toContain('warnings');
    expect(prompt).toMatch(/警告|warning/i);
  });

  it('明確說明 (!) 標記代表 borderline', () => {
    expect(prompt).toContain('(!)');
    expect(prompt).toContain('borderline');
  });

  it('說明 Pseudophakic 眼可能整欄為 ---', () => {
    expect(prompt).toContain('Pseudophakic');
    expect(prompt).toContain('---');
  });

  it('要求逐欄回報信心值與原始文字', () => {
    expect(prompt).toContain('confidence');
    expect(prompt).toContain('rawText');
  });

  it('明確禁止猜測看不清楚的數值', () => {
    expect(prompt).toMatch(/不要猜|勿猜|null/);
  });
});

describe('buildExtractionPrompt — 客戶實際使用情境（2026-08-27）', () => {
  const prompt = buildExtractionPrompt();

  it('說明來源是手機翻拍照，會有反光、傾斜、裁切', () => {
    expect(prompt).toMatch(/翻拍|拍攝/);
    expect(prompt).toMatch(/反光/);
    expect(prompt).toMatch(/傾斜|變形/);
  });

  it('要求被反光或裁切遮住的欄位一律 null，不得由旁邊的數字推補', () => {
    expect(prompt).toMatch(/遮住|看不到|被裁掉/);
    expect(prompt).toMatch(/不要推算|不得推補|不要補/);
  });

  it('說明可能不是 IOLMaster 700，要依標籤語意抓取而非固定位置', () => {
    expect(prompt).toMatch(/其他機型|其他儀器|不同機型/);
    expect(prompt).toMatch(/標籤/);
    expect(prompt).toMatch(/位置/);
  });

  it('要求把機器型號逐字記錄到 deviceRawText', () => {
    expect(prompt).toContain('deviceRawText');
  });

  it('明確要求不要抽取病患姓名與病歷號', () => {
    expect(prompt).toMatch(/姓名/);
    expect(prompt).toMatch(/病歷號|病歷編號/);
  });
});
