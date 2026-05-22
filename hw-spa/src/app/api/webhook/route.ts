import { after } from 'next/server';
import { verifySignature, replyMessage, replyWithHandoffOption, pushToAdmin } from '@/lib/line';
import { getHistory, appendMessages, isHandoff, setHandoff } from '@/lib/redis';
import { getKnowledgeBase, formatKnowledgeForPrompt, getHandoffKeywords } from '@/lib/sheets';
import { chat } from '@/lib/claude';
import type { webhook } from '@line/bot-sdk';
type WebhookEvent = webhook.Event;

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-line-signature') ?? '';

  if (!verifySignature(body, signature)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { events } = JSON.parse(body) as { events: WebhookEvent[] };

  after(async () => {
    for (const event of events) {
      if (event.type !== 'message' || event.message.type !== 'text') continue;

      const userId = event.source?.userId ?? 'unknown';
      const userText = (event as webhook.MessageEvent).message.type === 'text'
        ? ((event as webhook.MessageEvent).message as webhook.TextMessageContent).text
        : '';
      if (!userText) continue;
      const replyToken = (event as webhook.MessageEvent).replyToken ?? '';
      if (!replyToken) continue;

      try {
        // 人工接管中 → AI 靜音，不回覆
        if (await isHandoff(userId)) continue;

        // 客人主動點「請專人協助」按鈕
        if (userText === '請專人協助') {
          const history = await getHistory(userId);
          const summary = history
            .slice(-6)
            .map(m => `${m.role === 'user' ? '顧客' : '小薇'}：${m.content}`)
            .join('\n');
          await Promise.all([
            replyMessage(replyToken, '好的！我們的專人會盡快回覆您，請稍候 😊'),
            setHandoff(userId),
            pushToAdmin(`🙋 顧客主動請求專人協助\n\n${summary}`),
          ]);
          continue;
        }

        // 客人點「不用，謝謝」
        if (userText === '不用，謝謝') {
          await replyMessage(replyToken, '好的！有任何問題隨時告訴我 😊');
          continue;
        }

        const [history, kb] = await Promise.all([
          getHistory(userId),
          getKnowledgeBase(),
        ]);

        const { reply, shouldHandoff } = await chat(
          userText,
          history,
          formatKnowledgeForPrompt(kb),
          getHandoffKeywords(kb),
        );

        await Promise.all([
          replyWithHandoffOption(replyToken, reply),
          appendMessages(userId, [
            { role: 'user', content: userText },
            { role: 'assistant', content: reply },
          ]),
        ]);

        if (shouldHandoff) {
          const recent = [
            ...history,
            { role: 'user' as const, content: userText },
            { role: 'assistant' as const, content: reply },
          ];
          const summary = recent
            .slice(-6)
            .map(m => `${m.role === 'user' ? '顧客' : '小薇'}：${m.content}`)
            .join('\n');
          await Promise.all([
            pushToAdmin(summary),
            setHandoff(userId),
          ]);
        }
      } catch (err) {
        console.error('[webhook] Error:', err);
        try { await replyMessage(replyToken, '抱歉，目前系統忙碌中，請稍後再傳訊息，我們會盡快回覆您 🙏'); } catch {}
      }
    }
  });

  return new Response('OK', { status: 200 });
}
