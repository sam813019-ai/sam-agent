export interface Region {
  /** 全部為相對比例 0–1，以便對任何解析度的照片都適用 */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * IOLMaster 700 報告單上含個資的區塊。
 * 報告單本身不印病患姓名，但技術員常在紙上手寫姓名／病歷號，
 * 且頁首頁尾可能有院所浮水印，故連同保守遮蔽。
 * 座標需以真實樣本校準，調整後務必重跑 Task 12 的黃金測試集。
 */
export const IOLMASTER_PII_REGIONS: Region[] = [
  { x: 0, y: 0, w: 1, h: 0.05 },       // 頁首手寫區
  { x: 0, y: 0.95, w: 1, h: 0.05 },    // 頁尾院所資訊
];

export function redactImage(
  source: CanvasImageSource,
  width: number,
  height: number,
  regions: Region[],
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('無法取得 2D canvas context');

  ctx.drawImage(source, 0, 0, width, height);
  ctx.fillStyle = '#000000';
  for (const r of regions) {
    ctx.fillRect(
      Math.round(r.x * width),
      Math.round(r.y * height),
      Math.round(r.w * width),
      Math.round(r.h * height),
    );
  }
  return canvas;
}

export function canvasToBase64Jpeg(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.92).replace(/^data:image\/jpeg;base64,/, '');
}
