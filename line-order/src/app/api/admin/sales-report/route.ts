import { NextRequest, NextResponse } from 'next/server';
import { getSalesReport } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;
    const data = await getSalesReport(start, end);
    return NextResponse.json(data);
  } catch (e) {
    console.error('銷售報表失敗:', e);
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 });
  }
}
