import { describe, it, expect } from 'vitest';
import { redactImage, canvasToBase64Jpeg, IOLMASTER_PII_REGIONS } from './redact';

function whiteCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  return c;
}

function pixelAt(c: HTMLCanvasElement, x: number, y: number): [number, number, number] {
  const d = c.getContext('2d')!.getImageData(x, y, 1, 1).data;
  return [d[0]!, d[1]!, d[2]!];
}

describe('redactImage', () => {
  it('把指定區塊塗黑', () => {
    const src = whiteCanvas(100, 100);
    const out = redactImage(src, 100, 100, [{ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }]);
    expect(pixelAt(out, 15, 15)).toEqual([0, 0, 0]);
  });

  it('區塊以外的像素保持原樣', () => {
    const src = whiteCanvas(100, 100);
    const out = redactImage(src, 100, 100, [{ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }]);
    expect(pixelAt(out, 90, 90)).toEqual([255, 255, 255]);
  });

  it('沒有指定區塊時原圖不變', () => {
    const src = whiteCanvas(50, 50);
    const out = redactImage(src, 50, 50, []);
    expect(pixelAt(out, 25, 25)).toEqual([255, 255, 255]);
  });

  it('輸出尺寸與輸入一致', () => {
    const out = redactImage(whiteCanvas(120, 80), 120, 80, IOLMASTER_PII_REGIONS);
    expect(out.width).toBe(120);
    expect(out.height).toBe(80);
  });
});

describe('IOLMASTER_PII_REGIONS', () => {
  it('至少定義一個遮蔽區塊', () => {
    expect(IOLMASTER_PII_REGIONS.length).toBeGreaterThan(0);
  });

  it('所有區塊座標都在 0–1 範圍內', () => {
    for (const r of IOLMASTER_PII_REGIONS) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(1);
      expect(r.y + r.h).toBeLessThanOrEqual(1);
    }
  });
});

describe('canvasToBase64Jpeg', () => {
  it('回傳不含 data URI 前綴的字串', () => {
    const b64 = canvasToBase64Jpeg(whiteCanvas(10, 10));
    expect(b64.startsWith('data:')).toBe(false);
    expect(b64.length).toBeGreaterThan(0);
  });
});
