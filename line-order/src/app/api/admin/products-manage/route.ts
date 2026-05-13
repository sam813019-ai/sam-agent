import { NextRequest, NextResponse } from 'next/server';
import { getManagedProducts, setProductsActive } from '@/lib/sheets';

export async function GET() {
  try {
    const products = await getManagedProducts();
    return NextResponse.json(products);
  } catch (e) {
    console.error('讀商品失敗:', e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { rowNums, active } = await request.json();
    await setProductsActive(rowNums, active);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('批次上下架失敗:', e);
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}
