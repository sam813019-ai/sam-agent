import { RecognitionResultSchema, type RecognitionResult } from '../lib/schema';
import { redactImage, canvasToBase64Jpeg, type Region } from '../lib/redact';

export const RECOGNIZE_ENDPOINT = 'https://elden-iol.vercel.app/api/recognize';

/**
 * 端點的存取權杖，建置時由 VITE_ELDEN_ACCESS_TOKEN 注入。
 * 它擋的是網路上隨機掃描的人，不是擋診所使用者 —— 裝了擴充功能的人本來就讀得到它。
 * 目的只有一個：別讓陌生人花我們的辨識額度。
 */
const ACCESS_TOKEN: string = import.meta.env.VITE_ELDEN_ACCESS_TOKEN ?? '';

/**
 * regions 是使用者在送出前親自框選的遮蔽區塊。
 * 這裡不提供預設值 —— 沒框就是沒遮，由 UI 負責讓使用者知道這件事。
 */
export async function recognizeImage(file: File, regions: Region[]): Promise<RecognitionResult> {
  const bitmap = await createImageBitmap(file);
  // 個資在本機遮蔽後才離開這台電腦；送出的是重繪後的畫布，不含原檔位元組與檔名
  const canvas = redactImage(bitmap, bitmap.width, bitmap.height, regions);
  const imageBase64 = canvasToBase64Jpeg(canvas);

  const response = await fetch(RECOGNIZE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-elden-token': ACCESS_TOKEN },
    body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg' }),
  });

  const payload: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : '辨識失敗，請重試';
    throw new Error(message);
  }

  return RecognitionResultSchema.parse(payload);
}
