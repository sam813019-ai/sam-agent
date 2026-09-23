import { messagingApi, validateSignature } from '@line/bot-sdk';

export const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

export function verifySignature(body: string, signature: string): boolean {
  return validateSignature(body, process.env.LINE_CHANNEL_SECRET!, signature);
}

export async function replyMessage(replyToken: string, text: string): Promise<void> {
  await client.replyMessage({
    replyToken,
    messages: [{ type: 'text', text }],
  });
}

export async function replyWithHandoffOption(replyToken: string, text: string): Promise<void> {
  await client.replyMessage({
    replyToken,
    messages: [
      {
        type: 'text',
        text,
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'message',
                label: '請專人協助',
                text: '請專人協助',
              },
            },
            {
              type: 'action',
              action: {
                type: 'message',
                label: '不用，謝謝',
                text: '不用，謝謝',
              },
            },
          ],
        },
      },
    ],
  });
}

export async function replyImage(replyToken: string, imageUrl: string, caption?: string, imageUrl2?: string, imageUrl3?: string): Promise<void> {
  const messages: messagingApi.Message[] = [];
  if (caption) messages.push({ type: 'text', text: caption });
  messages.push({ type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl });
  if (imageUrl2) messages.push({ type: 'image', originalContentUrl: imageUrl2, previewImageUrl: imageUrl2 });
  if (imageUrl3) messages.push({ type: 'image', originalContentUrl: imageUrl3, previewImageUrl: imageUrl3 });
  await client.replyMessage({ replyToken, messages });
}

export async function pushToAdmin(summary: string): Promise<void> {
  const adminId = process.env.ADMIN_LINE_USER_ID;
  if (!adminId) return;
  await client.pushMessage({
    to: adminId,
    messages: [{ type: 'text', text: `🔔 需要人工接手\n\n${summary}` }],
  });
}
