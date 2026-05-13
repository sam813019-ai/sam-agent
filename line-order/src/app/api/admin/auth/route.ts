import { NextRequest, NextResponse } from 'next/server';
import { computeToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: '後台未設定密碼' }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: '密碼錯誤' }, { status: 401 });
  }

  const token = await computeToken(adminPassword);
  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}
