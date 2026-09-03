export interface Region {
  /** 全部為相對比例 0–1，以便對任何解析度的照片都適用 */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * ⚠️ 這裡刻意不提供「預設遮蔽座標」。
 *
 * 2026-08-31 以 7 張真實照片實測：病歷號與生日出現在頁面 25–28% 處、
 * 姓名有時是手寫的、照片本身還有傾斜與裁切 —— 同一台機器的報告，
 * 個資在畫面上的位置每張都不同。固定座標會遮在空白處，
 * 卻讓使用者以為已經遮好了。那比不遮更危險。
 *
 * 遮罩一律由使用者在 MaskEditor 上框選，並可用 mask-presets 記住位置重複套用。
 */

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
