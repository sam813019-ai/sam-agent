import { NextResponse } from 'next/server';
import { getInventoryRaw } from '@/lib/sheets';

export async function GET() {
  try {
    const items = await getInventoryRaw();
    return NextResponse.json(items);
  } catch (e) {
    console.error('讀庫存表失敗:', e);
    return NextResponse.json([], { status: 200 });
  }
}
