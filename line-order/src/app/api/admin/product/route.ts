import { NextRequest, NextResponse } from 'next/server';
import { addInventoryProduct } from '@/lib/sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await addInventoryProduct(body);
    return NextResponse.json(result);
  } catch (e) {
    console.error('上架失敗:', e);
    return NextResponse.json({ error: '寫入 Sheet 失敗，請重試' }, { status: 500 });
  }
}
