import { NextRequest, NextResponse } from 'next/server'
import { verifyOrder } from '@/lib/shopline'
import { checkAlreadyPlayed } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  try {
    const { lineUid, orderNumber } = await req.json()

    if (!lineUid || !orderNumber) {
      return NextResponse.json({ valid: false, error: '缺少必要資訊' }, { status: 400 })
    }

    const shoplineResult = await verifyOrder(orderNumber)
    if (!shoplineResult.valid) {
      return NextResponse.json({ valid: false, error: shoplineResult.error })
    }

    const alreadyPlayed = await checkAlreadyPlayed(lineUid, orderNumber)
    if (alreadyPlayed) {
      return NextResponse.json({ valid: false, error: '這筆訂單已經參加過抽獎囉！' })
    }

    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error('verify error:', err)
    return NextResponse.json({ valid: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }
}
