'use client'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
    </div>
  )
}

function ReviewEntry() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    import('@line/liff').then(({ default: liff }) => {
      if (!liff.isLoggedIn()) {
        liff.login()
        return
      }
      liff.getProfile().then(p => {
        sessionStorage.setItem('lineUid', p.userId)
        const order = searchParams.get('order')
        if (order) sessionStorage.setItem('prefilledOrder', order)
        router.replace('/review/verify')
      })
    })
  }, [router, searchParams])

  return <Spinner />
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ReviewEntry />
    </Suspense>
  )
}
