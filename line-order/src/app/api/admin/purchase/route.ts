import { NextRequest, NextResponse } from 'next/server';
import { addPurchaseRecord } from '@/lib/sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await addPurchaseRecord(body);
    return NextResponse.json(result);
  } catch (e) {
    console.error('進貨紀錄失敗:', e);
    return NextResponse.json({ error: '寫入失敗，請重試' }, { status: 500 });
  }
}
