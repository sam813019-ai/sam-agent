import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToDrive } from '@/lib/sheets';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '沒有收到檔案' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '圖片太大，最多 10MB' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '只接受圖片檔案' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadImageToDrive(buffer, file.name || 'upload.jpg', file.type);

    return NextResponse.json({ url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('圖片上傳失敗:', msg);
    return NextResponse.json({ error: `上傳失敗：${msg}` }, { status: 500 });
  }
}
