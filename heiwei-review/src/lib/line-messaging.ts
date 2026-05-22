const PUSH_URL = 'https://api.line.me/v2/bot/message/push'

export async function pushPrizeNotification(
  lineUid: string,
  prizeName: string
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN 未設定，略過推播')
    return
  }

  const text =
    `🎉 恭喜您！HEIWEI 抽獎結果\n\n` +
    `您抽到了：${prizeName} 🎁\n\n` +
    `📦 兌獎方式：\n` +
    `我們會在 3 個工作天內，\n` +
    `用 LINE 聯繫您確認收件地址。\n\n` +
    `感謝您的評價，讓 HEIWEI 越來越好 💕`

  const res = await fetch(PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUid,
      messages: [{ type: 'text', text }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('LINE push 失敗:', res.status, body)
  }
}
