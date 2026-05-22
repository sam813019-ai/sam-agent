const BASE_URL = 'https://open.shopline.io/v1'

interface ShoplineOrder {
  order_number: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
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
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
          'User-Agent': 'HEIWEI-review',
        },
      }
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
