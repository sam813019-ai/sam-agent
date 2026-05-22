import { NextRequest, NextResponse, after } from 'next/server'
import { getPrizes, markAsPlayed, appendPrizeRecord } from '@/lib/sheets'
import { selectPrize } from '@/lib/lottery'
import { pushPrizeNotification } from '@/lib/line-messaging'

export async function POST(req: NextRequest) {
  try {
    const { lineUid, orderNumber } = await req.json()

    if (!lineUid || !orderNumber) {
      return NextResponse.json({ error: '缺少必要資訊' }, { status: 400 })
    }

    const prizes = await getPrizes()
    if (prizes.length === 0) {
      return NextResponse.json({ error: '獎品設定未建立' }, { status: 500 })
    }

    const prize = selectPrize(prizes)

    await Promise.all([
      markAsPlayed(lineUid, orderNumber),
      appendPrizeRecord(lineUid, orderNumber, prize.name),
    ])

    // LINE 推播失敗不影響結果（after 確保函式不提早被 Vercel 終止）
    after(
      pushPrizeNotification(lineUid, prize.name).catch(e =>
        console.error('LINE 推播失敗:', e)
      )
    )

    return NextResponse.json({ prizeIndex: prize.index, prizeName: prize.name })
  } catch (err) {
    console.error('spin error:', err)
    return NextResponse.json({ error: '抽獎失敗，請稍後再試' }, { status: 500 })
  }
}
