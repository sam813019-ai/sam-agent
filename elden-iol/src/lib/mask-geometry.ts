import type { Region } from './redact';

/** 小於這個像素距離的拖曳視為誤觸（點一下、手抖），不建立遮罩 */
export const MIN_DRAG_PX = 8;

export interface Point { x: number; y: number }
export interface Box { width: number; height: number }

/**
 * 把畫面上的一次拖曳換算成 0–1 的相對區塊。
 * 用相對比例是因為顯示尺寸與原圖尺寸不同，而遮罩最終要套在原圖上。
 */
export function rectFromDrag(start: Point, end: Point, box: Box): Region | null {
  // NaN 會讓底下每個 < 比較都變成 false，安靜地穿過所有守衛，
  // 產生一個座標為 NaN 的遮罩 —— 畫不出來，卻讓使用者以為遮好了。
  const coords = [start.x, start.y, end.x, end.y, box.width, box.height];
  if (coords.some((n) => !Number.isFinite(n))) return null;

  if (box.width <= 0 || box.height <= 0) return null;

  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);

  if (right - left < MIN_DRAG_PX && bottom - top < MIN_DRAG_PX) return null;

  const clampedLeft = Math.max(0, left);
  const clampedTop = Math.max(0, top);
  const clampedRight = Math.min(box.width, right);
  const clampedBottom = Math.min(box.height, bottom);

  return {
    x: clampedLeft / box.width,
    y: clampedTop / box.height,
    w: (clampedRight - clampedLeft) / box.width,
    h: (clampedBottom - clampedTop) / box.height,
  };
}
