'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const SEGMENT_COLORS = [
  '#FF6B9D', '#FFB347', '#87CEEB', '#98FB98',
  '#DDA0DD', '#F0E68C', '#20B2AA', '#FF8C69',
]
const SEGMENT_COUNT = 8

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5)
}

function drawWheel(
  ctx: CanvasRenderingContext2D,
  prizes: { name: string }[],
  angle: number,
  size: number
) {
  const cx = size / 2, cy = size / 2
  const radius = size / 2 - 10
  const segAngle = (Math.PI * 2) / SEGMENT_COUNT

  ctx.clearRect(0, 0, size, size)

  prizes.forEach((prize, i) => {
    const start = angle + i * segAngle
    const end = start + segAngle

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, start, end)
    ctx.closePath()
    ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(start + segAngle / 2)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${size / 22}px sans-serif`
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 4
    const text = prize.name.length > 6 ? prize.name.slice(0, 5) + '…' : prize.name
    ctx.fillText(text, radius - 10, 5)
    ctx.restore()
  })

  ctx.beginPath()
  ctx.arc(cx, cy, size / 10, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.strokeStyle = '#FFB6C1'
  ctx.lineWidth = 3
  ctx.stroke()
}

const DEFAULT_PRIZES = [
  '正裝乙件', '精華液組', '面膜×3', '小樣組',
  '85折券', '9折券', '生日禮', '積分×200',
].map(name => ({ name }))

export default function SpinPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const angleRef = useRef(-Math.PI / 2)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    drawWheel(ctx, DEFAULT_PRIZES, angleRef.current, canvas.width)
  }, [])

  async function handleSpin() {
    if (spinning || done) return
    setSpinning(true)
    setError('')

    const lineUid = sessionStorage.getItem('lineUid')
    const orderNumber = sessionStorage.getItem('orderNumber')
    if (!lineUid || !orderNumber) { router.replace('/review'); return }

    const res = await fetch('/api/review/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUid, orderNumber }),
    })
    const data = await res.json()

    if (!res.ok || data.error) {
      setError(data.error || '抽獎失敗，請稍後再試')
      setSpinning(false)
      return
    }

    const { prizeIndex, prizeName } = data
    sessionStorage.setItem('prizeName', prizeName)

    const segAngle = (Math.PI * 2) / SEGMENT_COUNT
    // 讓目標扇形的中心轉到頂部（指針位置 = -π/2）
    const targetCenter = prizeIndex * segAngle + segAngle / 2
    const finalAngle = angleRef.current + Math.PI * 2 * 6 - targetCenter - (angleRef.current % (Math.PI * 2))

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const size = canvas.width
    const startAngle = angleRef.current
    const startTime = performance.now()
    const duration = 4500

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutQuint(progress)
      const currentAngle = startAngle + (finalAngle - startAngle) * eased
      angleRef.current = currentAngle
      drawWheel(ctx, DEFAULT_PRIZES, currentAngle, size)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setSpinning(false)
        setDone(true)
        router.push(`/review/result?prize=${encodeURIComponent(prizeName)}`)
      }
    }

    requestAnimationFrame(animate)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-2xl font-bold text-pink-700 mb-6">轉動幸運轉盤！</h1>

      <div className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-10 text-3xl drop-shadow">
          ▼
        </div>
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="rounded-full shadow-xl"
        />
      </div>

      {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

      <button
        onClick={handleSpin}
        disabled={spinning || done}
        className="mt-8 px-10 py-4 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200 text-white font-bold text-lg rounded-full shadow-lg transition-all active:scale-95"
      >
        {spinning ? '轉動中...' : done ? '已抽獎' : 'GO 🎯'}
      </button>
    </div>
  )
}
