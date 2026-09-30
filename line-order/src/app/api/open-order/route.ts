import { NextRequest, NextResponse } from "next/server";
import { getSettings, hasOpenOrder } from "@/lib/sheets";

export const dynamic = "force-dynamic";

/**
 * 這位客人本檔是否已有未出貨的訂單。
 * 下單頁用它決定要不要先告訴客人「這筆免運」——實際金額仍以下單 API 為準。
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")?.trim();
    if (!userId) return NextResponse.json({ hasOpen: false });
    const settings = await getSettings();
    const hasOpen = await hasOpenOrder(userId, settings.title);
    return NextResponse.json({ hasOpen });
  } catch (e) {
    console.error("GET /api/open-order", e);
    return NextResponse.json({ hasOpen: false });
  }
}
