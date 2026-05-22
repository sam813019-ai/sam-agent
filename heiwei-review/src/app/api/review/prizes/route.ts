import { NextResponse } from 'next/server'
import { getPrizes } from '@/lib/sheets'

export async function GET() {
  try {
    const prizes = await getPrizes()
    return NextResponse.json({ prizes })
  } catch (err) {
    console.error('prizes error:', err)
    return NextResponse.json({ prizes: [] }, { status: 500 })
  }
}
