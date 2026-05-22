'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifyPage() {
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const prefilled = sessionStorage.getItem('prefilledOrder')
    if (prefilled) setOrderNumber(prefilled)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const lineUid = sessionStorage.getItem('lineUid')
    if (!lineUid) {
      setError('無法取得 LINE 資訊，請重新開啟連結')
      setLoading(false)
      return
    }

    const res = await fetch('/api/review/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUid, orderNumber: orderNumber.trim() }),
    })
    const data = await res.json()

    if (data.valid) {
      sessionStorage.setItem('orderNumber', orderNumber.trim())
      router.push('/review/form')
    } else {
      setError(data.error || '驗證失敗，請稍後再試')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-pink-700 mb-2">HEIWEI 評價抽獎</h1>
          <p className="text-gray-500 text-sm">填寫評價，轉動幸運轉盤 🎡</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shopline 訂單編號
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="例：20260521175042296"
              className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-center text-lg tracking-wider"
              required
            />
            <p className="text-xs text-gray-400 mt-1 text-center">
              訂單編號可在購買確認信中找到
            </p>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !orderNumber.trim()}
            className="w-full py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200 text-white font-bold rounded-xl transition-colors"
          >
            {loading ? '驗證中...' : '驗證訂單'}
          </button>
        </form>
      </div>
    </div>
  )
}
