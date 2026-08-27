import { RecognitionResultSchema, type RecognitionResult } from '../lib/schema';
import { redactImage, canvasToBase64Jpeg, IOLMASTER_PII_REGIONS } from '../lib/redact';

/** 尚未部署；Task 12 上線前需確認此網址與 manifest 的 host_permissions 一致 */
export const RECOGNIZE_ENDPOINT = 'https://elden-iol.vercel.app/api/recognize';

export async function recognizeImage(file: File): Promise<RecognitionResult> {
  const bitmap = await createImageBitmap(file);
  // 個資在本機遮蔽後才離開這台電腦；送出的是重繪後的畫布，不含原檔位元組與檔名
  const canvas = redactImage(bitmap, bitmap.width, bitmap.height, IOLMASTER_PII_REGIONS);
  const imageBase64 = canvasToBase64Jpeg(canvas);

  const response = await fetch(RECOGNIZE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
