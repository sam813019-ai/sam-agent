import { NextResponse } from "next/server";
import { migratePaymentColumns } from "@/lib/sheets";

export const dynamic = "force-dynamic";

/** 一次性：把訂單表 J~M 的標題列補上。跑過一次就不用再跑 */
export async function POST() {
  try {
    await migratePaymentColumns();
    return NextResponse.json({
      ok: true,
      message: "訂單表 J~M 標題已寫入：付款狀態 / 匯款後五碼 / 匯款截圖 / 回報時間",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
