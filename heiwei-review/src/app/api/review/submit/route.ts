import { NextRequest, NextResponse, after } from 'next/server'
import { appendReview } from '@/lib/sheets'
import { getOrderDetails, submitProductReview } from '@/lib/shopline'

export async function POST(req: NextRequest) {
  try {
    const { lineUid, orderNumber, stars, comment } = await req.json()

    if (!lineUid || !orderNumber || !stars) {
      return NextResponse.json({ ok: false, error: '缺少必要欄位' }, { status: 400 })
    }

    if (stars < 1 || stars > 5) {
      return NextResponse.json({ ok: false, error: '星評須為 1–5' }, { status: 400 })
    }

    // 1. 儲存到 Google Sheets
    await appendReview(lineUid, orderNumber, stars, comment || '')

    // 2. 同步寫入 Shopline 評價（after 確保函式不提早被 Vercel 終止）
    after(
      getOrderDetails(orderNumber).then(async details => {
        if (!details || details.productIds.length === 0) {
          console.log('Shopline 訂單無商品，跳過評價同步:', orderNumber)
          return
        }
        await Promise.all(
          details.productIds.map(productId =>
            submitProductReview({
              productId,
              orderId: details.orderId,
              score: stars,
              comment: comment || '',
              userName: details.customerName,
            })
          )
        )
        console.log(`Shopline 評價已同步: ${details.productIds.length} 件商品`)
      }).catch(e => console.error('Shopline 評價同步失敗:', e))
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('submit error:', err)
    return NextResponse.json({ ok: false, error: '儲存失敗，請稍後再試' }, { status: 500 })
  }
}
