import { describe, it, expect } from 'vitest';
import { rectFromDrag, MIN_DRAG_PX } from './mask-geometry';

// 畫布顯示尺寸 200x100，座標以顯示座標傳入，輸出一律是 0–1 的相對比例
const box = { width: 200, height: 100 };

describe('rectFromDrag', () => {
  it('由左上往右下拖曳', () => {
    expect(rectFromDrag({ x: 20, y: 10 }, { x: 60, y: 40 }, box)).toEqual({
      x: 0.1, y: 0.1, w: 0.2, h: 0.3,
    });
  });

  it('由右下往左上反向拖曳，結果相同', () => {
    expect(rectFromDrag({ x: 60, y: 40 }, { x: 20, y: 10 }, box)).toEqual({
      x: 0.1, y: 0.1, w: 0.2, h: 0.3,
    });
  });

  it('拖出畫布外時裁切回邊界，不產生負座標或超過 1 的範圍', () => {
    const r = rectFromDrag({ x: -50, y: -30 }, { x: 400, y: 250 }, box)!;
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.x + r.w).toBeCloseTo(1, 5);
    expect(r.y + r.h).toBeCloseTo(1, 5);
  });

  it('太小的拖曳視為誤觸，回 null 而不是產生一個看不見的框', () => {
    expect(rectFromDrag({ x: 20, y: 10 }, { x: 20 + MIN_DRAG_PX - 1, y: 12 }, box)).toBeNull();
  });

  it('座標為 NaN 時回 null —— NaN 的比較永遠是 false，會穿過所有大小守衛', () => {
    expect(rectFromDrag({ x: NaN, y: NaN }, { x: 60, y: 40 }, box)).toBeNull();
    expect(rectFromDrag({ x: 20, y: 10 }, { x: NaN, y: 40 }, box)).toBeNull();
    expect(rectFromDrag({ x: 20, y: 10 }, { x: 60, y: 40 }, { width: NaN, height: 100 })).toBeNull();
  });

  it('畫布尺寸為 0 時回 null，不做除以零的運算', () => {
    expect(rectFromDrag({ x: 0, y: 0 }, { x: 50, y: 50 }, { width: 0, height: 0 })).toBeNull();
  });
});
