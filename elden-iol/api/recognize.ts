import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { RecognitionResultSchema } from '../src/lib/schema';
import { buildExtractionPrompt } from './prompt';

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * 延遲建立：模組載入時就 new Anthropic() 會在沒有金鑰（或在瀏覽器環境）時直接拋錯，
 * 讓不需要金鑰的輸入驗證測試連 import 都做不到。實際請求進來時才建，並重複使用。
 */
let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export async function POST(request: Request): Promise<Response> {
  let payload: { imageBase64?: unknown; mediaType?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: '請求內容不是合法的 JSON' }, 400);
  }

  const { imageBase64, mediaType } = payload;

  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
    return json({ error: '缺少 imageBase64' }, 400);
  }
  if (typeof mediaType !== 'string' || !ALLOWED_MEDIA_TYPES.includes(mediaType as never)) {
    return json({ error: `mediaType 必須是 ${ALLOWED_MEDIA_TYPES.join(' / ')}` }, 400);
  }
  if (imageBase64.length * 0.75 > MAX_IMAGE_BYTES) {
    return json({ error: '圖片過大，請壓縮後再上傳（上限 8 MB）' }, 413);
  }

  try {
    // 註：沒有帶 server-side fallbacks（拒絕時自動改用備援模型）。
    // fallbacks 只存在於 client.beta.messages.create，而結構化輸出的 messages.parse
    // 在非 beta 路徑上，兩者無法併用。這裡結構化輸出的正確性優先，
    // 拒絕情境改以下方 stop_reason === 'refusal' 回 422 由使用者處理。
    const response = await getClient().messages.parse({
      model: 'claude-opus-5',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { format: zodOutputFormat(RecognitionResultSchema) },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: imageBase64 },
            },
            { type: 'text', text: buildExtractionPrompt() },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return json({ error: '模型拒絕處理這張圖片，請確認上傳的是報告單' }, 422);
    }
    if (response.parsed_output === null) {
      return json({ error: '辨識結果無法解析，請重試或改用清晰一點的照片' }, 502);
    }

    return json(response.parsed_output, 200);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return json({ error: '辨識服務忙碌中，請稍後再試' }, 429);
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return json({ error: '無法連線到辨識服務，請檢查網路' }, 503);
    }
    return json({ error: '辨識失敗，請重試' }, 500);
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
