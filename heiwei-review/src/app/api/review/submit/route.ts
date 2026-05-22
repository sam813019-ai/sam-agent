import { NextRequest, NextResponse } from 'next/server'
import { appendReview } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  try {
    const { lineUid, orderNumber, stars, comment } = await req.json()

    if (!lineUid || !orderNumber || !stars) {
      return NextResponse.json({ ok: false, error: '缺少必要欄位' }, { status: 400 })
    }

    if (stars < 1 || stars > 5) {
      return NextResponse.json({ ok: false, error: '星評須為 1–5' }, { status: 400 })
    }

    await appendReview(lineUid, orderNumber, stars, comment || '')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('submit error:', err)
    return NextResponse.json({ ok: false, error: '儲存失敗，請稍後再試' }, { status: 500 })
  }
}
