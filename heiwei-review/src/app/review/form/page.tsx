'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STAR_LABELS = ['', '非常不滿意', '不滿意', '普通', '滿意', '非常滿意']

export default function FormPage() {
  const router = useRouter()
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (stars === 0) { setError('請選擇星評'); return }
    setError('')
    setLoading(true)

    const lineUid = sessionStorage.getItem('lineUid')
    const orderNumber = sessionStorage.getItem('orderNumber')

    if (!lineUid || !orderNumber) {
      router.replace('/review')
      return
    }

    const res = await fetch('/api/review/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUid, orderNumber, stars, comment }),
    })
    const data = await res.json()

    if (data.ok) {
      router.push('/review/spin')
    } else {
      setError(data.error || '提交失敗，請稍後再試')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-pink-700 mb-2">填寫評價</h1>
          <p className="text-gray-500 text-sm">填完就能轉轉盤抽好禮！</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              您對這次購物的整體評價
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  className={`text-4xl transition-transform hover:scale-110 ${n <= stars ? 'opacity-100' : 'opacity-30'}`}
                >
                  ⭐
                </button>
              ))}
            </div>
            {stars > 0 && (
              <p className="text-center text-sm text-pink-600 mt-2">{STAR_LABELS[stars]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分享您的心得（選填）
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="使用感受、推薦的朋友類型…"
              rows={4}
              className="w-full px-4 py-3 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || stars === 0}
            className="w-full py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200 text-white font-bold rounded-xl transition-colors"
          >
            {loading ? '提交中...' : '提交評價，開始抽獎！🎡'}
          </button>
        </form>
      </div>
    </div>
  )
}
