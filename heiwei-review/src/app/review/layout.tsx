'use client'
import { useEffect, useState } from 'react'

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (!liffId) {
      setError('LIFF ID 未設定')
      return
    }
    import('@line/liff').then(({ default: liff }) => {
      liff.init({ liffId }).then(() => setReady(true)).catch(() => {
        setError('LINE 初始化失敗，請透過 LINE 開啟此頁面')
      })
    })
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <p className="text-center text-red-500">{error}</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
