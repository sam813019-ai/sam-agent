import { NextRequest, NextResponse } from 'next/server';
import { addAdminProxyOrder } from '@/lib/sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await addAdminProxyOrder(body);
    return NextResponse.json(result);
  } catch (e) {
    console.error('代購下單失敗:', e);
    return NextResponse.json({ error: '寫入 Sheet 失敗，請重試' }, { status: 500 });
  }
}
