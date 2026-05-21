import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const HANDOFF = '[HANDOFF]';

function systemPrompt(knowledge: string, keywords: string[]): string {
  return `你是 HEIWEI SPA 的專業客服助理，名字是小薇。

【品牌介紹】
HEIWEI 何謂美是一個專注台灣市場的保養品牌，旗下設有實體 SPA 美容院與線上通路。產品針對台灣氣候與敏弱肌調配，秉持「少即是多」的極簡保養哲學。

【知識庫】
${knowledge}

【需要轉交專員的情境】
${keywords.join('、')}

【回覆規則】
1. 使用繁體中文，語氣親切專業，帶有溫度
2. 回覆簡潔，不超過 150 字
3. 不捏造知識庫以外的資訊；若問題超出範圍，誠實說明
4. 當對話觸及上方任一轉交情境，或連續 2 次無法回答時，回覆：「感謝您的詢問！我們的專員將盡快與您聯繫，請稍候 ☺️」，並在回覆末尾加上 ${HANDOFF}`;
}

export type ChatResult = { reply: string; shouldHandoff: boolean };

export async function chat(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  knowledge: string,
  handoffKeywords: string[],
): Promise<ChatResult> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt(knowledge, handoffKeywords),
    messages: [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  return {
    reply: raw.replace(HANDOFF, '').trim(),
    shouldHandoff: raw.includes(HANDOFF),
  };
}
