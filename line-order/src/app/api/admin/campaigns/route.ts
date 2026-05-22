import { NextResponse } from 'next/server';
import { getAvailableCampaigns } from '@/lib/sheets';

export async function GET() {
  try {
    const campaigns = await getAvailableCampaigns();
    return NextResponse.json({ campaigns });
  } catch (e) {
    console.error('取得連線清單失敗:', e);
    return NextResponse.json({ campaigns: [] }, { status: 200 });
  }
}
