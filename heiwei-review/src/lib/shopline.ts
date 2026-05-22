const BASE_URL = 'https://open.shopline.io/v1'

function getHeaders() {
  return {
    accept: 'application/json',
    authorization: `Bearer ${process.env.SHOPLINE_ACCESS_TOKEN}`,
    'User-Agent': 'HEIWEI-review',
  }
}

interface ShoplineOrder {
  id: string
  order_number: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  customer_name: string
  subtotal_items: Array<{
    item_type: string
    item_id: string
  }>
}

interface VerifyResult {
  valid: boolean
  error?: string
}

export async function verifyOrder(orderNumber: string): Promise<VerifyResult> {
  const token = process.env.SHOPLINE_ACCESS_TOKEN
  if (!token) return { valid: false, error: '系統設定錯誤' }

  try {
    const res = await fetch(
      `${BASE_URL}/orders/search?order_number=${encodeURIComponent(orderNumber)}`,
      { headers: getHeaders() }
    )

    if (!res.ok) return { valid: false, error: '系統暫時無法驗證，請稍後再試' }

    const data = await res.json()
    const orders: ShoplineOrder[] = data.items || []
    const order = orders.find(o => o.order_number === orderNumber)

    if (!order) return { valid: false, error: '找不到訂單，請確認訂單編號是否正確' }

    if (order.status === 'confirmed' || order.status === 'completed') {
      return { valid: true }
    }
    if (order.status === 'cancelled') {
      return { valid: false, error: '此訂單已取消，無法參與抽獎' }
    }
    return { valid: false, error: '訂單尚未付款完成，請確認付款狀態' }
  } catch {
    return { valid: false, error: '網路錯誤，請稍後再試' }
  }
}

interface OrderDetails {
  orderId: string
  customerName: string
  productIds: string[]
}

export async function getOrderDetails(orderNumber: string): Promise<OrderDetails | null> {
  const token = process.env.SHOPLINE_ACCESS_TOKEN
  if (!token) return null

  try {
    const res = await fetch(
      `${BASE_URL}/orders/search?order_number=${encodeURIComponent(orderNumber)}`,
      { headers: getHeaders() }
    )
    if (!res.ok) return null

    const data = await res.json()
    const orders: ShoplineOrder[] = data.items || []
    const order = orders.find(o => o.order_number === orderNumber)
    if (!order) return null

    const productIds = (order.subtotal_items || [])
      .filter(item => item.item_type === 'Product' && item.item_id)
      .map(item => item.item_id)

    return {
      orderId: order.id,
      customerName: order.customer_name || '匿名',
      productIds,
    }
  } catch {
    return null
  }
}

export async function submitProductReview(params: {
  productId: string
  orderId: string
  score: number
  comment: string
  userName: string
}): Promise<void> {
  const token = process.env.SHOPLINE_ACCESS_TOKEN
  if (!token) return

  const body = new URLSearchParams({
    product_id: params.productId,
    order_id: params.orderId,
    score: String(params.score),
    comment: params.comment || '無文字評價',
    user_name: params.userName,
    status: 'active',
  })

  const res = await fetch(`${BASE_URL}/product_review_comments`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`Shopline 評價寫入失敗 (product: ${params.productId}):`, res.status, text)
  }
}
