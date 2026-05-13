import { NextRequest, NextResponse } from 'next/server';
import { getOrderStats } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaign = searchParams.get('campaign') || undefined;
    const data = await getOrderStats(campaign);
    return NextResponse.json(data);
  } catch (e) {
    console.error('訂單統計失敗:', e);
    return NextResponse.json({ items: [], campaigns: [] }, { status: 200 });
  }
}
