import { describe, it, expect } from 'vitest';
import { normalizeLensModel, lookupToricFamily, getFamilyById, TORIC_FAMILIES } from './lens-constants';

describe('normalizeLensModel', () => {
  it('從 OCR 的完整字串抽出型號代碼', () => {
    expect(normalizeLensModel('AMO Tecnic 1 ZCB00-1')).toBe('ZCB00-1');
  });

  it('容忍 OCR 把 Tecnis 讀成 Tecnic 的誤差', () => {
    expect(normalizeLensModel('AMO Tecnis 1 ZCB00')).toBe('ZCB00');
  });

  it('忽略大小寫與多餘空白', () => {
    expect(normalizeLensModel('  amo  tecnis  zcb00-1  ')).toBe('ZCB00-1');
  });

  it('認不出型號時回 null', () => {
    expect(normalizeLensModel('某個不存在的鏡片')).toBeNull();
  });
});

describe('lookupToricFamily', () => {
  it('ZCB00-1 對應到 J&J DIU 散光片系列，常數為 119.39 / 2.09', () => {
    const family = lookupToricFamily('ZCB00-1')!;
    expect(family.id).toBe('JJ_DIU');
    expect(family.aConstant).toBe(119.39);
    expect(family.lensFactor).toBe(2.09);
  });

  it('接受未正規化的原始字串', () => {
    expect(lookupToricFamily('AMO Tecnic 1 ZCB00-1')!.id).toBe('JJ_DIU');
  });

  it('沒有對應時回 null', () => {
    expect(lookupToricFamily('UNKNOWN99')).toBeNull();
  });
});

describe('DIU 系列', () => {
  it('包含樣本用到的 DIU375', () => {
    expect(getFamilyById('JJ_DIU')!.toricPowers).toContain('DIU375');
  });

  it('TORIC_FAMILIES 至少有一個項目供設定畫面選擇', () => {
    expect(TORIC_FAMILIES.length).toBeGreaterThan(0);
  });
});
