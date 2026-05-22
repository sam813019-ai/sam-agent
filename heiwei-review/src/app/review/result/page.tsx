'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ResultContent() {
  const searchParams = useSearchParams()
  const prizeName = searchParams.get('prize') ||
    (typeof window !== 'undefined' ? sessionStorage.getItem('prizeName') : null) ||
    '好禮'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="text-6xl mb-6 animate-bounce">🎉</div>

      <h1 className="text-3xl font-bold text-pink-700 mb-4">恭喜您！</h1>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 w-full max-w-sm">
        <p className="text-gray-500 text-sm mb-2">您抽到了</p>
        <p className="text-2xl font-bold text-pink-600">{prizeName}</p>
      </div>

      <div className="bg-pink-50 rounded-xl p-4 w-full max-w-sm text-left">
        <p className="text-sm font-medium text-pink-700 mb-2">📦 兌獎方式</p>
        <p className="text-sm text-gray-600">
          我們會在 3 個工作天內，透過 LINE 聯繫您確認收件地址。請記得保持 LINE 開啟接收通知！
        </p>
      </div>

      <p className="text-gray-400 text-xs mt-8">
        感謝您的評價，讓 HEIWEI 越來越好 💕
      </p>
    </div>
  )
}

export default function ResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  )
}
