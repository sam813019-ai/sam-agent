import { after } from 'next/server';
import { verifySignature, replyMessage, pushToAdmin } from '@/lib/line';
import { getHistory, appendMessages } from '@/lib/redis';
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
          replyMessage(replyToken, reply),
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
          await pushToAdmin(summary);
        }
      } catch (err) {
        console.error('[webhook] Error:', err);
      }
    }
  });

  return new Response('OK', { status: 200 });
}
