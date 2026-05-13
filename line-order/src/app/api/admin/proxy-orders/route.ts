import { NextRequest, NextResponse } from 'next/server';
import { getProxyOrders, updateProxyOrderStatus } from '@/lib/sheets';

export async function GET() {
  try {
    const orders = await getProxyOrders();
    return NextResponse.json(orders);
  } catch (e) {
    console.error('讀代購訂單失敗:', e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { rowNum, status } = await request.json();
    await updateProxyOrderStatus(rowNum, status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('更新代購狀態失敗:', e);
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}
